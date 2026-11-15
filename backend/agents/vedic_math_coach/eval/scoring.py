"""Deterministic scoring for coach golden cases (+ optional LLM explanation judge)."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

GOLDEN_PATH = Path(__file__).with_name("golden_cases.json")


def load_golden_cases() -> list[dict[str, Any]]:
    return json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))


def _norm_text(text: str) -> str:
    return re.sub(r"[,\s]+", "", (text or "").lower())


def _has_result_in_text(text: str, result: int) -> bool:
    return str(result) in _norm_text(text)


def evaluate_case(
    case: dict[str, Any],
    *,
    response: dict[str, Any] | None = None,
    responses: list[dict[str, Any]] | None = None,
    judge_score: float | None = None,
    error: str | None = None,
) -> dict[str, Any]:
    """Score one golden case. Arithmetic checks are deterministic only."""
    checks: dict[str, bool] = {}
    notes: list[str] = []

    if error:
        return {
            "id": case["id"],
            "category": case.get("category"),
            "passed": False,
            "checks": {"no_runtime_error": False},
            "notes": [error],
            "metrics": {},
        }

    turns_expect = case.get("turns")
    if turns_expect:
        assert responses is not None
        passed_all = True
        for idx, turn in enumerate(turns_expect):
            expect = turn.get("expect") or {}
            body = responses[idx]
            turn_checks = _score_expect(expect, body)
            for key, ok in turn_checks.items():
                checks[f"t{idx}.{key}"] = ok
                passed_all = passed_all and ok
        return {
            "id": case["id"],
            "category": case.get("category"),
            "passed": passed_all,
            "checks": checks,
            "notes": notes,
            "metrics": _metrics_from_checks(checks, judge_score),
        }

    assert response is not None
    expect = case.get("expect") or {}
    checks = _score_expect(expect, response)
    if expect.get("judge_explanation"):
        if judge_score is None:
            checks["explanation_judge"] = False
            notes.append("missing explanation judge score")
        else:
            checks["explanation_judge"] = judge_score >= 0.7
            notes.append(f"judge_score={judge_score:.2f}")

    passed = all(checks.values()) if checks else False
    return {
        "id": case["id"],
        "category": case.get("category"),
        "passed": passed,
        "checks": checks,
        "notes": notes,
        "metrics": _metrics_from_checks(checks, judge_score),
        "tools_used": list(response.get("tools_used") or []),
        "speaker": (response.get("message") or {}).get("character", {}).get("id"),
        "actions": [a.get("type") for a in (response.get("actions") or [])],
    }


def _score_expect(expect: dict[str, Any], body: dict[str, Any]) -> dict[str, bool]:
    checks: dict[str, bool] = {}
    message = body.get("message") or {}
    text = message.get("text") or ""
    character = (message.get("character") or {}).get("id")
    tools = set(body.get("tools_used") or [])
    actions = body.get("actions") or []
    action_types = {a.get("type") for a in actions}
    calculation = body.get("calculation")

    if expect.get("tools_any"):
        checks["tool_selection"] = any(t in tools for t in expect["tools_any"])
    if expect.get("tools_forbidden"):
        checks["tools_forbidden"] = not any(t in tools for t in expect["tools_forbidden"])
    if "result" in expect and expect["result"] is not None:
        checks["arithmetic"] = (
            calculation is not None and calculation.get("result") == expect["result"]
        )
        if expect.get("result_in_text"):
            checks["result_grounded_in_text"] = _has_result_in_text(text, expect["result"])
    if expect.get("no_verified_result"):
        checks["no_verified_result"] = calculation is None or calculation.get("result") is None
    if expect.get("sutra") and calculation is not None:
        checks["sutra"] = calculation.get("sutra_id") == expect["sutra"]
    if expect.get("speaker"):
        checks["persona"] = character == expect["speaker"]
    if expect.get("action"):
        checks["animation_action"] = expect["action"] in action_types
    if expect.get("no_action"):
        checks["no_animation_action"] = len(actions) == 0
    if expect.get("lesson_present"):
        checks["lesson_present"] = body.get("lesson") is not None
    if expect.get("calculation_null"):
        checks["calculation_null"] = calculation is None
    if expect.get("text_contains_all"):
        lowered = text.lower()
        checks["text_contains"] = all(s.lower() in lowered for s in expect["text_contains_all"])
    if expect.get("text_excludes_any") or expect.get("forbid_claiming_launch"):
        lowered = text.lower()
        banned = list(expect.get("text_excludes_any") or [])
        if expect.get("forbid_claiming_launch"):
            banned.extend(["i have launched", "i launched", "animation is now playing"])
        checks["safe_language"] = not any(b in lowered for b in banned)
    return checks


def _metrics_from_checks(checks: dict[str, bool], judge_score: float | None) -> dict[str, Any]:
    metrics: dict[str, Any] = {}
    mapping = {
        "tool_selection": "tool_selection",
        "arithmetic": "arithmetic",
        "result_grounded_in_text": "explanation_grounding",
        "persona": "persona",
        "animation_action": "animation_action",
        "no_animation_action": "animation_action",
        "safe_language": "safety",
        "calculation_null": "session_isolation",
        "tools_forbidden": "safety",
        "no_verified_result": "safety",
    }
    for check_name, metric_name in mapping.items():
        if check_name in checks:
            metrics.setdefault(metric_name, [])
            metrics[metric_name].append(1.0 if checks[check_name] else 0.0)
    if "explanation_judge" in checks:
        metrics.setdefault("explanation_judge", [])
        metrics["explanation_judge"].append(
            judge_score if judge_score is not None else (1.0 if checks["explanation_judge"] else 0.0)
        )
    return {k: (sum(v) / len(v) if v else None) for k, v in metrics.items()}


def summarize_results(results: list[dict[str, Any]]) -> dict[str, Any]:
    total = len(results)
    passed = sum(1 for r in results if r.get("passed"))
    buckets: dict[str, list[float]] = {}
    for result in results:
        for key, value in (result.get("metrics") or {}).items():
            if value is None:
                continue
            buckets.setdefault(key, []).append(float(value))
    aggregates = {
        key: round(sum(vals) / len(vals), 3) if vals else None for key, vals in buckets.items()
    }
    return {
        "total": total,
        "passed": passed,
        "failed": total - passed,
        "pass_rate": round(passed / total, 3) if total else 0.0,
        "aggregates": aggregates,
        "failures": [r["id"] for r in results if not r.get("passed")],
    }


async def judge_explanation_grounding(
    *,
    learner_message: str,
    coach_text: str,
    teaching_steps: list[Any],
    verified_result: int,
) -> float:
    """LLM-as-judge for explanation quality only — never for arithmetic truth."""
    from backend.agents.gemini_connectivity import ask_gemini, load_llm_env, require_ai_studio_config

    load_llm_env()
    require_ai_studio_config()

    steps_preview = json.dumps(teaching_steps[:4], ensure_ascii=True)[:2500]
    prompt = f"""You score a Vedic Math coach explanation.
Arithmetic correctness is ALREADY verified externally as {verified_result}. Do NOT judge whether the number is right.

Score from 0.0 to 1.0 whether the coach explanation is grounded in the engine teaching steps (paraphrase OK) and does not invent conflicting method steps.

Learner: {learner_message}
Coach: {coach_text}
Engine teaching_steps (sample): {steps_preview}

Reply with ONLY a JSON object: {{"score": 0.0, "reason": "..."}}"""

    raw = await ask_gemini(prompt)
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return 0.0
    try:
        payload = json.loads(match.group(0))
        return max(0.0, min(1.0, float(payload.get("score", 0.0))))
    except Exception:  # noqa: BLE001
        return 0.0
