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

    # 1. Notes Table (Single Notes)
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

    # 2. Notebooks Table (Multi-Page Notebooks)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notebooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            subject_tag TEXT DEFAULT 'General',
            cover_color TEXT DEFAULT '#6366f1',
            is_favorite INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # 3. Notebook Pages Table (Individual Pages within a Notebook)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notebook_pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            notebook_id INTEGER NOT NULL,
            page_number INTEGER NOT NULL DEFAULT 1,
            title TEXT,
            content TEXT NOT NULL,
            extracted_text TEXT,
            image_filename TEXT,
            image_path TEXT,
            image_metadata TEXT,
            ai_summary TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
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

    # Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_is_favorite ON notes(is_favorite);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_source_img ON notes(source_image_filename);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_notebooks_created ON notebooks(created_at DESC);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pages_notebook_order ON notebook_pages(notebook_id, page_number ASC);")

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

    if d.get("ai_insights"):
        try:
            d["ai_insights"] = json.loads(d["ai_insights"])
        except Exception:
            pass
    else:
        d["ai_insights"] = None

    if d.get("tags"):
        try:
            parsed = json.loads(d["tags"])
            d["tags"] = parsed if isinstance(parsed, list) else [d["tags"]]
        except Exception:
            d["tags"] = [t.strip() for t in d["tags"].split(",") if t.strip()]
    else:
        d["tags"] = []

    d["is_favorite"] = bool(d.get("is_favorite", 0))
    return d

def parse_notebook_page_row(row):
    """Helper to convert notebook_page Row into clean dict."""
    if not row:
        return None
    d = dict(row)
    if d.get("image_metadata"):
        try:
            d["image_metadata"] = json.loads(d["image_metadata"])
        except Exception:
            pass
    if d.get("ai_summary"):
        try:
            d["ai_summary"] = json.loads(d["ai_summary"])
        except Exception:
            pass
    return d

def parse_notebook_row(row, include_pages=False, db_path=None):
    """Helper to parse a notebook with optional ordered pages."""
    if not row:
        return None
    d = dict(row)
    d["is_favorite"] = bool(d.get("is_favorite", 0))
    
    if include_pages:
        conn = get_db_connection(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM notebook_pages WHERE notebook_id = ? ORDER BY page_number ASC, id ASC",
            (d["id"],)
        )
        page_rows = cursor.fetchall()
        d["pages"] = [parse_notebook_page_row(p) for p in page_rows]
        d["page_count"] = len(d["pages"])
        conn.close()
    return d

# ==============================================================================
# SINGLE NOTES CRUD
# ==============================================================================

def get_all_notes(search=None, tag=None, favorite_only=False, sort_by="created_at", order="desc", db_path=None):
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

    valid_sort_fields = {
        "created_at": "created_at",
        "updated_at": "updated_at",
        "title": "title",
        "id": "id"
    }
    sort_column = valid_sort_fields.get(sort_by, "created_at")
    sort_direction = "ASC" if str(order).lower() == "asc" else "DESC"

    query += f" ORDER BY {sort_column} {sort_direction}"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    notes = [parse_note_row(row) for row in rows]
    conn.close()
    return notes

def get_note_by_id(note_id, db_path=None):
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM notes WHERE id = ?", (note_id,))
    row = cursor.fetchone()
    conn.close()
    return parse_note_row(row) if row else None

def create_note(title, content, extracted_text=None, image_filename=None, image_path=None,
                cleaned_image_filename=None, cleaned_image_path=None, image_metadata=None,
                ai_insights=None, handwriting_style='caveat', tags=None, source_image_filename=None,
                segment_index=0, is_favorite=False, db_path=None):
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    meta_json = json.dumps(image_metadata) if image_metadata and isinstance(image_metadata, (dict, list)) else image_metadata
    insights_json = json.dumps(ai_insights) if ai_insights and isinstance(ai_insights, (dict, list)) else ai_insights
    tags_json = json.dumps(tags) if tags and isinstance(tags, list) else (tags or "[]")
    fav_int = 1 if is_favorite else 0

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        INSERT INTO notes (
            title, content, extracted_text, image_filename, image_path,
            cleaned_image_filename, cleaned_image_path, image_metadata,
            ai_insights, handwriting_style, tags, source_image_filename,
            segment_index, is_favorite, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        title, content, extracted_text, image_filename, image_path,
        cleaned_image_filename, cleaned_image_path, meta_json,
        insights_json, handwriting_style, tags_json, source_image_filename,
        segment_index, fav_int, now, now
    ))

    note_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_note_by_id(note_id, db_path)

