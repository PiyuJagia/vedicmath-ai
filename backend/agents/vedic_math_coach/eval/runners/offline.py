"""Offline deterministic evaluation suites (no Gemini / LangSmith required)."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from backend.agents.vedic_math_coach.eval.hint_disclosure import score_hint_reply_against_engine
from backend.agents.vedic_math_coach.eval.scoring import evaluate_case
from backend.agents.vedic_math_coach.eval.teaching_v2_scoring import run_offline_teaching_v2
from backend.knowledge.validation import validate_knowledge_pack, verify_examples_against_engines
from backend.nikhilam import DEVIATION_CONVENTION

EVAL_ROOT = Path(__file__).resolve().parents[1]
CALIBRATION_PATH = EVAL_ROOT / "calibration" / "known_bad_cases.json"


def run_calibration() -> dict[str, Any]:
    payload = json.loads(CALIBRATION_PATH.read_text(encoding="utf-8"))
    results = []
    for case in payload.get("cases") or []:
        # Wrap as evaluate_case expects case+response; must fail
        scored = evaluate_case(case, response=case["response"])
        # For calibration, evaluator succeeds when case fails content checks
        rejected = scored["passed"] is False
        results.append(
            {
                "id": case["id"],
                "failure_mode": case.get("failure_mode"),
                "rejected": rejected,
                "passed": rejected,
                "checks": scored.get("checks"),
            }
        )
    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    return {
        "suite": "calibration",
        "mode": "offline",
        "total": total,
        "passed": passed,
        "failed": total - passed,
        "pass_rate": round(passed / total, 3) if total else 0.0,
        "results": results,
    }


def run_hint_disclosure_smoke() -> dict[str, Any]:
    leak = score_hint_reply_against_engine(
        "The deviation is 2 — write 2 now.",
        sutra="nikhilam",
        difficulty="beginner",
        hint_level=1,
        question_key="deviation_a",
        a=98,
        b=93,
    )
    safe = score_hint_reply_against_engine(
        "Look at how far 98 sits from the base on the number line.",
        sutra="nikhilam",
        difficulty="beginner",
        hint_level=1,
        question_key="deviation_a",
        a=98,
        b=93,
    )
    checks = {
        "detects_leak": leak.get("passed") is False,
        "allows_safe": safe.get("passed") is True,
        "nikhilam_convention": DEVIATION_CONVENTION == "base - number",
    }
    passed = all(checks.values())
    return {
        "suite": "hint_disclosure",
        "mode": "offline",
        "total": 1,
        "passed": 1 if passed else 0,
        "failed": 0 if passed else 1,
        "pass_rate": 1.0 if passed else 0.0,
        "checks": checks,
    }


def run_knowledge_validation() -> dict[str, Any]:
    """Schema/example validation only — not a teaching-quality claim for RAG."""
    pack = validate_knowledge_pack()
    example_errors = verify_examples_against_engines()
    ok = bool(pack.get("ok")) and not example_errors
    return {
        "suite": "knowledge_validation",
        "mode": "offline",
        "total": 1,
        "passed": 1 if ok else 0,
        "failed": 0 if ok else 1,
        "pass_rate": 1.0 if ok else 0.0,
        "pack": pack,
        "example_errors": example_errors,
        "limitation": "Validates curated pack integrity; not live RAG teaching performance.",
    }


def run_offline_suites(*, include_knowledge: bool = True, include_rag_retrieval: bool = False) -> dict[str, Any]:
    started = time.perf_counter()
    suites: dict[str, Any] = {}

    t0 = time.perf_counter()
    teaching = run_offline_teaching_v2(write_report=True)
    suites["teaching_v2"] = {
        "summary": teaching["summary"],
        "duration_seconds": round(time.perf_counter() - t0, 3),
    }

    t0 = time.perf_counter()
    suites["calibration"] = run_calibration()
    suites["calibration"]["duration_seconds"] = round(time.perf_counter() - t0, 3)

    t0 = time.perf_counter()
    suites["hint_disclosure"] = run_hint_disclosure_smoke()
    suites["hint_disclosure"]["duration_seconds"] = round(time.perf_counter() - t0, 3)

    if include_knowledge:
        t0 = time.perf_counter()
        suites["knowledge_validation"] = run_knowledge_validation()
        suites["knowledge_validation"]["duration_seconds"] = round(time.perf_counter() - t0, 3)

    if include_rag_retrieval:
        from backend.agents.vedic_math_coach.eval.rag_scoring import run_rag_retrieval_eval
        import os

        # Retrieval suite requires feature flag for search, but is still offline lexical.
        os.environ.setdefault("VEDIC_KNOWLEDGE_RAG", "1")
        t0 = time.perf_counter()
        rag = run_rag_retrieval_eval(write_report=True)
        suites["rag_retrieval"] = {
            "summary": rag["summary"],
            "duration_seconds": round(time.perf_counter() - t0, 3),
            "limitation": "Offline retrieval metrics only; not live grounded teaching.",
        }

    # Aggregate headline (offline only) — case-level counters, not suite counts.
    components = []
    for name, suite in suites.items():
        summary = suite.get("summary") or suite
        if "pass_rate" in summary:
            n = int(summary.get("total") or 1)
            rate = float(summary.get("pass_rate") or 0)
            failed_n = int(summary.get("failed") or round((1.0 - rate) * n))
            passed_n = int(summary.get("passed") if summary.get("passed") is not None else max(0, n - failed_n))
            components.append((name, rate, n, passed_n, failed_n))

    total = sum(c[2] for c in components)
    passed = sum(c[3] for c in components)
    failed = sum(c[4] for c in components)
    weighted = sum(c[1] * c[2] for c in components)
    return {
        "mode": "offline",
        "suites": suites,
        "total": total,
        "passed": passed,
        "failed": failed,
        "skipped": 0,
        "cases_attempted": total,
        "cases_completed": total,
        "cases_failed": failed,
        "cases_skipped": 0,
        "pass_rate": round(weighted / total, 3) if total else 0.0,
        "aggregates": {
            name: (suite.get("summary") or suite).get("pass_rate") for name, suite in suites.items()
        },
        "by_category": {
            name: {
                "pass_rate": (suite.get("summary") or suite).get("pass_rate"),
                "n": (suite.get("summary") or suite).get("total"),
            }
            for name, suite in suites.items()
        },
        "evaluator_sensitivity_known_bad": suites.get("calibration", {}).get("pass_rate"),
        "duration_seconds": round(time.perf_counter() - started, 3),
        "limitations": [
            "Offline deterministic / labeled fixtures only.",
            "Not equivalent to live ADK→Gemini teaching performance.",
        ],
    }
