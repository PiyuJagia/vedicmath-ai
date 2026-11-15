"""Optional live run of teaching-quality cases (Tollgate teaching intelligence audit)."""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.agents.gemini_connectivity import load_llm_env
from backend.agents.vedic_math_coach.eval.scoring import evaluate_case, summarize_results
from backend.agents.vedic_math_coach.handoff.runtime import reset_runtime_for_tests
from backend.agents.vedic_math_coach.tools.store import clear_store
from backend.main import app
from backend.tests.live_gate import LIVE_SKIP_REASON, ENV_PATH, live_gemini_ready

REPO = Path(__file__).resolve().parents[2]
ENV = ENV_PATH
TQ_PATH = REPO / "backend" / "agents" / "vedic_math_coach" / "eval" / "teaching_quality_cases.json"
REPORT = REPO / "backend" / "agents" / "vedic_math_coach" / "eval" / "teaching_quality_report.json"


@pytest.fixture(autouse=True)
def _clean():
    clear_store()
    reset_runtime_for_tests()
    yield
    clear_store()
    reset_runtime_for_tests()


def _live_ready() -> bool:
    return live_gemini_ready()


live = pytest.mark.skipif(not _live_ready(), reason=LIVE_SKIP_REASON)


def _chat(client: TestClient, session_id: str, message: str, **extra):
    return client.post("/coach/chat", json={"session_id": session_id, "message": message, **extra})


@live
def test_teaching_quality_live_suite():
    load_llm_env(ENV)
    cases = json.loads(TQ_PATH.read_text(encoding="utf-8"))
    client = TestClient(app)
    results = []
    traces = []

    for case in cases:
        try:
            if case.get("turns"):
                session_id = client.post("/coach/sessions").json()["session_id"]
                bodies = []
                for turn in case["turns"]:
                    kwargs = {}
                    if turn.get("context"):
                        kwargs["context"] = turn["context"]
                    response = _chat(client, session_id, turn["message"], **kwargs)
                    assert response.status_code == 200, response.text
                    bodies.append(response.json())
                scored = evaluate_case(case, responses=bodies)
                results.append(scored)
                traces.append({"id": case["id"], "turns": bodies})
                continue

            session_id = client.post("/coach/sessions").json()["session_id"]
            kwargs = {}
            if case.get("context"):
                kwargs["context"] = case["context"]
            response = _chat(client, session_id, case["message"], **kwargs)
            if response.status_code != 200:
                results.append(evaluate_case(case, error=f"HTTP {response.status_code}"))
                continue
            body = response.json()
            judge_score = None
            if (case.get("expect") or {}).get("judge_explanation"):
                from backend.agents.vedic_math_coach.eval.scoring import judge_explanation_grounding
                from backend.agents.vedic_math_coach.tools.store import get_calculation

                calc = body.get("calculation") or {}
                record = get_calculation(calc.get("calculation_id")) if calc.get("calculation_id") else None
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
                    "text": body.get("message", {}).get("text"),
                    "speaker": body.get("message", {}).get("character"),
                    "tools_used": body.get("tools_used"),
                }
            )
        except Exception as error:  # noqa: BLE001
            results.append(evaluate_case(case, error=str(error)))

    summary = summarize_results(results)
    REPORT.write_text(json.dumps({"summary": summary, "results": results, "traces": traces[:8]}, indent=2), encoding="utf-8")
    assert summary["total"] >= 30
    # Soft gate for teaching suite — document failures rather than requiring perfection on first audit.
    assert summary["pass_rate"] >= 0.6, summary
