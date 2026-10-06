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

    def test_workspace_context_and_citations(self):
        from backend.services.rag_service import format_workspace_context, extract_workspace_citations, query_workspace_rag
        
        workspace_data = {
            "notebooks": [
                {
                    "id": 1,
                    "title": "Linear Algebra",
                    "subject_tag": "Math",
                    "pages": [
                        {"page_number": 1, "title": "Vectors", "content": "Vector spaces have basis vectors."},
                        {"page_number": 2, "title": "Eigenvalues", "content": "Ax = lambda x defines eigenvalue equations."}
                    ]
                },
                {
                    "id": 2,
                    "title": "Machine Learning",
                    "subject_tag": "AI",
                    "pages": [
                        {"page_number": 1, "title": "PCA", "content": "PCA uses eigenvectors for dimensionality reduction."}
                    ]
                }
            ],
            "notes": [
                {
                    "id": 10,
                    "title": "Quick Formulas",
                    "content": "Determinant of 2x2 matrix is ad - bc.",
                    "tags": ["math", "cheatsheet"]
                }
            ]
        }

        # 1. Format workspace context
        context = format_workspace_context(workspace_data)
        self.assertIn("NOTEBOOK [ID: 1]: \"Linear Algebra\"", context)
        self.assertIn("NOTEBOOK [ID: 2]: \"Machine Learning\"", context)
        self.assertIn("Note [ID: 10]: \"Quick Formulas\"", context)

        # 2. Extract multi-document citations
        sample_output = (
            "Eigenvalues from [Notebook: Linear Algebra | Page 2] are directly utilized "
            "in [Notebook: Machine Learning | Page 1] for PCA. Also see [Note: Quick Formulas]."
        )
        citations = extract_workspace_citations(sample_output, workspace_data)
        self.assertEqual(len(citations), 3)
        self.assertEqual(citations[0]["type"], "notebook_page")
        self.assertEqual(citations[0]["notebook_title"], "Linear Algebra")
        self.assertEqual(citations[0]["page_number"], 2)
        self.assertEqual(citations[1]["notebook_title"], "Machine Learning")
        self.assertEqual(citations[1]["page_number"], 1)
        self.assertEqual(citations[2]["type"], "note")
        self.assertEqual(citations[2]["note_title"], "Quick Formulas")

        # 3. Test local multi-document fallback query
        res = query_workspace_rag(workspace_data, "Where is PCA dimensionality reduction discussed?")
        self.assertIn("Machine Learning", res["reply"])
        self.assertTrue(len(res["citations"]) > 0)

    def test_global_workspace_chat_api(self):
        from backend.db import create_note
        # 1. Create a notebook and a single note
        nb = create_notebook(title="Neuroscience", subject_tag="Biology", db_path=self.db_path)
        add_notebook_page(notebook_id=nb["id"], page_number=1, title="Neurons", content="Action potentials propagate across axons via myelin sheaths.", db_path=self.db_path)
        create_note(title="Synapse Note", content="Neurotransmitters diffuse across synaptic clefts.", db_path=self.db_path)

        # 2. POST to global workspace chat
        res = self.client.post("/api/workspace/chat", json={
            "message": "Explain how action potentials and synapses work in neuroscience"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("reply", data)
        self.assertIn("user_message", data)
        self.assertIn("assistant_message", data)

        # 3. GET workspace history
        hist = self.client.get("/api/workspace/chat").get_json()
        self.assertEqual(hist["count"], 2)

        # 4. DELETE workspace history
        del_res = self.client.delete("/api/workspace/chat")
        self.assertEqual(del_res.status_code, 200)
        hist2 = self.client.get("/api/workspace/chat").get_json()
        self.assertEqual(hist2["count"], 0)

    def test_cross_notebook_recommendations(self):
        # 1. Create two related notebooks
        nb1 = create_notebook(title="Calculus I", subject_tag="Math", db_path=self.db_path)
        add_notebook_page(notebook_id=nb1["id"], page_number=1, title="Derivatives", content="Derivatives calculate the instantaneous rate of change.", db_path=self.db_path)

        nb2 = create_notebook(title="Physics Mechanics", subject_tag="Physics", db_path=self.db_path)
        add_notebook_page(notebook_id=nb2["id"], page_number=1, title="Velocity", content="Velocity is the instantaneous rate of change of position with respect to time.", db_path=self.db_path)

        # 2. Call related endpoint
        res = self.client.get(f"/api/notebooks/{nb1['id']}/related")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("related", data)
        self.assertTrue(len(data["related"]) >= 1)
        self.assertEqual(data["related"][0]["notebook_title"], "Physics Mechanics")

if __name__ == "__main__":
    unittest.main()

