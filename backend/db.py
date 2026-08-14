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
    """Initializes the SQLite database tables, indexes, and applies column migrations."""
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
            cleaned_image_filename TEXT,
            cleaned_image_path TEXT,
            image_metadata TEXT,
            ai_insights TEXT,
            handwriting_style TEXT DEFAULT 'caveat',
            tags TEXT,
            source_image_filename TEXT,
            segment_index INTEGER DEFAULT 0,
            is_favorite INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Check for existing table and migrate new columns if necessary
    cursor.execute("PRAGMA table_info(notes);")
    columns = [row["name"] for row in cursor.fetchall()]

    new_columns = {
        "cleaned_image_filename": "TEXT",
        "cleaned_image_path": "TEXT",
        "ai_insights": "TEXT",
        "handwriting_style": "TEXT DEFAULT 'caveat'",
        "source_image_filename": "TEXT",
        "segment_index": "INTEGER DEFAULT 0"
    }

    for col, col_type in new_columns.items():
        if col not in columns:
            try:
                cursor.execute(f"ALTER TABLE notes ADD COLUMN {col} {col_type};")
            except Exception:
                pass

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_is_favorite ON notes(is_favorite);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_source_img ON notes(source_image_filename);")

    conn.commit()
    conn.close()

def parse_note_row(row):
    """Helper to convert sqlite3.Row to a clean Python dictionary with parsed JSON fields."""
    if not row:
        return None
    d = dict(row)

    # Parse image_metadata JSON
    if d.get("image_metadata"):
        try:
            d["image_metadata"] = json.loads(d["image_metadata"])
        except Exception:
            pass
    else:
        d["image_metadata"] = None

    # Parse ai_insights JSON
    if d.get("ai_insights"):
        try:
            d["ai_insights"] = json.loads(d["ai_insights"])
        except Exception:
            pass
    else:
        d["ai_insights"] = None

    # Parse tags JSON or string
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
    d["handwriting_style"] = d.get("handwriting_style") or "caveat"
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
                cleaned_image_filename=None, cleaned_image_path=None,
                image_metadata=None, ai_insights=None, handwriting_style="caveat",
                source_image_filename=None, segment_index=0,
                tags=None, is_favorite=0, db_path=None):
    """Inserts a new note record into SQLite."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    metadata_str = json.dumps(image_metadata) if isinstance(image_metadata, (dict, list)) else (image_metadata or None)
    ai_insights_str = json.dumps(ai_insights) if isinstance(ai_insights, (dict, list)) else (ai_insights or None)
    tags_str = json.dumps(tags) if isinstance(tags, list) else (json.dumps([t.strip() for t in tags.split(",") if t.strip()]) if isinstance(tags, str) else json.dumps([]))

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        INSERT INTO notes (
            title, content, extracted_text, image_filename, image_path,
            cleaned_image_filename, cleaned_image_path,
            image_metadata, ai_insights, handwriting_style, source_image_filename, segment_index,
            tags, is_favorite, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        title,
        content,
        extracted_text,
        image_filename,
        image_path,
        cleaned_image_filename,
        cleaned_image_path,
        metadata_str,
        ai_insights_str,
        handwriting_style or "caveat",
        source_image_filename or image_filename,
        segment_index or 0,
        tags_str,
        1 if is_favorite else 0,
        now,
        now
    ))

    note_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return get_note_by_id(note_id, db_path)

def batch_create_notes(notes_list, db_path=None):
    """Inserts multiple notes in a single atomic transaction and returns all created notes."""
    if not notes_list:
        return []

    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    created_ids = []

    for item in notes_list:
        title = (item.get("title") or "Extracted Note").strip()
        content = (item.get("content") or "").strip()
        extracted_text = item.get("extracted_text")
        image_filename = item.get("image_filename")
        image_path = item.get("image_path")
        cleaned_image_filename = item.get("cleaned_image_filename")
        cleaned_image_path = item.get("cleaned_image_path")
        image_metadata = item.get("image_metadata")
        ai_insights = item.get("ai_insights")
        handwriting_style = item.get("handwriting_style") or "caveat"
        source_img = item.get("source_image_filename") or image_filename
        segment_idx = item.get("segment_index", 0)
        tags = item.get("tags") or []
        is_fav = 1 if item.get("is_favorite") else 0

        metadata_str = json.dumps(image_metadata) if isinstance(image_metadata, (dict, list)) else (image_metadata or None)
        ai_insights_str = json.dumps(ai_insights) if isinstance(ai_insights, (dict, list)) else (ai_insights or None)
        tags_str = json.dumps(tags) if isinstance(tags, list) else json.dumps([])

        cursor.execute("""
            INSERT INTO notes (
                title, content, extracted_text, image_filename, image_path,
                cleaned_image_filename, cleaned_image_path,
                image_metadata, ai_insights, handwriting_style, source_image_filename, segment_index,
                tags, is_favorite, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            title, content, extracted_text, image_filename, image_path,
            cleaned_image_filename, cleaned_image_path,
            metadata_str, ai_insights_str, handwriting_style, source_img, segment_idx,
            tags_str, is_fav, now, now
        ))
        created_ids.append(cursor.lastrowid)

    conn.commit()
    conn.close()

    return [get_note_by_id(nid, db_path) for nid in created_ids]

def update_note(note_id, title=None, content=None, extracted_text=None, 
                cleaned_image_filename=None, cleaned_image_path=None,
                ai_insights=None, handwriting_style=None,
                tags=None, is_favorite=None, db_path=None):
    """Updates an existing note in SQLite."""
    existing = get_note_by_id(note_id, db_path)
    if not existing:
        return None

    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    new_title = title if title is not None else existing["title"]
    new_content = content if content is not None else existing["content"]
    new_extracted = extracted_text if extracted_text is not None else existing["extracted_text"]
    new_cleaned_fn = cleaned_image_filename if cleaned_image_filename is not None else existing.get("cleaned_image_filename")
    new_cleaned_path = cleaned_image_path if cleaned_image_path is not None else existing.get("cleaned_image_path")
    new_style = handwriting_style if handwriting_style is not None else existing.get("handwriting_style", "caveat")

    if ai_insights is not None:
        new_ai_insights = json.dumps(ai_insights) if isinstance(ai_insights, (dict, list)) else ai_insights
    else:
        new_ai_insights = json.dumps(existing.get("ai_insights")) if existing.get("ai_insights") else None
    
    if tags is not None:
        new_tags = json.dumps(tags) if isinstance(tags, list) else json.dumps([t.strip() for t in str(tags).split(",") if t.strip()])
    else:
        new_tags = json.dumps(existing["tags"])

    new_fav = (1 if is_favorite else 0) if is_favorite is not None else (1 if existing["is_favorite"] else 0)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        UPDATE notes 
        SET title = ?, content = ?, extracted_text = ?, 
            cleaned_image_filename = ?, cleaned_image_path = ?,
            ai_insights = ?, handwriting_style = ?, tags = ?, is_favorite = ?, updated_at = ?
        WHERE id = ?
    """, (new_title, new_content, new_extracted, new_cleaned_fn, new_cleaned_path, new_ai_insights, new_style, new_tags, new_fav, now, note_id))

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
