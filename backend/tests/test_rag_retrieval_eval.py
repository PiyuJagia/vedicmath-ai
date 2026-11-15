"""Phase 7C offline RAG retrieval evaluation."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from backend.agents.vedic_math_coach.eval.rag_scoring import load_rag_cases, run_rag_retrieval_eval
from backend.knowledge.loader import clear_cache

BA_PATH = (
    Path(__file__).resolve().parents[1]
    / "agents"
    / "vedic_math_coach"
    / "eval"
    / "rag_before_after_fixtures.json"
)


@pytest.fixture(autouse=True)
def _enable_rag(monkeypatch):
    monkeypatch.setenv("VEDIC_KNOWLEDGE_RAG", "1")
    clear_cache()
    yield
    clear_cache()


def test_rag_dataset_has_at_least_30_cases():
    payload = load_rag_cases()
    assert len(payload["cases"]) >= 30
    sutras = {c.get("sutra_id") for c in payload["cases"] if c.get("sutra_id")}
    for needed in ("nikhilam", "urdhva", "ekadhikena", "yavadunam", "ekanyunena"):
        assert needed in sutras


def test_rag_retrieval_suite_meets_acceptance():
    report = run_rag_retrieval_eval(write_report=True)
    summary = report["summary"]
    assert summary["mode"] == "offline"
    assert summary["pass_rate"] >= 0.9, summary["failures"]
    assert summary["acceptance_passed"] is True, summary


def test_before_after_fixtures_are_labeled_offline_only():
    payload = json.loads(BA_PATH.read_text(encoding="utf-8"))
    assert payload["meta"]["mode"] == "offline_simulated_before_after"
    assert "NOT live" in payload["meta"]["note"] or "not live" in payload["meta"]["note"].lower()
    assert len(payload["prompts"]) >= 3
    for item in payload["prompts"]:
        assert item["offline_verdict"]["live_comparison"] == "pending_credits"
        assert item["B_with_rag"]["retrieval_concept_ids"]
        assert item["A_baseline_without_rag"]["issues"]
