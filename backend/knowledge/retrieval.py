"""Lightweight structured + lexical retrieval over approved knowledge entries."""

from __future__ import annotations

import re
import time
from typing import Any

from .loader import get_entry_by_id, load_approved_entries
from .schemas import CONTENT_VERSION, SUPPORTED_SUTRAS

_TOKEN_RE = re.compile(r"[a-z0-9]+", re.I)

_SUTRA_ALIASES = {
    "nikhilam": ["nikhilam", "near base", "navatashcaramam", "all from 9"],
    "urdhva": ["urdhva", "tiryagbhyam", "vertically", "crosswise", "criss cross", "foil"],
    "ekadhikena": ["ekadhikena", "ending in 5", "one more than the previous", "purvena"],
    "yavadunam": ["yavadunam", "squaring near", "near a base square"],
    "ekanyunena": ["ekanyunena", "multiply by 99", "multiply by 999", "9999", "one less"],
}


def knowledge_rag_enabled() -> bool:
    import os

    return (os.getenv("VEDIC_KNOWLEDGE_RAG") or "").strip().lower() in {"1", "true", "yes", "on"}


def _tokens(text: str) -> set[str]:
    return {t.lower() for t in _TOKEN_RE.findall(text or "") if len(t) > 1}


def _entry_haystack(entry: dict[str, Any]) -> str:
    parts = [
        entry.get("concept_id") or "",
        entry.get("title") or "",
        " ".join(entry.get("aliases") or []),
        " ".join(entry.get("keywords") or []),
        entry.get("sutra_id") or "",
    ]
    expl = entry.get("explanation") or {}
    if isinstance(expl, dict):
        parts.extend(str(v) for v in expl.values() if isinstance(v, str))
    else:
        parts.append(str(expl))
    for mis in entry.get("misconceptions") or []:
        parts.append(mis.get("misconception_id") or "")
        parts.append(mis.get("observable_error") or "")
        parts.append(mis.get("correct_concept") or "")
    return " ".join(parts).lower()


def _score_entry(
    entry: dict[str, Any],
    *,
    question: str,
    sutra_id: str | None,
    difficulty: str | None,
    misconception_id: str | None,
    skill_id: str | None,
) -> float:
    hay = _entry_haystack(entry)
    q = (question or "").lower()
    score = 0.0
    q_tokens = _tokens(q)
    hay_tokens = _tokens(hay)
    if q_tokens:
        overlap = len(q_tokens & hay_tokens) / max(1, len(q_tokens))
        score += 4.0 * overlap
    for kw in entry.get("keywords") or []:
        if kw.lower() in q:
            score += 1.5
    for alias in entry.get("aliases") or []:
        if alias.lower() in q:
            score += 2.0
    if sutra_id and entry.get("sutra_id") == sutra_id:
        score += 3.0
    if sutra_id and sutra_id in (entry.get("concept_id") or ""):
        score += 1.0
    if difficulty and difficulty in (entry.get("difficulty_levels") or []):
        score += 0.5
    if misconception_id:
        for mis in entry.get("misconceptions") or []:
            if mis.get("misconception_id") == misconception_id:
                score += 5.0
            elif misconception_id.lower() in (mis.get("misconception_id") or "").lower():
                score += 2.0
    if skill_id and skill_id.lower() in hay:
        score += 2.0
    # Prefer principles / misconceptions for conceptual questions
    ctype = entry.get("concept_type")
    if any(w in q for w in ("why", "how come", "principle", "proof", "derive")):
        if ctype in {"principle", "derivation"}:
            score += 2.0
    if any(w in q for w in ("another way", "different", "still don't", "explain differently")):
        if ctype == "alternate_explanation":
            score += 3.0
    if any(w in q for w in ("wrong", "mistake", "confused", "misconception", "carry")):
        if entry.get("misconceptions") or ctype == "misconception":
            score += 1.5
        if "carry" in q and "carrying" in (entry.get("concept_id") or ""):
            score += 2.0
    if any(w in q for w in ("anurupyena", "paravartya", "not supported", "unsupported")):
        if entry.get("concept_type") == "unsupported_boundary":
            score += 5.0
    return score