def batch_create_notes(notes_list, db_path=None):
    if not notes_list:
        return []

    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    created_ids = []
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    for item in notes_list:
        title = item.get("title", "Untitled Note")
        content = item.get("content", "")
        extracted_text = item.get("extracted_text")
        image_filename = item.get("image_filename")
        image_path = item.get("image_path")
        cleaned_image_filename = item.get("cleaned_image_filename")
        cleaned_image_path = item.get("cleaned_image_path")
        image_metadata = item.get("image_metadata")
        ai_insights = item.get("ai_insights")
        handwriting_style = item.get("handwriting_style", "caveat")
        tags = item.get("tags", [])
        source_image_filename = item.get("source_image_filename") or image_filename
        segment_index = item.get("segment_index", 0)
        is_favorite = 1 if item.get("is_favorite", False) else 0

        meta_json = json.dumps(image_metadata) if image_metadata and isinstance(image_metadata, (dict, list)) else image_metadata
        insights_json = json.dumps(ai_insights) if ai_insights and isinstance(ai_insights, (dict, list)) else ai_insights
        tags_json = json.dumps(tags) if tags and isinstance(tags, list) else (tags or "[]")

        cursor.execute("""
            INSERT INTO notes (
                title, content, extracted_text, image_filename, image_path,
                cleaned_image_filename, cleaned_image_path, image_metadata,
                ai_insights, handwriting_style, tags, source_image_filename,
                segment_index, is_favorite, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            title, content, extracted_text, image_filename, image_path,
            cleaned_image_filename, cleaned_image_path, meta_json,
            insights_json, handwriting_style, tags_json, source_image_filename,
            segment_index, is_favorite, now, now
        ))
        created_ids.append(cursor.lastrowid)

    conn.commit()
    conn.close()

    return [get_note_by_id(nid, db_path) for nid in created_ids]

def update_note(note_id, title=None, content=None, handwriting_style=None, tags=None,
                is_favorite=None, ai_insights=None, db_path=None):
    existing = get_note_by_id(note_id, db_path)
    if not existing:
        return None

    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    updates = []
    params = []

    if title is not None:
        updates.append("title = ?")
        params.append(title)

    if content is not None:
        updates.append("content = ?")
        params.append(content)

    if handwriting_style is not None:
        updates.append("handwriting_style = ?")
        params.append(handwriting_style)

    if tags is not None:
        updates.append("tags = ?")
        params.append(json.dumps(tags) if isinstance(tags, list) else tags)

    if is_favorite is not None:
        updates.append("is_favorite = ?")
        params.append(1 if is_favorite else 0)

    if ai_insights is not None:
        updates.append("ai_insights = ?")
        params.append(json.dumps(ai_insights) if isinstance(ai_insights, (dict, list)) else ai_insights)

    if not updates:
        conn.close()
        return existing

    updates.append("updated_at = ?")
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    params.append(now)

    params.append(note_id)
    query = f"UPDATE notes SET {', '.join(updates)} WHERE id = ?"

    cursor.execute(query, params)
    conn.commit()
    conn.close()

    return get_note_by_id(note_id, db_path)

def delete_note(note_id, db_path=None):
    note = get_note_by_id(note_id, db_path)
    if not note:
        return None

    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()
    return note

# ==============================================================================
# MULTI-PAGE NOTEBOOKS CRUD
# ==============================================================================

def create_notebook(title, description="", subject_tag="General", cover_color="#6366f1", is_favorite=False, db_path=None):
    """Creates a new Notebook container in SQLite."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    fav_int = 1 if is_favorite else 0

    cursor.execute("""
        INSERT INTO notebooks (
            title, description, subject_tag, cover_color, is_favorite, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (title, description, subject_tag, cover_color, fav_int, now, now))

    notebook_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_notebook_by_id(notebook_id, include_pages=True, db_path=db_path)

def get_all_notebooks(search=None, subject=None, db_path=None):
    """Fetches all notebooks with their page counts and preview info."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    query = """
        SELECT n.*, COUNT(p.id) as page_count, MIN(p.image_path) as cover_image
        FROM notebooks n
        LEFT JOIN notebook_pages p ON n.id = p.notebook_id
        WHERE 1=1
    """
    params = []

    if search:
        query += " AND (n.title LIKE ? OR n.description LIKE ? OR n.subject_tag LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s])

    if subject:
        query += " AND n.subject_tag = ?"
        params.append(subject)

    query += " GROUP BY n.id ORDER BY n.updated_at DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    notebooks = []
    for r in rows:
        nb = dict(r)
        nb["is_favorite"] = bool(nb.get("is_favorite", 0))
        notebooks.append(nb)

    conn.close()
    return notebooks

def get_notebook_by_id(notebook_id, include_pages=True, db_path=None):
    """Fetches a single notebook by ID with all its ordered pages."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM notebooks WHERE id = ?", (notebook_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None
    return parse_notebook_row(row, include_pages=include_pages, db_path=db_path)

def update_notebook(notebook_id, title=None, description=None, subject_tag=None, cover_color=None, is_favorite=None, db_path=None):
    """Updates notebook title, description, subject, or cover color."""
    existing = get_notebook_by_id(notebook_id, include_pages=False, db_path=db_path)
    if not existing:
        return None

    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    updates = []
    params = []

    if title is not None:
        updates.append("title = ?")
        params.append(title.strip())
    if description is not None:
        updates.append("description = ?")
        params.append(description.strip())
    if subject_tag is not None:
        updates.append("subject_tag = ?")
        params.append(subject_tag.strip())
    if cover_color is not None:
        updates.append("cover_color = ?")
        params.append(cover_color)
    if is_favorite is not None:
        updates.append("is_favorite = ?")
        params.append(1 if is_favorite else 0)

    if updates:
        updates.append("updated_at = ?")
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        params.append(now)
        params.append(notebook_id)
        cursor.execute(f"UPDATE notebooks SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()

    conn.close()
    return get_notebook_by_id(notebook_id, include_pages=True, db_path=db_path)

def delete_notebook(notebook_id, db_path=None):
    """Deletes a notebook and cascades to all its pages."""
    nb = get_notebook_by_id(notebook_id, include_pages=True, db_path=db_path)
    if not nb:
        return None

    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notebook_pages WHERE notebook_id = ?", (notebook_id,))
    cursor.execute("DELETE FROM notebooks WHERE id = ?", (notebook_id,))
    conn.commit()
    conn.close()
    return nb

# ==============================================================================
# NOTEBOOK PAGES CRUD
# ==============================================================================

def add_notebook_page(notebook_id, content, title=None, extracted_text=None, image_filename=None,
                      image_path=None, image_metadata=None, ai_summary=None, page_number=None, db_path=None):
    """Appends a new page to a notebook."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    if page_number is None:
        cursor.execute("SELECT COALESCE(MAX(page_number), 0) + 1 FROM notebook_pages WHERE notebook_id = ?", (notebook_id,))
        page_number = cursor.fetchone()[0]

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    meta_json = json.dumps(image_metadata) if image_metadata and isinstance(image_metadata, (dict, list)) else image_metadata
    summary_json = json.dumps(ai_summary) if ai_summary and isinstance(ai_summary, (dict, list)) else ai_summary

    cursor.execute("""
        INSERT INTO notebook_pages (
            notebook_id, page_number, title, content, extracted_text,
            image_filename, image_path, image_metadata, ai_summary,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        notebook_id, page_number, title or f"Page {page_number}",
        content, extracted_text or content, image_filename, image_path,
        meta_json, summary_json, now, now
    ))

    page_id = cursor.lastrowid

    # Update notebook's updated_at timestamp
    cursor.execute("UPDATE notebooks SET updated_at = ? WHERE id = ?", (now, notebook_id))
    conn.commit()
    conn.close()

    return get_notebook_page_by_id(page_id, db_path)

def get_notebook_page_by_id(page_id, db_path=None):
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM notebook_pages WHERE id = ?", (page_id,))
    row = cursor.fetchone()
    conn.close()
    return parse_notebook_page_row(row) if row else None

def update_notebook_page(page_id, title=None, content=None, page_number=None, db_path=None):
    existing = get_notebook_page_by_id(page_id, db_path)
    if not existing:
        return None

    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    updates = []
    params = []

    if title is not None:
        updates.append("title = ?")
        params.append(title.strip())
    if content is not None:
        updates.append("content = ?")
        params.append(content)
    if page_number is not None:
        updates.append("page_number = ?")
        params.append(page_number)

    if updates:
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        updates.append("updated_at = ?")
        params.append(now)
        params.append(page_id)
        cursor.execute(f"UPDATE notebook_pages SET {', '.join(updates)} WHERE id = ?", params)
        # Touch notebook updated_at
        cursor.execute("UPDATE notebooks SET updated_at = ? WHERE id = ?", (now, existing["notebook_id"]))
        conn.commit()

    conn.close()
    return get_notebook_page_by_id(page_id, db_path)

def delete_notebook_page(page_id, db_path=None):
    existing = get_notebook_page_by_id(page_id, db_path)
    if not existing:
        return None

    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notebook_pages WHERE id = ?", (page_id,))
    
    # Re-sequence remaining page numbers
    cursor.execute("""
        SELECT id FROM notebook_pages 
        WHERE notebook_id = ? 
        ORDER BY page_number ASC, id ASC
    """, (existing["notebook_id"],))
    remaining = cursor.fetchall()
    for idx, r in enumerate(remaining):
        cursor.execute("UPDATE notebook_pages SET page_number = ? WHERE id = ?", (idx + 1, r["id"]))

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("UPDATE notebooks SET updated_at = ? WHERE id = ?", (now, existing["notebook_id"]))
    conn.commit()
    conn.close()
    return existing

def reorder_notebook_pages(notebook_id, page_ids_in_order, db_path=None):
    """Reorders pages in a notebook according to a list of page IDs."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    for idx, pid in enumerate(page_ids_in_order):
        cursor.execute("""
            UPDATE notebook_pages 
            SET page_number = ?, updated_at = ? 
            WHERE id = ? AND notebook_id = ?
        """, (idx + 1, now, pid, notebook_id))

    cursor.execute("UPDATE notebooks SET updated_at = ? WHERE id = ?", (now, notebook_id))
    conn.commit()
    conn.close()
    return get_notebook_by_id(notebook_id, include_pages=True, db_path=db_path)

def get_stats(upload_folder=None, db_path=None):
    """Calculates summary metrics across single notes and multi-page notebooks."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total_notes FROM notes")
    total_notes = cursor.fetchone()["total_notes"]

    cursor.execute("SELECT COUNT(*) as favorite_notes FROM notes WHERE is_favorite = 1")
    favorite_notes = cursor.fetchone()["favorite_notes"]

    cursor.execute("SELECT COUNT(*) as total_notebooks FROM notebooks")
    total_notebooks = cursor.fetchone()["total_notebooks"]

    cursor.execute("SELECT COUNT(*) as total_notebook_pages FROM notebook_pages")
    total_notebook_pages = cursor.fetchone()["total_notebook_pages"]

    cursor.execute("SELECT tags FROM notes WHERE tags IS NOT NULL")
    all_tags = set()
    for r in cursor.fetchall():
        if r["tags"]:
            try:
                t_list = json.loads(r["tags"])
                if isinstance(t_list, list):
                    all_tags.update(t_list)
            except Exception:
                pass

    conn.close()

    storage_bytes = 0
    file_count = 0
    if upload_folder and os.path.exists(upload_folder):
        for f in os.listdir(upload_folder):
            fp = os.path.join(upload_folder, f)
            if os.path.isfile(fp) and not f.startswith('.'):
                storage_bytes += os.path.getsize(fp)
                file_count += 1

    return {
        "total_notes": total_notes,
        "favorite_notes": favorite_notes,
        "total_notebooks": total_notebooks,
        "total_notebook_pages": total_notebook_pages,
        "unique_tags_count": len(all_tags),
        "tags": sorted(list(all_tags)),
        "storage_used_bytes": storage_bytes,
        "storage_used_mb": round(storage_bytes / (1024 * 1024), 2),
        "uploaded_files_count": file_count
    }
