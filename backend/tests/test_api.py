import os
import io
import unittest
import json
import tempfile
import shutil
from PIL import Image
from backend.app import create_app
from backend.db import init_db
from backend.services.ocr_service import expand_abbreviations_and_shortforms, correct_ocr_handwriting_errors

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

    def test_shorthand_expansion(self):
        sample = "Meet w/ dept mgmt b/c of new arch and db reqs. Approx 5 devs needed asap."
        expanded = expand_abbreviations_and_shortforms(sample)
        self.assertIn("with", expanded)
        self.assertIn("department", expanded)
        self.assertIn("management", expanded)
        self.assertIn("because", expanded)
        self.assertIn("architecture", expanded)
        self.assertIn("database", expanded)
        self.assertIn("requirements", expanded)
        self.assertIn("Approximately", expanded)
        self.assertIn("developers", expanded)
        self.assertIn("as soon as possible", expanded)

    def test_ocr_confusion_correction(self):
        sample = "rnake a prograrn to read clata frorn systern vvith c0de"
        corrected = correct_ocr_handwriting_errors(sample)
        self.assertIn("make", corrected)
        self.assertIn("program", corrected)
        self.assertIn("data", corrected)
        self.assertIn("from", corrected)
        self.assertIn("system", corrected)
        self.assertIn("with", corrected)
        self.assertIn("code", corrected)

    def test_create_and_get_note(self):
        payload = {
            "title": "Test SQLite Note",
            "content": "This is a unit test note content.",
            "extracted_text": "Extracted sample text",
            "handwriting_style": "caveat",
            "ai_insights": {
                "core_concept": "Unit Testing",
                "key_takeaways": ["Point 1", "Point 2"]
            },
            "tags": ["testing", "sqlite"],
            "is_favorite": True
        }
        res = self.client.post("/api/notes", json=payload)
        self.assertEqual(res.status_code, 201)
        created_note = res.get_json()["note"]
        self.assertEqual(created_note["title"], "Test SQLite Note")
        self.assertTrue(created_note["is_favorite"])
        self.assertEqual(created_note["handwriting_style"], "caveat")
        self.assertIsNotNone(created_note["ai_insights"])
        note_id = created_note["id"]

        get_res = self.client.get(f"/api/notes/{note_id}")
        self.assertEqual(get_res.status_code, 200)
        retrieved = get_res.get_json()["note"]
        self.assertEqual(retrieved["title"], "Test SQLite Note")
        self.assertIn("testing", retrieved["tags"])

    def test_batch_create_notes(self):
        payload = {
            "notes": [
                {
                    "title": "Topic 1: Overview",
                    "content": "Overview of handwriting segmentation pipeline.",
                    "tags": ["architecture", "pytorch"],
                    "handwriting_style": "font-caveat"
                },
                {
                    "title": "Topic 2: Action Items",
                    "content": "1. Deploy PyTorch OCR model\n2. Verify batch SQLite inserts",
                    "tags": ["action-items"],
                    "handwriting_style": "font-kalam"
                }
            ]
        }
        res = self.client.post("/api/notes/batch", json=payload)
        self.assertEqual(res.status_code, 201)
        resp_json = res.get_json()
        self.assertEqual(resp_json["count"], 2)
        self.assertEqual(len(resp_json["notes"]), 2)
        self.assertEqual(resp_json["notes"][0]["title"], "Topic 1: Overview")
        self.assertEqual(resp_json["notes"][1]["title"], "Topic 2: Action Items")

    def test_upload_image_clean_white_and_segmentation(self):
        img_byte_arr = io.BytesIO()
        img = Image.new("RGB", (300, 200), color="#f0e6d2")
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        draw.line((20, 20, 280, 20), fill="#1e1e1e", width=4)
        draw.line((20, 50, 200, 50), fill="#003366", width=3)
        img.save(img_byte_arr, format="PNG")
        img_byte_arr.seek(0)

        data = {
            "file": (img_byte_arr, "sample_meeting_notes.png"),
            "auto_save": "false"
        }

        res = self.client.post("/api/upload", data=data, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        resp_json = res.get_json()
        self.assertIn("draft", resp_json)
        draft = resp_json["draft"]
        self.assertIn("segmented_notes", draft)
        self.assertTrue(len(draft["segmented_notes"]) >= 1)

    def test_update_and_delete_note(self):
        res = self.client.post("/api/notes", json={"title": "To Delete", "content": "Sample"})
        note_id = res.get_json()["note"]["id"]

        update_res = self.client.put(f"/api/notes/{note_id}", json={
            "title": "Updated Title",
            "handwriting_style": "kalam",
            "is_favorite": True
        })
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.get_json()["note"]["title"], "Updated Title")

        del_res = self.client.delete(f"/api/notes/{note_id}")
        self.assertEqual(del_res.status_code, 200)

        get_after_del = self.client.get(f"/api/notes/{note_id}")
        self.assertEqual(get_after_del.status_code, 404)

if __name__ == "__main__":
    unittest.main()