def _detect_sutra(question: str, sutra_id: str | None) -> str | None:
    if sutra_id:
        name = sutra_id.lower().strip()
        return name if name in SUPPORTED_SUTRAS else sutra_id
    q = (question or "").lower()
    for sid, aliases in _SUTRA_ALIASES.items():
        if any(a in q for a in aliases):
            return sid
    return None


def _excerpt(entry: dict[str, Any], difficulty: str | None) -> dict[str, Any]:
    expl = entry.get("explanation") or {}
    text = None
    if isinstance(expl, dict):
        if difficulty and expl.get(difficulty):
            text = expl[difficulty]
        else:
            text = expl.get("default") or next((v for v in expl.values() if isinstance(v, str)), "")
        derivation = expl.get("derivation")
    else:
        text = str(expl)
        derivation = None
    return {
        "concept_id": entry.get("concept_id"),
        "sutra_id": entry.get("sutra_id"),
        "title": entry.get("title"),
        "concept_type": entry.get("concept_type"),
        "difficulty_levels": entry.get("difficulty_levels"),
        "text": text,
        "derivation": derivation,
        "misconceptions": entry.get("misconceptions") or [],
        "examples": [
            {
                "example_id": ex.get("example_id"),
                "operands": ex.get("operands"),
                "expected_result": ex.get("expected_result"),
                "engine_verified": ex.get("engine_verified"),
                "note": ex.get("note"),
            }
            for ex in (entry.get("examples") or [])[:2]
        ],
        "source_references": entry.get("source_references") or [],
        "content_version": entry.get("content_version") or CONTENT_VERSION,
        "review_status": entry.get("review_status"),
        "app_supported": entry.get("app_supported"),
        "history_vs_math_note": entry.get("history_vs_math_note"),
    }


