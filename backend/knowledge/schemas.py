"""Schemas and constants for the curated Vedic Maths knowledge pack."""

from __future__ import annotations

from typing import Any, Literal

CONTENT_VERSION = "7C.1"

ReviewStatus = Literal[
    "draft",
    "mathematically_verified",
    "approved_for_agent",
    "rejected",
]

ConceptType = Literal[
    "foundation",
    "sutra_overview",
    "principle",
    "derivation",
    "explanation",
    "worked_example",
    "misconception",
    "comparison",
    "applicability",
    "understanding_check",
    "alternate_explanation",
    "unsupported_boundary",
]

SUPPORTED_SUTRAS = (
    "nikhilam",
    "urdhva",
    "ekadhikena",
    "yavadunam",
    "ekanyunena",
)

DIFFICULTIES = ("beginner", "intermediate", "advanced")

# Only these statuses are returned by production retrieval.
AGENT_VISIBLE_STATUSES = frozenset({"approved_for_agent"})

REQUIRED_ENTRY_FIELDS = (
    "concept_id",
    "title",
    "concept_type",
    "difficulty_levels",
    "explanation",
    "source_references",
    "app_supported",
    "review_status",
    "content_version",
)


def is_agent_visible(entry: dict[str, Any]) -> bool:
    return entry.get("review_status") in AGENT_VISIBLE_STATUSES and bool(
        entry.get("app_supported", True) or entry.get("concept_type") == "unsupported_boundary"
    )
