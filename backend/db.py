import os
import sqlite3
import json
from datetime import datetime, timezone

def get_default_db_path():
    return os.environ.get(
        "DATABASE_PATH",
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "notes.db")
    )

def get_db_connection(db_path=None):
    """Establishes and returns a SQLite database connection with row factory."""
    if not db_path:
        try:
            from flask import current_app
            db_path = current_app.config.get("DATABASE_PATH", get_default_db_path())
        except Exception:
            db_path = get_default_db_path()

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db(db_path=None):
    """Initializes the SQLite database tables and indexes."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            extracted_text TEXT,
            image_filename TEXT,
            image_path TEXT,
            image_metadata TEXT,
            tags TEXT,
            is_favorite INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_is_favorite ON notes(is_favorite);")

    conn.commit()
    conn.close()

def parse_note_row(row):
    """Helper to convert sqlite3.Row to a clean Python dictionary with parsed JSON fields."""
    if not row:
        return None
    d = dict(row)
    if d.get("image_metadata"):
        try:
            d["image_metadata"] = json.loads(d["image_metadata"])
        except Exception:
            pass
    else:
        d["image_metadata"] = None

    if d.get("tags"):
        try:
            parsed_tags = json.loads(d["tags"])
            if isinstance(parsed_tags, list):
                d["tags"] = parsed_tags
            else:
                d["tags"] = [str(parsed_tags)]
        except Exception:
            d["tags"] = [t.strip() for t in str(d["tags"]).split(",") if t.strip()]
    else:
        d["tags"] = []

    d["is_favorite"] = bool(d.get("is_favorite", 0))
    return d

def get_all_notes(search=None, tag=None, favorite_only=False, sort_by="created_at", order="desc", db_path=None):
    """Fetches notes with optional text search, tag filter, favorite filter, and custom sorting."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    query = "SELECT * FROM notes WHERE 1=1"
    params = []

    if search:
        query += " AND (title LIKE ? OR content LIKE ? OR extracted_text LIKE ?)"
        search_param = f"%{search}%"
        params.extend([search_param, search_param, search_param])

    if tag:
        query += " AND tags LIKE ?"
        params.append(f"%{tag}%")

    if favorite_only:
        query += " AND is_favorite = 1"

    valid_sort_fields = {"created_at": "created_at", "updated_at": "updated_at", "title": "title"}
    sort_column = valid_sort_fields.get(sort_by, "created_at")
    sort_direction = "ASC" if str(order).lower() == "asc" else "DESC"

    query += f" ORDER BY {sort_column} {sort_direction}"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [parse_note_row(r) for r in rows]

def get_note_by_id(note_id, db_path=None):
    """Retrieves a single note by primary key ID."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM notes WHERE id = ?", (note_id,))
    row = cursor.fetchone()
    conn.close()
    return parse_note_row(row)

def create_note(title, content, extracted_text=None, image_filename=None, image_path=None, 
                image_metadata=None, tags=None, is_favorite=0, db_path=None):
    """Inserts a new note record into SQLite."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    metadata_str = json.dumps(image_metadata) if isinstance(image_metadata, (dict, list)) else (image_metadata or None)
    tags_str = json.dumps(tags) if isinstance(tags, list) else (json.dumps([t.strip() for t in tags.split(",") if t.strip()]) if isinstance(tags, str) else json.dumps([]))

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        INSERT INTO notes (
            title, content, extracted_text, image_filename, image_path, 
            image_metadata, tags, is_favorite, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        title,
        content,
        extracted_text,
        image_filename,
        image_path,
        metadata_str,
        tags_str,
        1 if is_favorite else 0,
        now,
        now
    ))

    note_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return get_note_by_id(note_id, db_path)

def update_note(note_id, title=None, content=None, extracted_text=None, tags=None, is_favorite=None, db_path=None):
    """Updates an existing note in SQLite."""
    existing = get_note_by_id(note_id, db_path)
    if not existing:
        return None

    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    new_title = title if title is not None else existing["title"]
    new_content = content if content is not None else existing["content"]
    new_extracted = extracted_text if extracted_text is not None else existing["extracted_text"]
    
    if tags is not None:
        new_tags = json.dumps(tags) if isinstance(tags, list) else json.dumps([t.strip() for t in str(tags).split(",") if t.strip()])
    else:
        new_tags = json.dumps(existing["tags"])

    new_fav = (1 if is_favorite else 0) if is_favorite is not None else (1 if existing["is_favorite"] else 0)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        UPDATE notes 
        SET title = ?, content = ?, extracted_text = ?, tags = ?, is_favorite = ?, updated_at = ?
        WHERE id = ?
    """, (new_title, new_content, new_extracted, new_tags, new_fav, now, note_id))

    conn.commit()
    conn.close()

    return get_note_by_id(note_id, db_path)

def delete_note(note_id, db_path=None):
    """Deletes a note by ID and returns the deleted note's data for cleanup."""
    existing = get_note_by_id(note_id, db_path)
    if not existing:
        return None

    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()

    return existing

def get_stats(db_path=None):
    """Calculates summary statistics across notes."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM notes")
    total_notes = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM notes WHERE image_filename IS NOT NULL AND image_filename != ''")
    notes_with_images = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM notes WHERE is_favorite = 1")
    favorite_notes = cursor.fetchone()[0]

    cursor.execute("SELECT tags FROM notes")
    all_tags_rows = cursor.fetchall()
    tag_set = set()
    for r in all_tags_rows:
        if r[0]:
            try:
                tags = json.loads(r[0])
                if isinstance(tags, list):
                    for t in tags:
                        if t.strip():
                            tag_set.add(t.strip().lower())
            except Exception:
                pass

    conn.close()

    return {
        "total_notes": total_notes,
        "notes_with_images": notes_with_images,
        "favorite_notes": favorite_notes,
        "unique_tags_count": len(tag_set),
        "tags": sorted(list(tag_set))
    }