def search_knowledge(
    *,
    question: str = "",
    sutra_id: str | None = None,
    concept_id: str | None = None,
    difficulty: str | None = None,
    skill_id: str | None = None,
    misconception_id: str | None = None,
    lesson_step_id: str | None = None,
    top_k: int = 3,
) -> dict[str, Any]:
    started = time.perf_counter()
    if not knowledge_rag_enabled():
        return {
            "status": "disabled",
            "ok": False,
            "matched_concept_ids": [],
            "approved_excerpts": [],
            "source_references": [],
            "difficulty": difficulty,
            "applicability": None,
            "content_version": CONTENT_VERSION,
            "retrieval_method": "feature_flag_off",
            "not_found_reason": "Set VEDIC_KNOWLEDGE_RAG=1 to enable curated knowledge retrieval.",
            "latency_ms": round((time.perf_counter() - started) * 1000, 3),
        }

    # Exact concept lookup
    if concept_id:
        entry = get_entry_by_id(concept_id, approved_only=True)
        latency = round((time.perf_counter() - started) * 1000, 3)
        if not entry:
            return {
                "status": "not_found",
                "ok": False,
                "matched_concept_ids": [],
                "approved_excerpts": [],
                "source_references": [],
                "difficulty": difficulty,
                "applicability": None,
                "content_version": CONTENT_VERSION,
                "retrieval_method": "exact_concept_id",
                "not_found_reason": f"No approved concept '{concept_id}'.",
                "latency_ms": latency,
            }
        excerpt = _excerpt(entry, difficulty)
        return {
            "status": "ok",
            "ok": True,
            "matched_concept_ids": [entry["concept_id"]],
            "approved_excerpts": [excerpt],
            "source_references": excerpt["source_references"],
            "difficulty": difficulty,
            "applicability": {
                "sutra_id": entry.get("sutra_id"),
                "app_supported": entry.get("app_supported"),
                "lesson_step_id": lesson_step_id,
            },
            "content_version": CONTENT_VERSION,
            "retrieval_method": "exact_concept_id",
            "not_found_reason": None,
            "latency_ms": latency,
        }

    detected = _detect_sutra(question, sutra_id)
    if sutra_id and sutra_id.lower().strip() not in SUPPORTED_SUTRAS and sutra_id.lower().strip() not in {
        "anurupyena",
        "paravartya",
    }:
        # Unknown sutra id → abstain unless asking unsupported boundary
        if "anurupyena" not in (question or "").lower() and "paravartya" not in (question or "").lower():
            return {
                "status": "unsupported_sutra",
                "ok": False,
                "matched_concept_ids": [],
                "approved_excerpts": [],
                "source_references": [],
                "difficulty": difficulty,
                "applicability": {"sutra_id": sutra_id, "app_supported": False},
                "content_version": CONTENT_VERSION,
                "retrieval_method": "sutra_guard",
                "not_found_reason": (
                    f"Sutra '{sutra_id}' is not in the approved knowledge pack. "
                    f"Supported: {', '.join(SUPPORTED_SUTRAS)}."
                ),
                "latency_ms": round((time.perf_counter() - started) * 1000, 3),
            }

    # Force unsupported boundary retrieval when named
    qlow = (question or "").lower()
    if any(x in qlow for x in ("anurupyena", "paravartya")) or (
        sutra_id and sutra_id.lower() in {"anurupyena", "paravartya"}
    ):
        detected = None
        skill_id = skill_id or "unsupported"

    scored: list[tuple[float, dict[str, Any]]] = []
    for entry in load_approved_entries():
        # If a supported sutra is known, softly prefer it but still allow foundations
        s = _score_entry(
            entry,
            question=question,
            sutra_id=detected if detected in SUPPORTED_SUTRAS else None,
            difficulty=difficulty,
            misconception_id=misconception_id,
            skill_id=skill_id,
        )
        if detected in SUPPORTED_SUTRAS and entry.get("sutra_id") not in {None, detected}:
            if entry.get("concept_type") not in {"foundation", "unsupported_boundary", "comparison"}:
                s -= 1.5
        if s > 0:
            scored.append((s, entry))
    scored.sort(key=lambda item: item[0], reverse=True)
    top = scored[: max(1, min(top_k, 5))]
    latency = round((time.perf_counter() - started) * 1000, 3)

    if not top or top[0][0] < 1.0:
        return {
            "status": "not_found",
            "ok": False,
            "matched_concept_ids": [],
            "approved_excerpts": [],
            "source_references": [],
            "difficulty": difficulty,
            "applicability": {"sutra_id": detected, "app_supported": detected in SUPPORTED_SUTRAS},
            "content_version": CONTENT_VERSION,
            "retrieval_method": "lexical",
            "not_found_reason": "No approved knowledge entry matched this question.",
            "latency_ms": latency,
        }

    excerpts = [_excerpt(e, difficulty) for _, e in top]
    refs: list[dict[str, Any]] = []
    for ex in excerpts:
        for ref in ex.get("source_references") or []:
            if ref not in refs:
                refs.append(ref)

    return {
        "status": "ok",
        "ok": True,
        "matched_concept_ids": [e["concept_id"] for e in excerpts],
        "approved_excerpts": excerpts,
        "source_references": refs,
        "difficulty": difficulty,
        "applicability": {
            "sutra_id": detected,
            "app_supported": detected in SUPPORTED_SUTRAS if detected else None,
            "lesson_step_id": lesson_step_id,
            "scores": {e["concept_id"]: round(s, 3) for s, e in top},
        },
        "content_version": CONTENT_VERSION,
        "retrieval_method": "lexical" if not misconception_id else "misconception_lexical",
        "not_found_reason": None,
        "latency_ms": latency,
    }
