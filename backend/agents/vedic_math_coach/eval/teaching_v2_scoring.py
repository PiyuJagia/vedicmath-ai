"""Offline Teaching Intelligence Evaluation v2 (Phase 7B)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .hint_disclosure import score_hint_reply_against_engine
from .intermediate_claims import score_intermediate_claims
from .rubrics import (
    PASS_THRESHOLD,
    apply_pass_gate,
    heuristic_age_appropriateness,
    heuristic_conceptual_cues,
    heuristic_context_relevance,
    heuristic_fake_history,
    heuristic_misconception_diagnosis,
    heuristic_persona,
    heuristic_unsupported_abstention,
    score_to_normalized,
)
from .scoring import _score_expect

FIXTURES_PATH = Path(__file__).with_name("offline_fixtures.json")
REPORT_PATH = Path(__file__).with_name("teaching_v2_offline_report.json")


def load_offline_fixtures() -> dict[str, Any]:
    return json.loads(FIXTURES_PATH.read_text(encoding="utf-8"))


def _evaluate_single_response(expect: dict[str, Any], response: dict[str, Any], hint: dict[str, Any] | None) -> dict[str, Any]:
    text = ((response.get("message") or {}).get("text")) or ""
    speaker = ((response.get("message") or {}).get("character") or {}).get("id")

    # Legacy deterministic expect checks
    checks = _score_expect(expect, response)

    rubric_scores: dict[str, int | None] = {
        "mathematical_grounding": None,
        "intermediate_step_accuracy": None,
        "conceptual_understanding": None,
        "age_appropriateness": None,
        "misconception_diagnosis": None,
        "hint_quality": None,
        "persona_appropriateness": heuristic_persona(expect.get("speaker"), speaker),
        "context_relevance": None,
        "next_step_guidance": None,
        "unsupported_abstention": heuristic_unsupported_abstention(text, expect),
        "instructional_usefulness": None,
    }

    notes: list[str] = []

    # Arithmetic / sutra grounding
    if "result" in expect and expect["result"] is not None:
        calc = response.get("calculation") or {}
        arith_ok = calc.get("result") == expect["result"]
        sutra_ok = True
        if expect.get("sutra"):
            sutra_ok = calc.get("sutra_id") == expect["sutra"]
        rubric_scores["mathematical_grounding"] = 4 if arith_ok and sutra_ok else 0

    # Intermediate equations
    if expect.get("check_intermediate_equations"):
        inter = score_intermediate_claims(text)
        rubric_scores["intermediate_step_accuracy"] = inter["score"]
        notes.extend(inter["notes"])
        if expect.get("fail_if_incorrect_equations") and inter["incorrect"]:
            checks["intermediate_equations"] = False
        elif inter["passed"] is True:
            checks["intermediate_equations"] = True
        elif inter["passed"] is False:
            checks["intermediate_equations"] = False

    if expect.get("check_conceptual_cues"):
        rubric_scores["conceptual_understanding"] = heuristic_conceptual_cues(text, expect)

    if expect.get("check_age_appropriateness") or (
        expect.get("must_fail") and any(w in text.lower() for w in ("idiot", "stupid"))
    ):
        rubric_scores["age_appropriateness"] = heuristic_age_appropriateness(text)
        if rubric_scores["age_appropriateness"] is not None and rubric_scores["age_appropriateness"] < PASS_THRESHOLD:
            checks["age_appropriate"] = False
        elif rubric_scores["age_appropriateness"] is not None:
            checks["age_appropriate"] = True
    elif expect.get("check_age_good"):
        rubric_scores["age_appropriateness"] = heuristic_age_appropriateness(text)
        checks["age_appropriate"] = rubric_scores["age_appropriateness"] >= PASS_THRESHOLD

    if expect.get("check_misconception"):
        rubric_scores["misconception_diagnosis"] = heuristic_misconception_diagnosis(text, expect)
        if rubric_scores["misconception_diagnosis"] is not None:
            checks["misconception"] = rubric_scores["misconception_diagnosis"] >= PASS_THRESHOLD

    if expect.get("check_context_relevance"):
        rubric_scores["context_relevance"] = heuristic_context_relevance(text, expect)
        if rubric_scores["context_relevance"] is not None:
            checks["context_relevance"] = rubric_scores["context_relevance"] >= PASS_THRESHOLD

    if expect.get("check_no_fake_history"):
        rubric_scores["instructional_usefulness"] = heuristic_fake_history(text, expect)
        if rubric_scores["instructional_usefulness"] == 0:
            checks["no_fake_history"] = False
        else:
            checks["no_fake_history"] = True

    if expect.get("text_contains_all") and "practice" in [s.lower() for s in expect.get("text_contains_all") or []]:
        rubric_scores["next_step_guidance"] = 4 if checks.get("text_contains") else 0

    if expect.get("check_misleading_carry"):
        if "always carry when you feel" in text.lower():
            checks["misleading_carry"] = False
            rubric_scores["conceptual_understanding"] = 0
        else:
            checks["misleading_carry"] = True

    # Hint disclosure (engine-authored)
    if expect.get("check_hint_disclosure") and hint:
        disclosure = score_hint_reply_against_engine(
            text,
            sutra=hint["sutra"],
            difficulty=hint.get("difficulty") or "beginner",
            hint_level=int(hint["hint_level"]),
            question_key=hint.get("question_key"),
            a=hint.get("a"),
            b=hint.get("b"),
            number=hint.get("number"),
        )
        rubric_scores["hint_quality"] = disclosure.get("hint_quality_score")
        checks["hint_disclosure"] = bool(disclosure.get("passed"))
        notes.extend(disclosure.get("notes") or [])
        if disclosure.get("leaked_tokens"):
            notes.append(f"leaked_tokens={disclosure['leaked_tokens']}")
        if disclosure.get("paraphrase_leaks"):
            notes.append(f"paraphrase_leaks={disclosure['paraphrase_leaks']}")

    # Safe language exclusions already in checks
    if expect.get("text_excludes_any") or expect.get("forbid_claiming_launch"):
        if checks.get("safe_language") is False:
            rubric_scores["unsupported_abstention"] = rubric_scores["unsupported_abstention"] or 0
            if rubric_scores["unsupported_abstention"] is None:
                rubric_scores["unsupported_abstention"] = 0

    # must_fail: evaluator sensitivity — the fixture is labeled bad
    must_fail = bool(expect.get("must_fail"))
    deterministic_pass = all(checks.values()) if checks else True
    rubric_pass = apply_pass_gate(rubric_scores)

    if must_fail:
        # Known-bad fixture: evaluator succeeds when it REJECTS the response
        rejected = (not deterministic_pass) or (not rubric_pass)
        passed = rejected
        notes.append("known-bad fixture: evaluator must reject" if rejected else "FAIL: known-bad accepted")
    else:
        passed = deterministic_pass and rubric_pass

    metrics = {
        key: score_to_normalized(val) for key, val in rubric_scores.items() if val is not None
    }
    return {
        "checks": checks,
        "rubric_scores": rubric_scores,
        "metrics": metrics,
        "passed": passed,
        "notes": notes,
        "must_fail": must_fail,
    }


def evaluate_fixture(fixture: dict[str, Any]) -> dict[str, Any]:
    if fixture.get("turns"):
        checks: dict[str, bool] = {}
        notes: list[str] = []
        metrics: dict[str, list[float]] = {}
        passed_all = True
        for idx, turn in enumerate(fixture["turns"]):
            scored = _evaluate_single_response(turn.get("expect") or {}, turn["response"], turn.get("hint"))
            for k, v in scored["checks"].items():
                checks[f"t{idx}.{k}"] = v
            for k, v in (scored["metrics"] or {}).items():
                metrics.setdefault(k, []).append(v)
            notes.extend([f"t{idx}:{n}" for n in scored["notes"]])
            passed_all = passed_all and scored["passed"]
        flat_metrics = {k: round(sum(vals) / len(vals), 3) for k, vals in metrics.items()}
        return {
            "id": fixture["id"],
            "category": fixture.get("category"),
            "label": fixture.get("label"),
            "source": fixture.get("source"),
            "mode": "offline",
            "passed": passed_all,
            "checks": checks,
            "rubric_scores": {},
            "metrics": flat_metrics,
            "notes": notes,
        }

    scored = _evaluate_single_response(fixture.get("expect") or {}, fixture["response"], fixture.get("hint"))
    return {
        "id": fixture["id"],
        "category": fixture.get("category"),
        "label": fixture.get("label"),
        "source": fixture.get("source"),
        "mode": "offline",
        "passed": scored["passed"],
        "checks": scored["checks"],
        "rubric_scores": scored["rubric_scores"],
        "metrics": scored["metrics"],
        "notes": scored["notes"],
        "must_fail": scored["must_fail"],
    }


def summarize_v2(results: list[dict[str, Any]]) -> dict[str, Any]:
    total = len(results)
    passed = sum(1 for r in results if r.get("passed"))
    by_category: dict[str, dict[str, Any]] = {}
    by_label: dict[str, dict[str, int]] = {"good": {"n": 0, "passed": 0}, "bad": {"n": 0, "passed": 0}}
    metric_buckets: dict[str, list[float]] = {}

    for result in results:
        cat = result.get("category") or "unknown"
        bucket = by_category.setdefault(cat, {"n": 0, "passed": 0, "failures": []})
        bucket["n"] += 1
        if result.get("passed"):
            bucket["passed"] += 1
        else:
            bucket["failures"].append(result["id"])

        label = result.get("label") or "unknown"
        if label in by_label:
            by_label[label]["n"] += 1
            if result.get("passed"):
                by_label[label]["passed"] += 1

        # Content-quality aggregates use known-good fixtures only (bad fixtures are for sensitivity).
        if result.get("label") == "good":
            for key, value in (result.get("metrics") or {}).items():
                if value is None:
                    continue
                metric_buckets.setdefault(key, []).append(float(value))

    category_rates = {
        cat: {
            "n": data["n"],
            "passed": data["passed"],
            "pass_rate": round(data["passed"] / data["n"], 3) if data["n"] else 0.0,
            "failures": data["failures"],
        }
        for cat, data in by_category.items()
    }

    # Evaluator sensitivity: fraction of known-bad fixtures correctly rejected
    bad = by_label["bad"]
    sensitivity = round(bad["passed"] / bad["n"], 3) if bad["n"] else None
    # Known-good fixtures accepted
    good = by_label["good"]
    specificity = round(good["passed"] / good["n"], 3) if good["n"] else None

    aggregates = {
        key: round(sum(vals) / len(vals), 3) for key, vals in metric_buckets.items() if vals
    }
    aggregates_note = "aggregates computed on label=good fixtures only"

    return {
        "mode": "offline",
        "total": total,
        "passed": passed,
        "failed": total - passed,
        "pass_rate": round(passed / total, 3) if total else 0.0,
        "by_category": category_rates,
        "evaluator_sensitivity_known_bad": sensitivity,
        "evaluator_acceptance_known_good": specificity,
        "aggregates": aggregates,
        "aggregates_note": aggregates_note,
        "failures": [r["id"] for r in results if not r.get("passed")],
        "pass_threshold_rubric": PASS_THRESHOLD,
        "live_llm_judge": "optional_not_run_offline",
    }


def run_offline_teaching_v2(*, write_report: bool = True) -> dict[str, Any]:
    payload = load_offline_fixtures()
    fixtures = payload.get("fixtures") or []
    results = [evaluate_fixture(fx) for fx in fixtures]
    summary = summarize_v2(results)
    report = {
        "meta": payload.get("meta"),
        "summary": summary,
        "results": results,
    }
    if write_report:
        REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report
