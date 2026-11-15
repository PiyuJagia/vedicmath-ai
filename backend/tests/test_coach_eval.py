"""Tollgate 6B: expanded golden-set evaluation for the live ADK coach."""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.agents.gemini_connectivity import load_llm_env
from backend.agents.vedic_math_coach.eval.scoring import (
    evaluate_case,
    judge_explanation_grounding,
    load_golden_cases,
    summarize_results,
)
from backend.agents.vedic_math_coach.handoff.runtime import reset_runtime_for_tests
from backend.agents.vedic_math_coach.tools.calculate_sutra import calculate_sutra
from backend.agents.vedic_math_coach.tools.store import clear_store, get_calculation
from backend.main import app
from backend.tests.live_gate import LIVE_SKIP_REASON, ENV_PATH, live_gemini_ready

REPO_ROOT = Path(__file__).resolve().parents[2]
REPORT_PATH = REPO_ROOT / "backend" / "agents" / "vedic_math_coach" / "eval" / "last_report.json"


@pytest.fixture(autouse=True)
def _clean():
    clear_store()
    reset_runtime_for_tests()
    yield
    clear_store()
    reset_runtime_for_tests()


@pytest.fixture()
def client():
    return TestClient(app)


def _live_ready() -> bool:
    return live_gemini_ready()


live = pytest.mark.skipif(not _live_ready(), reason=LIVE_SKIP_REASON)


def test_golden_dataset_has_at_least_20_cases():
    cases = load_golden_cases()
    assert len(cases) >= 30
    categories = {c.get("category") for c in cases}
    for needed in ("math", "persona", "animation", "safety", "multi_turn", "explanation", "hinting"):
        assert needed in categories
    assert any(c["id"] == "multi_screen_theory_practice_theory" for c in cases)
    assert any(c["id"] == "reject_wrong_product_without_tool_authority" for c in cases)
    assert any(c["id"] == "rabbit_hint_no_early_answer_leak" for c in cases)
    assert any(c["id"] == "unsupported_anurupyena_not_app_feature" for c in cases)


def test_scoring_arithmetic_is_deterministic():
    case = {
        "id": "unit",
        "category": "math",
        "expect": {"result": 9506, "result_in_text": True, "action": "watch_animation", "tools_any": ["calculate_sutra"]},
    }
    body = {
        "message": {"text": "The product is 9506.", "character": {"id": "boy_coach"}},
        "calculation": {"result": 9506, "sutra_id": "nikhilam", "calculation_id": "x"},
        "actions": [{"type": "watch_animation"}],
        "tools_used": ["calculate_sutra"],
    }
    scored = evaluate_case(case, response=body)
    assert scored["passed"] is True
    assert scored["metrics"]["arithmetic"] == 1.0


def test_scoring_rejects_incorrect_explanation_text():
    """Deliberately wrong coach text must fail deterministic grounding checks."""
    case = {
        "id": "bad_explain",
        "category": "safety",
        "expect": {
            "result": 9506,
            "result_in_text": True,
            "tools_any": ["calculate_sutra"],
            "text_excludes_any": ["9507 is correct"],
        },
    }
    body = {
        "message": {
            "text": "Yes, 9507 is correct for 98 × 97.",
            "character": {"id": "boy_coach"},
        },
        "calculation": {"result": 9506, "sutra_id": "nikhilam", "calculation_id": "x"},
        "actions": [],
        "tools_used": ["calculate_sutra"],
    }
    scored = evaluate_case(case, response=body)
    assert scored["passed"] is False
    assert scored["checks"].get("result_grounded_in_text") is False
    assert scored["checks"].get("safe_language") is False


def _chat(client: TestClient, session_id: str, message: str, **extra):
    payload = {"session_id": session_id, "message": message, **extra}
    response = client.post("/coach/chat", json=payload)
    return response


@live
def test_golden_evaluation_suite(client):
    load_llm_env(ENV_PATH)
    cases = load_golden_cases()
    results: list[dict] = []
    traces: list[dict] = []

    for case in cases:
        try:
            if case.get("turns"):
                session_id = client.post("/coach/sessions").json()["session_id"]
                bodies = []
                for turn in case["turns"]:
                    turn_kwargs = {}
                    if turn.get("context"):
                        turn_kwargs["context"] = turn["context"]
                    response = _chat(client, session_id, turn["message"], **turn_kwargs)
                    assert response.status_code == 200, response.text
                    bodies.append(response.json())
                scored = evaluate_case(case, responses=bodies)
                results.append(scored)
                traces.append({"id": case["id"], "turns": bodies})
                continue

            session_id = client.post("/coach/sessions").json()["session_id"]
            kwargs = {}
            if case.get("animation_intent"):
                kwargs["animation_intent"] = case["animation_intent"]
            if case.get("context"):
                kwargs["context"] = case["context"]
            # Teaching / hint cases may carry structured context (Phase 7A).

            if case.get("setup") == "calculate_nikhilam_98_97" or case.get("use_prior_calculation_id"):
                calc = calculate_sutra("nikhilam", "beginner", a=98, b=97, session_id=session_id)
                # Warm the chat session with a quick greeting so ADK state exists.
                _chat(client, session_id, "Hello briefly as Boy Coach.")
                if case.get("use_prior_calculation_id"):
                    kwargs["calculation_id"] = calc["calculation_id"]

            if case.get("setup") == "foreign_calculation" or case.get("use_foreign_calculation_id"):
                other = client.post("/coach/sessions").json()["session_id"]
                foreign = calculate_sutra("nikhilam", "beginner", a=98, b=97, session_id=other)
                kwargs["calculation_id"] = foreign["calculation_id"]
                if case.get("animation_intent"):
                    kwargs["animation_intent"] = case["animation_intent"]

            response = _chat(client, session_id, case["message"], **kwargs)
            if response.status_code != 200:
                results.append(evaluate_case(case, error=f"HTTP {response.status_code}: {response.text[:300]}"))
                continue
            body = response.json()
            assert os.environ["GOOGLE_API_KEY"] not in (body.get("message") or {}).get("text", "")

            judge_score = None
            if (case.get("expect") or {}).get("judge_explanation"):
                calc = body.get("calculation") or {}
                calc_id = calc.get("calculation_id")
                record = get_calculation(calc_id) if calc_id else None
                steps = (record or {}).get("teaching_steps") or []
                judge_score = __import__("asyncio").run(
                    judge_explanation_grounding(
                        learner_message=case["message"],
                        coach_text=body["message"]["text"],
                        teaching_steps=steps,
                        verified_result=int(case["expect"]["result"]),
                    )
                )

            scored = evaluate_case(case, response=body, judge_score=judge_score)
            results.append(scored)
            traces.append(
                {
                    "id": case["id"],
                    "tools_used": body.get("tools_used"),
                    "speaker": body.get("message", {}).get("character"),
                    "actions": body.get("actions"),
                    "calculation": body.get("calculation"),
                    "text": body.get("message", {}).get("text"),
                }
            )
        except Exception as error:  # noqa: BLE001
            results.append(evaluate_case(case, error=str(error)))

    summary = summarize_results(results)
    REPORT_PATH.write_text(
        json.dumps({"summary": summary, "results": results, "sample_traces": traces[:5]}, indent=2),
        encoding="utf-8",
    )

    # Soft gate: report always written; fail the test if pass rate collapses.
    assert summary["total"] >= 20
    assert summary["pass_rate"] >= 0.7, summary
    # Arithmetic cases must be near-perfect when tools are used.
    arith = summary["aggregates"].get("arithmetic")
    if arith is not None:
        assert arith >= 0.9, summary["aggregates"]
