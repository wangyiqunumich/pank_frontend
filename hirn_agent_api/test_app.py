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

    async def test_round_runs_four_queries_across_two_perspectives(self):
        request = SimpleNamespace(is_disconnected=AsyncMock(return_value=False))
        completed = {
            "status": "complete",
            "result": {"response": "answer", "references": [{"id": "1"}]},
        }

        async def fake_query(query, attempt_id, round_number):
            return {**completed, "query": query, "attempt_id": attempt_id, "round": round_number}

        with patch.object(self.module, "_query_hirn", side_effect=fake_query) as query_mock:
            results = await self.module._run_round([
                {"query": "one", "perspective": "context_mechanism"},
                {"query": "two", "perspective": "context_mechanism"},
                {"query": "three", "perspective": "alternative_explanation"},
                {"query": "four", "perspective": "alternative_explanation"},
            ], 1, request)
        self.assertEqual(len(results), 4)
        self.assertEqual(query_mock.call_count, 4)
        self.assertEqual(
            [result["perspective"] for result in results],
            ["context_mechanism", "context_mechanism", "alternative_explanation", "alternative_explanation"],
        )

    async def test_planner_requires_two_queries_for_each_perspective(self):
        plan = {
            "variants": [
                {"query": "main mechanism query one", "perspective": "context_mechanism"},
                {"query": "main mechanism query two", "perspective": "context_mechanism"},
                {"query": "alternative query one", "perspective": "alternative_explanation"},
                {"query": "alternative query two", "perspective": "alternative_explanation"},
            ],
            "strategy": "Check both evidence perspectives independently.",
        }
        payload = self.module.AgentSearchRequest(question="Does mechanism A explain outcome B?")
        with patch.object(self.module, "_claude_tool_call", return_value=plan):
            variants, strategy = await self.module._plan_queries(
                SimpleNamespace(), "request", payload
            )
        self.assertEqual(len(variants), 4)
        self.assertEqual(
            [variant["perspective"] for variant in variants].count("alternative_explanation"),
            2,
        )
        self.assertIn("independently", strategy)

    async def test_audit_fallback_never_generates_answer(self):
        attempts = [
            {
                "attempt_id": "r1-1",
                "query": "query",
                "perspective": "context_mechanism",
                "status": "complete",
                "result": {"response": "Exact HIRN text", "references": [{"id": "1"}]},
            }
        ]
        with patch.object(self.module, "_claude_tool_call", side_effect=RuntimeError("down")):
            audit, fallback = await self.module._audit_attempts(
                SimpleNamespace(), "request", "question", attempts
            )
        self.assertTrue(fallback)
        self.assertEqual(audit["selected_attempt_ids"]["context_mechanism"], "r1-1")
        self.assertIsNone(audit["selected_attempt_ids"]["alternative_explanation"])
        self.assertNotIn("answer", audit)

    async def test_audit_limits_retry_queries_to_two(self):
        attempts = [
            {
                "attempt_id": "r1-1",
                "query": "query",
                "perspective": "context_mechanism",
                "status": "complete",
                "result": {"response": "Not found", "references": []},
            }
        ]
        audit_payload = {
            "selected_attempt_ids": {
                "context_mechanism": "r1-1",
                "alternative_explanation": "missing",
            },
            "scores": [],
            "retry_needed": True,
            "retry_queries": [
                {"query": "retry one", "perspective": "context_mechanism"},
                {"query": "retry two", "perspective": "alternative_explanation"},
                {"query": "retry three", "perspective": "alternative_explanation"},
            ],
            "rationale": "Coverage was weak.",
        }
        with patch.object(self.module, "_claude_tool_call", return_value=audit_payload):
            audit, fallback = await self.module._audit_attempts(
                SimpleNamespace(), "request", "question", attempts
            )
        self.assertFalse(fallback)
        self.assertEqual(audit["retry_queries"], [
            {"query": "retry one", "perspective": "context_mechanism"},
            {"query": "retry two", "perspective": "alternative_explanation"},
        ])

    def test_preserves_one_raw_hirn_result_for_each_perspective(self):
        attempts = [
            {
                "attempt_id": "r1-1",
                "query": "main mechanism",
                "perspective": "context_mechanism",
                "status": "complete",
                "result": {"response": "Raw main evidence", "references": [{"id": "1"}]},
            },
            {
                "attempt_id": "r1-3",
                "query": "alternative mechanism",
                "perspective": "alternative_explanation",
                "status": "complete",
                "result": {"response": "Raw alternative evidence", "references": [{"id": "2"}]},
            },
        ]
        perspectives = self.module._perspective_results(
            attempts,
            {"context_mechanism": "r1-1", "alternative_explanation": "r1-3"},
        )
        self.assertEqual(
            perspectives["context_mechanism"]["selected"]["result"]["response"],
            "Raw main evidence",
        )
        self.assertEqual(
            perspectives["alternative_explanation"]["selected"]["result"]["response"],
            "Raw alternative evidence",
        )


if __name__ == "__main__":
    unittest.main()
