"""Tollgate 7B.5: evaluation infrastructure tests."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from backend.agents.vedic_math_coach.eval.observability.langsmith_trace import (
    langsmith_tracing_enabled,
    maybe_configure_langsmith,
    reset_langsmith_config_state_for_tests,
)
from backend.agents.vedic_math_coach.eval.observability.sanitize import (
    redact_secrets,
    sanitize_message,
    sanitize_tool_args,
)
from backend.agents.vedic_math_coach.eval.runners.compare import compare_manifests
from backend.agents.vedic_math_coach.eval.runners.manifest import (
    build_manifest,
    new_run_ids,
    write_manifest,
)
from backend.agents.vedic_math_coach.eval.runners.offline import run_calibration, run_offline_suites
from backend.agents.vedic_math_coach.eval.scoring import evaluate_case

EVAL = Path(__file__).resolve().parents[1] / "agents" / "vedic_math_coach" / "eval"
CATALOG = EVAL / "datasets" / "catalog.json"
CALIBRATION = EVAL / "calibration" / "known_bad_cases.json"


def test_dataset_catalog_lists_core_sets():
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    ids = {d["dataset_id"] for d in catalog["datasets"]}
    for needed in (
        "golden_adk_cases",
        "teaching_quality_cases",
        "teaching_v2_offline_fixtures",
        "judge_calibration",
        "rag_retrieval_cases",
        "human_review_30",
        "redteam_safety_50",
    ):
        assert needed in ids
    for dataset in catalog["datasets"]:
        rel = (EVAL / "datasets" / dataset["path"]).resolve()
        # path is relative to catalog file parent (datasets/) using ../
        path = (CATALOG.parent / dataset["path"]).resolve()
        assert path.is_file(), path
        assert dataset.get("version")
        assert dataset.get("grading")


def test_calibration_dataset_rejects_known_bad():
    payload = json.loads(CALIBRATION.read_text(encoding="utf-8"))
    assert len(payload["cases"]) >= 7
    for case in payload["cases"]:
        scored = evaluate_case(case, response=case["response"])
        assert scored["passed"] is False, case["id"]


def test_run_calibration_suite_pass_rate():
    summary = run_calibration()
    assert summary["pass_rate"] == 1.0


def test_sanitize_redacts_secrets_and_blocks_nonsynthetic():
    assert "[REDACTED_SECRET]" in redact_secrets("api_key=AIzaSySecretValueHere1234567890")
    assert sanitize_message("hello", synthetic=True) == "hello"
    assert sanitize_message("hello", synthetic=False) == "[REDACTED_NON_SYNTHETIC]"
    assert sanitize_tool_args({"GOOGLE_API_KEY": "secret", "a": 98})["GOOGLE_API_KEY"] == "[REDACTED]"


def test_langsmith_disabled_by_default(monkeypatch):
    reset_langsmith_config_state_for_tests()
    monkeypatch.delenv("LANGSMITH_TRACING", raising=False)
    monkeypatch.delenv("LANGSMITH_API_KEY", raising=False)
    assert langsmith_tracing_enabled() is False
    status = maybe_configure_langsmith(experiment_id="x", run_id="y")
    assert status["enabled"] is False


def test_langsmith_requires_api_key(monkeypatch):
    reset_langsmith_config_state_for_tests()
    monkeypatch.setenv("LANGSMITH_TRACING", "true")
    monkeypatch.delenv("LANGSMITH_API_KEY", raising=False)
    assert langsmith_tracing_enabled() is False


def test_manifest_is_immutable(tmp_path, monkeypatch):
    # Redirect archive root by monkeypatching new_run_ids destination via chdir? use build+write twice
    from backend.agents.vedic_math_coach.eval.runners import manifest as manifest_mod

    monkeypatch.setattr(manifest_mod, "ARCHIVE_ROOT", tmp_path / "runs")
    experiment_id, run_id, out_dir = new_run_ids("rishi-7b-baseline")
    m = build_manifest(
        experiment_id=experiment_id,
        run_id=run_id,
        mode="offline",
        dataset_ids=["judge_calibration"],
        rubric_version="7B.1",
        summary={"total": 1, "passed": 1, "failed": 0, "pass_rate": 1.0},
    )
    write_manifest(out_dir, m)
    with pytest.raises(FileExistsError):
        write_manifest(out_dir, m)


def test_compare_flags_mode_mismatch():
    a = {
        "experiment_id": "a",
        "run_id": "a1",
        "evaluation_mode": "offline",
        "dataset_catalog_sha256": "x",
        "evaluator_rubric_version": "7B.1",
        "gemini_model": "gemini-3.8-flash",
        "summary": {"pass_rate": 1.0, "aggregates": {"hint_quality": 1.0}},
    }
    b = {
        "experiment_id": "b",
        "run_id": "b1",
        "evaluation_mode": "live",
        "dataset_catalog_sha256": "x",
        "evaluator_rubric_version": "7B.1",
        "gemini_model": "gemini-3.8-flash",
        "summary": {"pass_rate": 0.5, "aggregates": {"hint_quality": 0.5}},
    }
    comparison = compare_manifests(a, b)
    assert comparison["compatible"] is False
    assert comparison["comparison_valid_for_attribution"] is False


def test_offline_runner_smoke():
    summary = run_offline_suites(include_knowledge=True, include_rag_retrieval=False)
    assert summary["mode"] == "offline"
    assert summary["suites"]["teaching_v2"]["summary"]["pass_rate"] == 1.0
    assert summary["suites"]["calibration"]["pass_rate"] == 1.0
    assert "Offline" in summary["limitations"][0] or "offline" in summary["limitations"][0].lower()
