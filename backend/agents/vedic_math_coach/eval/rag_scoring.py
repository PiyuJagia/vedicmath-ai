"""Offline scoring for Phase 7C retrieval golden cases."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from backend.knowledge.retrieval import search_knowledge
from backend.knowledge.schemas import CONTENT_VERSION

CASES_PATH = Path(__file__).with_name("rag_retrieval_cases.json")
REPORT_PATH = Path(__file__).with_name("rag_retrieval_report.json")


def load_rag_cases() -> dict[str, Any]:
    return json.loads(CASES_PATH.read_text(encoding="utf-8"))


def _score_case(case: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    expect = case.get("expect") or {}
    checks: dict[str, bool] = {}
    notes: list[str] = []

    status = result.get("status")
    if "status" in expect:
        checks["status"] = status == expect["status"]

    if expect.get("matched_concept_ids") is not None:
        checks["exact_ids"] = result.get("matched_concept_ids") == expect["matched_concept_ids"]

    if expect.get("any_concept_ids"):
        matched = set(result.get("matched_concept_ids") or [])
        checks["any_ids"] = bool(matched.intersection(expect["any_concept_ids"]))

    if expect.get("must_include_sutra"):
        sutra = expect["must_include_sutra"]
        excerpts = result.get("approved_excerpts") or []
        checks["sutra"] = any(ex.get("sutra_id") == sutra for ex in excerpts) or any(
            sutra in (cid or "") for cid in (result.get("matched_concept_ids") or [])
        )

    if expect.get("retrieval_method"):
        checks["method"] = result.get("retrieval_method") == expect["retrieval_method"]

    if expect.get("excerpt_mentions"):
        blob = json.dumps(result.get("approved_excerpts") or []).lower()
        checks["mentions"] = all(m.lower() in blob for m in expect["excerpt_mentions"])

    if expect.get("has_engine_example"):
        examples = []
        for ex in result.get("approved_excerpts") or []:
            examples.extend(ex.get("examples") or [])
        checks["engine_example"] = any(e.get("engine_verified") for e in examples)

    if expect.get("content_version_prefix"):
        ver = result.get("content_version") or ""
        checks["version"] = ver.startswith(expect["content_version_prefix"])

    if expect.get("no_fabricated_sources"):
        refs = result.get("source_references") or []
        checks["sources_present"] = bool(refs) if status == "ok" else True
        # All refs must include document_id from curated pack
        checks["sources_structured"] = all(isinstance(r, dict) and r.get("document_id") for r in refs)

    passed = all(checks.values()) if checks else False
    if not passed:
        notes.append(f"checks={checks}")
    return {
        "id": case["id"],
        "category": case.get("category"),
        "sutra_id": case.get("sutra_id"),
        "passed": passed,
        "checks": checks,
        "status": status,
        "matched_concept_ids": result.get("matched_concept_ids"),
        "latency_ms": result.get("latency_ms"),
        "notes": notes,
    }


def run_rag_retrieval_eval(*, write_report: bool = True) -> dict[str, Any]:
    payload = load_rag_cases()
    cases = payload.get("cases") or []
    results = []
    for case in cases:
        query = dict(case.get("query") or {})
        # Allow top-level difficulty/sutra defaults
        query.setdefault("difficulty", case.get("difficulty"))
        if "sutra_id" not in query and case.get("sutra_id"):
            query["sutra_id"] = case["sutra_id"]
        result = search_knowledge(**{k: v for k, v in query.items() if v is not None})
        results.append(_score_case(case, result))

    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    by_category: dict[str, dict[str, Any]] = {}
    for r in results:
        cat = r.get("category") or "unknown"
        bucket = by_category.setdefault(cat, {"n": 0, "passed": 0, "failures": []})
        bucket["n"] += 1
        if r["passed"]:
            bucket["passed"] += 1
        else:
            bucket["failures"].append(r["id"])

    # Metrics
    labeled_hits = [r for r in results if (r.get("status") == "ok")]
    expected_ok = [
        c
        for c, r in zip(cases, results)
        if (c.get("expect") or {}).get("status") == "ok"
    ]
    hit_rate = (
        sum(1 for c, r in zip(cases, results) if (c.get("expect") or {}).get("status") == "ok" and r["passed"])
        / max(1, len(expected_ok))
    )
    # Precision@1 proxy: top matched id in any_concept_ids / matched_concept_ids when labeled
    p_at_1_hits = 0
    p_at_1_n = 0
    for case, result in zip(cases, results):
        expect = case.get("expect") or {}
        if expect.get("status") != "ok":
            continue
        matched = result.get("matched_concept_ids") or []
        if not matched:
            continue
        p_at_1_n += 1
        allowed = set(expect.get("any_concept_ids") or expect.get("matched_concept_ids") or matched)
        if matched[0] in allowed or (
            expect.get("must_include_sutra") and expect["must_include_sutra"] in (matched[0] or "")
        ):
            p_at_1_hits += 1
        elif expect.get("must_include_sutra"):
            # Accept if first excerpt sutra matches
            excerpts = []  # scored result doesn't keep excerpts; use pass flag
            if result["passed"]:
                p_at_1_hits += 1
        elif result["passed"] and matched[0] in allowed:
            p_at_1_hits += 1

    precision_at_1 = round(p_at_1_hits / max(1, p_at_1_n), 3)
    abstain_cases = [c for c in cases if (c.get("expect") or {}).get("status") in {"not_found", "unsupported_sutra"}]
    abstain_ok = sum(
        1
        for c, r in zip(cases, results)
        if (c.get("expect") or {}).get("status") in {"not_found", "unsupported_sutra"} and r["passed"]
    )
    latencies = [r["latency_ms"] for r in results if r.get("latency_ms") is not None]

    summary = {
        "mode": "offline",
        "content_version": CONTENT_VERSION,
        "total": total,
        "passed": passed,
        "failed": total - passed,
        "pass_rate": round(passed / total, 3) if total else 0.0,
        "by_category": {
            cat: {
                "n": data["n"],
                "passed": data["passed"],
                "pass_rate": round(data["passed"] / data["n"], 3) if data["n"] else 0.0,
                "failures": data["failures"],
            }
            for cat, data in by_category.items()
        },
        "metrics": {
            "hit_rate_on_expected_ok": round(hit_rate, 3),
            "precision_at_1_proxy": precision_at_1,
            "incorrect_retrieval_rate": round(1 - (passed / total), 3) if total else 0.0,
            "abstention_accuracy": round(abstain_ok / max(1, len(abstain_cases)), 3),
            "latency_ms_mean": round(sum(latencies) / len(latencies), 3) if latencies else None,
            "latency_ms_max": max(latencies) if latencies else None,
        },
        "acceptance": payload.get("meta", {}).get("acceptance"),
        "failures": [r["id"] for r in results if not r["passed"]],
        "live_llm_judge": "optional_not_run_offline",
    }

    # Acceptance gates
    acc = summary["acceptance"] or {}
    summary["acceptance_passed"] = (
        summary["metrics"]["hit_rate_on_expected_ok"] >= float(acc.get("hit_rate_min", 0))
        and summary["metrics"]["precision_at_1_proxy"] >= float(acc.get("precision_at_1_min", 0))
        and summary["metrics"]["incorrect_retrieval_rate"] <= float(acc.get("incorrect_retrieval_max", 1))
        and summary["metrics"]["abstention_accuracy"] >= float(acc.get("abstention_accuracy_min", 0))
        and summary["pass_rate"] >= 0.9
    )

    report = {"meta": payload.get("meta"), "summary": summary, "results": results}
    if write_report:
        REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report
