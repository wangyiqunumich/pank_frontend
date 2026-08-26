import os
import sqlite3
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch


class AgentApiTests(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.TemporaryDirectory()
        os.environ["HIRN_AGENT_USAGE_DB"] = str(Path(cls.temp_dir.name) / "usage.sqlite3")
        os.environ["HIRN_AGENT_WARNING_USD"] = "0.00001"
        from hirn_agent_api import app as module

        cls.module = module
        module.DB_PATH = Path(os.environ["HIRN_AGENT_USAGE_DB"])
        module.WARNING_THRESHOLD_USD = float(os.environ["HIRN_AGENT_WARNING_USD"])
        module._initialize_usage_db()

    @classmethod
    def tearDownClass(cls):
        cls.temp_dir.cleanup()

    def setUp(self):
        with sqlite3.connect(self.module.DB_PATH) as connection:
            connection.execute("DELETE FROM claude_usage")
            connection.commit()

    def test_usage_cost_and_warning(self):
        self.module._record_usage(
            "request-1", SimpleNamespace(input_tokens=10, output_tokens=10)
        )
        status = self.module._usage_status()
        self.assertEqual(status["input_tokens"], 10)
        self.assertEqual(status["output_tokens"], 10)
        self.assertAlmostEqual(status["estimated_monthly_cost_usd"], 0.00006)
        self.assertTrue(status["warning_active"])

    def test_usage_monthly_reset(self):
        with sqlite3.connect(self.module.DB_PATH) as connection:
            connection.execute(
                "INSERT INTO claude_usage VALUES (NULL, ?, ?, ?, ?, ?, ?)",
                ("2000-01-01T00:00:00+00:00", "old", self.module.MODEL, 100, 100, 1.0),
            )
            connection.commit()
        self.assertEqual(self.module._usage_status()["claude_calls"], 0)

    def test_extracts_key_from_note_without_copying_it_to_usage_storage(self):
        key_file = Path(self.temp_dir.name) / "key-note.txt"
        key_file.write_text("Anthropic key below\nsk-ant-test_value\n", encoding="utf-8")
        with patch.dict(
            os.environ,
            {"ANTHROPIC_API_KEY": "", "ANTHROPIC_API_KEY_FILE": str(key_file)},
            clear=False,
        ):
            self.assertEqual(self.module._extract_api_key(), "sk-ant-test_value")
        with sqlite3.connect(self.module.DB_PATH) as connection:
            schema = " ".join(
                row[0] for row in connection.execute(
                    "SELECT sql FROM sqlite_master WHERE sql IS NOT NULL"
                )
            )
        self.assertNotIn("api_key", schema.lower())

    def test_deduplicates_raw_hirn_results(self):
        result = {"response": "Raw HIRN answer", "references": [{"id": "123"}]}
        attempts = [
            {"attempt_id": "r1-1", "status": "complete", "result": result},
            {"attempt_id": "r1-2", "status": "complete", "result": dict(result)},
        ]
        selected, alternatives = self.module._deduplicate_results(attempts, "r1-1")
        self.assertIs(selected["result"], result)
        self.assertEqual(alternatives, [])

    async def test_round_runs_three_queries(self):
        request = SimpleNamespace(is_disconnected=AsyncMock(return_value=False))
        completed = {
            "status": "complete",
            "result": {"response": "answer", "references": [{"id": "1"}]},
        }

        async def fake_query(query, attempt_id, round_number):
            return {**completed, "query": query, "attempt_id": attempt_id, "round": round_number}

        with patch.object(self.module, "_query_hirn", side_effect=fake_query) as query_mock:
            results = await self.module._run_round(["one", "two", "three"], 1, request)
        self.assertEqual(len(results), 3)
        self.assertEqual(query_mock.call_count, 3)

    async def test_audit_fallback_never_generates_answer(self):
        attempts = [
            {
                "attempt_id": "r1-1",
                "query": "query",
                "status": "complete",
                "result": {"response": "Exact HIRN text", "references": [{"id": "1"}]},
            }
        ]
        with patch.object(self.module, "_claude_tool_call", side_effect=RuntimeError("down")):
            audit, fallback = await self.module._audit_attempts(
                SimpleNamespace(), "request", "question", attempts
            )
        self.assertTrue(fallback)
        self.assertEqual(audit["selected_attempt_id"], "r1-1")
        self.assertNotIn("answer", audit)

    async def test_audit_limits_retry_queries_to_two(self):
        attempts = [
            {
                "attempt_id": "r1-1",
                "query": "query",
                "status": "complete",
                "result": {"response": "Not found", "references": []},
            }
        ]
        audit_payload = {
            "selected_attempt_id": "r1-1",
            "scores": [],
            "retry_needed": True,
            "retry_queries": ["retry one", "retry two", "retry three"],
            "rationale": "Coverage was weak.",
        }
        with patch.object(self.module, "_claude_tool_call", return_value=audit_payload):
            audit, fallback = await self.module._audit_attempts(
                SimpleNamespace(), "request", "question", attempts
            )
        self.assertFalse(fallback)
        self.assertEqual(audit["retry_queries"], ["retry one", "retry two"])


if __name__ == "__main__":
    unittest.main()
