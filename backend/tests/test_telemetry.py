import unittest
import os
import json
import tempfile
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app import create_app
from backend.db import init_db, log_llm_telemetry, get_llm_telemetry_stats, get_llm_telemetry_recent, clear_llm_telemetry

class TestTelemetryAndLLMOps(unittest.TestCase):
    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")
        self.test_config = {
            "TESTING": True,
            "DATABASE_PATH": self.db_path,
            "UPLOAD_FOLDER": tempfile.mkdtemp()
        }
        self.app = create_app(self.test_config)
        self.client = self.app.test_client()
        init_db(self.db_path)

    def tearDown(self):
        try:
            os.close(self.db_fd)
            if os.path.exists(self.db_path):
                os.remove(self.db_path)
        except Exception:
            pass

    def test_log_telemetry_and_stats(self):
        # 1. Log a primary Gemini call
        log_id1 = log_llm_telemetry(
            request_type="notebook_rag",
            model_used="gemini-3.6-flash",
            is_fallback=False,
            latency_ms=450,
            prompt_tokens=200,
            completion_tokens=150,
            total_tokens=350,
            estimated_cost_usd=0.00006,
            status="success",
            db_path=self.db_path
        )
        self.assertIsNotNone(log_id1)

        # 2. Log a fallback local PyTorch call
        log_id2 = log_llm_telemetry(
            request_type="ocr_transcription",
            model_used="pytorch-easyocr-local",
            is_fallback=True,
            fallback_reason="no_api_key",
            latency_ms=1200,
            prompt_tokens=0,
            completion_tokens=80,
            total_tokens=80,
            status="fallback",
            db_path=self.db_path
        )
        self.assertIsNotNone(log_id2)

        # Calculate stats
        stats = get_llm_telemetry_stats(self.db_path)
        self.assertEqual(stats["total_requests"], 2)
        self.assertEqual(stats["fallback_count"], 1)
        self.assertEqual(stats["fallback_rate_pct"], 50.0)
        self.assertEqual(stats["total_tokens"], 430)
        self.assertGreater(stats["avg_latency_ms"], 0)

        # Check breakdown
        models = {m["model_used"]: m["count"] for m in stats["models_breakdown"]}
        self.assertEqual(models.get("gemini-3.6-flash"), 1)
        self.assertEqual(models.get("pytorch-easyocr-local"), 1)

    def test_telemetry_endpoints(self):
        # Log sample record
        log_llm_telemetry(
            request_type="workspace_rag",
            model_used="gemini-3.6-flash",
            is_fallback=False,
            latency_ms=620,
            prompt_tokens=500,
            completion_tokens=300,
            total_tokens=800,
            db_path=self.db_path
        )

        # 1. GET /api/telemetry/stats
        res = self.client.get('/api/telemetry/stats')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data["success"])
        self.assertEqual(data["telemetry"]["total_requests"], 1)

        # 2. GET /api/telemetry/logs
        res_logs = self.client.get('/api/telemetry/logs')
        self.assertEqual(res_logs.status_code, 200)
        data_logs = json.loads(res_logs.data)
        self.assertEqual(len(data_logs["logs"]), 1)
        self.assertEqual(data_logs["logs"][0]["model_used"], "gemini-3.6-flash")

        # 3. DELETE /api/telemetry/logs
        res_del = self.client.delete('/api/telemetry/logs')
        self.assertEqual(res_del.status_code, 200)
        
        # Verify empty
        res_after = self.client.get('/api/telemetry/stats')
        data_after = json.loads(res_after.data)
        self.assertEqual(data_after["telemetry"]["total_requests"], 0)

if __name__ == "__main__":
    unittest.main()
