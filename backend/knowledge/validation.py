"""Deterministic validation for curated knowledge entries."""

from __future__ import annotations

from typing import Any

from .loader import load_all_entries
from .schemas import DIFFICULTIES, REQUIRED_ENTRY_FIELDS, SUPPORTED_SUTRAS


def validate_entry(entry: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    for field in REQUIRED_ENTRY_FIELDS:
        if field not in entry:
            errors.append(f"{entry.get('concept_id', '?')}: missing {field}")
    cid = entry.get("concept_id")
    if not isinstance(cid, str) or not cid:
        errors.append("missing concept_id")
    sutra = entry.get("sutra_id")
    if sutra is not None and sutra not in SUPPORTED_SUTRAS and entry.get("concept_type") != "unsupported_boundary":
        # foundations may have sutra_id null; sutra docs must use known ids
        if entry.get("concept_type") not in {"foundation", "unsupported_boundary"}:
            errors.append(f"{cid}: unknown sutra_id {sutra}")
    for level in entry.get("difficulty_levels") or []:
        if level not in DIFFICULTIES:
            errors.append(f"{cid}: bad difficulty {level}")
    for ex in entry.get("examples") or []:
        if ex.get("engine_verified") and ex.get("expected_result") != ex.get("independent_check"):
            # independent_check may be omitted; if both present they must match
            if ex.get("independent_check") is not None:
                errors.append(f"{cid}/{ex.get('example_id')}: result mismatch")
        if ex.get("engine_verified") and ex.get("expected_result") is None:
            errors.append(f"{cid}: engine example missing expected_result")
        # Never allow examples that claim unsupported methods as implemented
        if ex.get("app_supported") is False and entry.get("review_status") == "approved_for_agent":
            if entry.get("concept_type") != "unsupported_boundary":
                errors.append(f"{cid}: unsupported example marked approved without boundary type")
    refs = entry.get("source_references") or []
    if not isinstance(refs, list):
        errors.append(f"{cid}: source_references must be a list")
    for ref in refs:
        if not ref.get("document_id") or not ref.get("title"):
            errors.append(f"{cid}: incomplete source reference")
    return errors


def validate_knowledge_pack() -> dict[str, Any]:
    entries = list(load_all_entries())
    errors: list[str] = []
    ids: set[str] = set()
    sutra_coverage = {s: 0 for s in SUPPORTED_SUTRAS}
    for entry in entries:
        errors.extend(validate_entry(entry))
        cid = entry.get("concept_id")
        if cid in ids:
            errors.append(f"duplicate concept_id {cid}")
        ids.add(cid)
        sid = entry.get("sutra_id")
        if sid in sutra_coverage:
            sutra_coverage[sid] += 1
    missing = [s for s, n in sutra_coverage.items() if n < 1]
    if missing:
        errors.append(f"missing sutra coverage: {missing}")
    required_principles = [f"sutra.{s}.principle" for s in SUPPORTED_SUTRAS]
    present = {e.get("concept_id") for e in entries}
    for rid in required_principles:
        if rid not in present:
            errors.append(f"missing required principle entry {rid}")
    return {
        "ok": not errors,
        "entry_count": len(entries),
        "sutra_coverage": sutra_coverage,
        "errors": errors,
    }


def verify_examples_against_engines() -> list[str]:
    """Re-check labeled examples with independent arithmetic / engines."""
    from backend.ekadhikena import calculate_ekadhikena
    from backend.ekanyunena import calculate_ekanyunena
    from backend.nikhilam import build_nikhilam_steps
    from backend.urdhva import calculate_urdhva
    from backend.yavadunam import calculate_yavadunam

    errors: list[str] = []
    for entry in load_all_entries():
        for ex in entry.get("examples") or []:
            if not ex.get("engine_verified"):
                continue
            sid = ex.get("sutra_id") or entry.get("sutra_id")
            ops = ex.get("operands") or {}
            expected = ex.get("expected_result")
            try:
                if sid == "nikhilam":
                    got = build_nikhilam_steps(ops["a"], ops["b"], ops["base"])[-1]["result"]
                elif sid == "urdhva":
                    got = calculate_urdhva(ops["a"], ops["b"])["result"]
                elif sid == "ekadhikena":
                    got = calculate_ekadhikena(ops["number"], ex.get("difficulty") or "beginner")["result"]
                elif sid == "yavadunam":
                    got = calculate_yavadunam(ops["number"], ex.get("difficulty") or "beginner")["result"]
                elif sid == "ekanyunena":
                    got = calculate_ekanyunena(ops["number"], ex.get("difficulty") or "beginner")["result"]
                else:
                    errors.append(f"unknown sutra in example {ex.get('example_id')}")
                    continue
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{ex.get('example_id')}: engine error {exc}")
                continue
            if got != expected:
                errors.append(f"{ex.get('example_id')}: engine {got} != labeled {expected}")
            # Independent python check when operands allow
            if sid in {"nikhilam", "urdhva"} and "a" in ops and "b" in ops:
                if ops["a"] * ops["b"] != expected:
                    errors.append(f"{ex.get('example_id')}: python product mismatch")
            if sid == "ekadhikena" and "number" in ops:
                if ops["number"] * ops["number"] != expected:
                    errors.append(f"{ex.get('example_id')}: python square mismatch")
            if sid == "yavadunam" and "number" in ops:
                if ops["number"] * ops["number"] != expected:
                    errors.append(f"{ex.get('example_id')}: python square mismatch")
            if sid == "ekanyunena" and "number" in ops and "multiplier" in ops:
                if ops["number"] * ops["multiplier"] != expected:
                    errors.append(f"{ex.get('example_id')}: python product mismatch")
    return errors
