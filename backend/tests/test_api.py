import os
import io
import unittest
import json
import tempfile
import shutil
from PIL import Image
from backend.app import create_app
from backend.db import init_db

class TestFlaskNoteApi(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test_notes.db")
        self.upload_dir = os.path.join(self.temp_dir, "uploads")
        os.makedirs(self.upload_dir, exist_ok=True)

        self.app = create_app({
            "TESTING": True,
            "DATABASE_PATH": self.db_path,
            "UPLOAD_FOLDER": self.upload_dir
        })
        self.client = self.app.test_client()

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_health_check(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "healthy")

    def test_create_and_get_note(self):
        # Create a manual note
        payload = {
            "title": "Test SQLite Note",
            "content": "This is a unit test note content.",
            "extracted_text": "Extracted sample text",
            "tags": ["testing", "sqlite"],
            "is_favorite": True
        }
        res = self.client.post("/api/notes", json=payload)
        self.assertEqual(res.status_code, 201)
        created_note = res.get_json()["note"]
        self.assertEqual(created_note["title"], "Test SQLite Note")
        self.assertTrue(created_note["is_favorite"])
        note_id = created_note["id"]

        # Retrieve note by ID
        get_res = self.client.get(f"/api/notes/{note_id}")
        self.assertEqual(get_res.status_code, 200)
        retrieved = get_res.get_json()["note"]
        self.assertEqual(retrieved["title"], "Test SQLite Note")
        self.assertIn("testing", retrieved["tags"])

    def test_update_and_delete_note(self):
        # Create note
        res = self.client.post("/api/notes", json={"title": "To Delete", "content": "Sample"})
        note_id = res.get_json()["note"]["id"]

        # Update note
        update_res = self.client.put(f"/api/notes/{note_id}", json={
            "title": "Updated Title",
            "is_favorite": True
        })
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.get_json()["note"]["title"], "Updated Title")

        # Delete note
        del_res = self.client.delete(f"/api/notes/{note_id}")
        self.assertEqual(del_res.status_code, 200)

        # Ensure it's gone
        get_after_del = self.client.get(f"/api/notes/{note_id}")
        self.assertEqual(get_after_del.status_code, 404)

    def test_upload_image_and_process(self):
        # Generate a small in-memory PNG image
        img_byte_arr = io.BytesIO()
        img = Image.new("RGB", (200, 150), color="blue")
        img.save(img_byte_arr, format="PNG")
        img_byte_arr.seek(0)

        data = {
            "file": (img_byte_arr, "sample_diagram.png"),
            "auto_save": "true",
            "title": "Sample Diagram Note"
        }

        res = self.client.post("/api/upload", data=data, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 201)
        resp_json = res.get_json()
        self.assertIn("note", resp_json)
        note = resp_json["note"]
        self.assertEqual(note["title"], "Sample Diagram Note")
        self.assertIsNotNone(note["image_metadata"])
        self.assertEqual(note["image_metadata"]["width"], 200)
        self.assertEqual(note["image_metadata"]["height"], 150)
        self.assertEqual(note["image_metadata"]["format"], "PNG")

    def test_stats_and_filtering(self):
        self.client.post("/api/notes", json={"title": "Note Alpha", "content": "Alpha text", "tags": ["tagA"]})
        self.client.post("/api/notes", json={"title": "Note Beta", "content": "Beta text", "tags": ["tagB"]})

        stats_res = self.client.get("/api/stats")
        self.assertEqual(stats_res.status_code, 200)
        stats = stats_res.get_json()["stats"]
        self.assertEqual(stats["total_notes"], 2)

        # Filter by search
        search_res = self.client.get("/api/notes?search=Alpha")
        self.assertEqual(search_res.get_json()["count"], 1)

if __name__ == "__main__":
    unittest.main()
