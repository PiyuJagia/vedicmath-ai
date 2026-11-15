"""Compare two completed experiment manifests (compatible settings only)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def load_manifest(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _compat_issues(a: dict[str, Any], b: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    if a.get("evaluation_mode") != b.get("evaluation_mode"):
        issues.append(
            f"mode mismatch: {a.get('evaluation_mode')} vs {b.get('evaluation_mode')} "
            "(do not treat offline fixture classification as live agent performance)"
        )
    if a.get("dataset_catalog_sha256") != b.get("dataset_catalog_sha256"):
        issues.append("dataset catalog hash differs")
    if a.get("evaluator_rubric_version") != b.get("evaluator_rubric_version"):
        issues.append("rubric version differs")
    if a.get("gemini_model") != b.get("gemini_model"):
        issues.append("model id differs")
    return issues


def _metric_map(manifest: dict[str, Any]) -> dict[str, float | None]:
    summary = manifest.get("summary") or {}
    aggregates = summary.get("aggregates") or summary.get("metrics") or {}
    out: dict[str, float | None] = {
        "pass_rate": summary.get("pass_rate"),
        "evaluator_sensitivity_known_bad": summary.get("evaluator_sensitivity_known_bad"),
        "evaluator_acceptance_known_good": summary.get("evaluator_acceptance_known_good"),
    }
    for key, value in aggregates.items():
        if isinstance(value, (int, float)):
            out[key] = float(value)
    return out


def compare_manifests(baseline: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    issues = _compat_issues(baseline, candidate)
    base_m = _metric_map(baseline)
    cand_m = _metric_map(candidate)
    keys = sorted(set(base_m) | set(cand_m))
    rows = []
    for key in keys:
        b = base_m.get(key)
        c = cand_m.get(key)
        delta = None
        if isinstance(b, (int, float)) and isinstance(c, (int, float)):
            delta = round(float(c) - float(b), 4)
        rows.append({"metric": key, "baseline": b, "candidate": c, "difference": delta})

    return {
        "baseline_experiment": baseline.get("experiment_id"),
        "baseline_run_id": baseline.get("run_id"),
        "candidate_experiment": candidate.get("experiment_id"),
        "candidate_run_id": candidate.get("run_id"),
        "compatible": len(issues) == 0,
        "compatibility_issues": issues,
        "comparison_valid_for_attribution": len(issues) == 0,
        "rows": rows,
        "note": (
            "Never compare offline fixture-classification scores with live agent-performance "
            "scores as if they measure the same construct."
        ),
    }


def render_markdown_table(comparison: dict[str, Any]) -> str:
    lines = [
        f"# Comparison: `{comparison['baseline_experiment']}` -> `{comparison['candidate_experiment']}`",
        "",
        f"Compatible: **{comparison['compatible']}**",
        "",
    ]
    if comparison["compatibility_issues"]:
        lines.append("## Compatibility issues")
        for issue in comparison["compatibility_issues"]:
            lines.append(f"- {issue}")
        lines.append("")
    lines.extend(
        [
            "| Metric | Baseline | Candidate | Difference |",
            "|---|---:|---:|---:|",
        ]
    )
    for row in comparison["rows"]:
        lines.append(
            f"| {row['metric']} | {row['baseline']} | {row['candidate']} | {row['difference']} |"
        )
    lines.append("")
    lines.append(comparison["note"])
    return "\n".join(lines)
