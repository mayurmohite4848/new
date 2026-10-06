import os
import io
import json
import tempfile
import unittest
from backend.app import create_app
from backend.db import create_notebook, add_notebook_page, get_notebook_chat_messages
from backend.services.rag_service import extract_page_citations, format_notebook_context, query_notebook_rag

class TestNotebookRAG(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_rag.db")
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

    def test_citation_extraction(self):
        # Case 1: Standard [Page 1]
        text1 = "Linear regression models are discussed in [Page 1]."
        self.assertEqual(extract_page_citations(text1), [1])

        # Case 2: Multiple pages [Page 2, Page 4]
        text2 = "As proven on [Page 2, Page 4], eigenvalues are invariant under change of basis."
        self.assertEqual(extract_page_citations(text2), [2, 4])

        # Case 3: Mixed mentions [Pages 1, 3] and Page 5
        text3 = "Refer to [Pages 1, 3] and also Page 5 for full equations."
        self.assertEqual(extract_page_citations(text3), [1, 3, 5])

    def test_context_formatting(self):
        nb = {
            "title": "Machine Learning Foundations",
            "subject_tag": "AI",
            "pages": [
                {"page_number": 1, "title": "Gradient Descent", "content": "Gradient descent minimizes the cost function J(w)."},
                {"page_number": 2, "title": "Learning Rate", "content": "The learning rate alpha determines step size."}
            ]
        }
        context = format_notebook_context(nb)
        self.assertIn("NOTEBOOK TITLE: Machine Learning Foundations", context)
        self.assertIn("BEGIN PAGE 1: Gradient Descent", context)
        self.assertIn("BEGIN PAGE 2: Learning Rate", context)

    def test_local_rag_fallback_query(self):
        nb = {
            "title": "Statistics & Probability",
            "subject_tag": "Math",
            "pages": [
                {"page_number": 1, "title": "Hypothesis Testing", "content": "The p-value is the probability of observing test results at least as extreme."},
                {"page_number": 2, "title": "Bayes Theorem", "content": "P(A|B) = P(B|A) * P(A) / P(B)"}
            ]
        }
        res = query_notebook_rag(nb, "What is the formula for Bayes Theorem?")
        self.assertIn("Page 2", res["reply"])
        self.assertIn(2, res["citations"])

    def test_page_scoped_rag_query(self):
        nb = {
            "title": "Physics Lectures",
            "subject_tag": "Physics",
            "pages": [
                {"page_number": 1, "title": "Kinematics", "content": "Velocity is the derivative of position with respect to time."},
                {"page_number": 2, "title": "Thermodynamics", "content": "Entropy of an isolated system always increases over time."}
            ]
        }
        # Query with current_page_number=2 and scope='current_page'
        res = query_notebook_rag(nb, "Summarize this page", current_page_number=2, scope="current_page")
        self.assertIn("Page 2", res["reply"])
        self.assertIn(2, res["citations"])

    def test_chat_api_endpoint(self):
        # 1. Create a notebook with pages in DB
        nb = create_notebook(
            title="Computer Vision Notes",
            subject_tag="Deep Learning",
            db_path=self.db_path
        )
        add_notebook_page(
            notebook_id=nb["id"],
            page_number=1,
            title="Convolutional Layers",
            content="Convolutions apply spatial filter kernels over input tensors to extract edge features.",
            db_path=self.db_path
        )

        # 2. Call Chat endpoint
        res = self.client.post(f"/api/notebooks/{nb['id']}/chat", json={
            "message": "What do filter kernels do in convolutions?"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("reply", data)
        self.assertIn("user_message", data)
        self.assertIn("assistant_message", data)

        # 3. Retrieve chat history
        history_res = self.client.get(f"/api/notebooks/{nb['id']}/chat")
        self.assertEqual(history_res.status_code, 200)
        hist_data = history_res.get_json()
        self.assertEqual(hist_data["count"], 2) # User + Assistant

        # 4. Clear chat history
        del_res = self.client.delete(f"/api/notebooks/{nb['id']}/chat")
        self.assertEqual(del_res.status_code, 200)

        history_res2 = self.client.get(f"/api/notebooks/{nb['id']}/chat")
        self.assertEqual(history_res2.get_json()["count"], 0)

if __name__ == "__main__":
    unittest.main()
