import os
import io
import json
import tempfile
import unittest
from PIL import Image
from backend.app import create_app
from backend.db import (
    init_db,
    create_notebook,
    get_all_notebooks,
    get_notebook_by_id,
    add_notebook_page,
    update_notebook,
    delete_notebook
)
from backend.services.pdf_service import generate_notebook_pdf, generate_notebook_markdown

class TestNotebooks(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_notes.db")
        self.upload_dir = os.path.join(self.temp_dir.name, "uploads")
        os.makedirs(self.upload_dir, exist_ok=True)

        self.app = create_app({
            "TESTING": True,
            "DATABASE_PATH": self.db_path,
            "UPLOAD_FOLDER": self.upload_dir
        })
        self.client = self.app.test_client()

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_create_and_fetch_notebook(self):
        nb = create_notebook(
            title="Data Structures",
            description="Linked lists and binary trees notes",
            subject_tag="Computer Science",
            cover_color="#06b6d4",
            db_path=self.db_path
        )
        self.assertIsNotNone(nb["id"])
        self.assertEqual(nb["title"], "Data Structures")
        self.assertEqual(nb["subject_tag"], "Computer Science")

        # Add 2 pages
        p1 = add_notebook_page(
            notebook_id=nb["id"],
            page_number=1,
            title="Arrays & Linked Lists",
            content="Dynamic arrays resize by doubling.",
            db_path=self.db_path
        )
        p2 = add_notebook_page(
            notebook_id=nb["id"],
            page_number=2,
            title="Binary Search Trees",
            content="Left child < root < right child.",
            db_path=self.db_path
        )

        fetched = get_notebook_by_id(nb["id"], include_pages=True, db_path=self.db_path)
        self.assertEqual(len(fetched["pages"]), 2)
        self.assertEqual(fetched["pages"][0]["title"], "Arrays & Linked Lists")
        self.assertEqual(fetched["pages"][1]["title"], "Binary Search Trees")

    def test_pdf_and_markdown_generation(self):
        nb = {
            "title": "Calculus 101",
            "description": "Limits and derivatives",
            "subject_tag": "Mathematics",
            "created_at": "2026-08-16",
            "pages": [
                {
                    "page_number": 1,
                    "title": "Limits Definition",
                    "content": "# Limits\nA limit is the value that a function approaches."
                },
                {
                    "page_number": 2,
                    "title": "Power Rule",
                    "content": "The derivative of x^n is n*x^(n-1)."
                }
            ]
        }

        # Test PDF Generation
        pdf_buf = io.BytesIO()
        generate_notebook_pdf(nb, pdf_buf)
        pdf_bytes = pdf_buf.getvalue()
        self.assertTrue(len(pdf_bytes) > 500)
        self.assertTrue(pdf_bytes.startswith(b'%PDF'))

        # Test Markdown Generation
        md_text = generate_notebook_markdown(nb)
        self.assertIn("# Calculus 101", md_text)
        self.assertIn("## Page 1: Limits Definition", md_text)
        self.assertIn("## Page 2: Power Rule", md_text)

    def test_api_notebook_endpoints(self):
        # 1. Create Notebook via API
        res = self.client.post("/api/notebooks", json={
            "title": "AI & Deep Learning",
            "description": "Lecture notes on transformers and attention",
            "subject_tag": "AI"
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        nb_id = data["notebook"]["id"]

        # 2. Add Page via API
        p_res = self.client.post(f"/api/notebooks/{nb_id}/pages", json={
            "title": "Self-Attention Mechanism",
            "content": "Attention(Q,K,V) = softmax(QK^T / sqrt(d_k))V"
        })
        self.assertEqual(p_res.status_code, 201)

        # 3. Export PDF via API
        export_res = self.client.get(f"/api/notebooks/{nb_id}/export-pdf")
        self.assertEqual(export_res.status_code, 200)
        self.assertEqual(export_res.content_type, "application/pdf")
        self.assertTrue(len(export_res.data) > 0)

        # 4. Export Markdown via API
        md_res = self.client.get(f"/api/notebooks/{nb_id}/export-md")
        self.assertEqual(md_res.status_code, 200)
        self.assertIn("AI & Deep Learning", md_res.data.decode('utf-8'))

if __name__ == "__main__":
    unittest.main()
