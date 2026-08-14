import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db import init_db, create_note, get_all_notes

def seed_sample_data():
    """Initializes the database and seeds sample notes if empty."""
    init_db()
    existing_notes = get_all_notes()
    if existing_notes:
        print(f"Database already contains {len(existing_notes)} note(s). Skipping seed.")
        return

    sample_notes = [
        {
            "title": "Welcome to Flask Image Note Extractor",
            "content": "This application allows you to drag-and-drop or upload images to automatically extract metadata (dimensions, format, EXIF, color profiles) and organize notes backed by SQLite.",
            "extracted_text": "Sample extraction preview: High performance image processing with Flask backend and React frontend.",
            "tags": ["guide", "getting-started", "flask", "react"],
            "is_favorite": 1
        },
        {
            "title": "System Architecture Overview",
            "content": "• Backend: Flask 3.1 REST API + SQLite with JSON metadata storage\n• Image Processing: Pillow (PIL) metadata parser\n• Frontend: React 18 with Glassmorphism Dark UI and real-time search filters",
            "extracted_text": "System Architecture\nFlask Backend -> SQLite DB\nReact Frontend -> REST API",
            "tags": ["architecture", "backend", "sqlite"],
            "is_favorite": 1
        },
        {
            "title": "Quarterly Research Notes",
            "content": "Meeting takeaways on optical recognition and document scanning pipelines. Key metrics to monitor: response latency, storage efficiency, thumbnail compression.",
            "extracted_text": "Meeting Action Items:\n1. Integrate image metadata inspector\n2. Add instant tag filtering\n3. Support drag-and-drop batch workflow",
            "tags": ["meeting", "research", "document"],
            "is_favorite": 0
        }
    ]

    for item in sample_notes:
        create_note(
            title=item["title"],
            content=item["content"],
            extracted_text=item["extracted_text"],
            tags=item["tags"],
            is_favorite=item["is_favorite"]
        )

    print(f"Successfully seeded {len(sample_notes)} sample note(s) into SQLite database.")

if __name__ == "__main__":
    seed_sample_data()
