"""Load curated knowledge entries from the version-controlled knowledge directory."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from .schemas import is_agent_visible

KNOWLEDGE_ROOT = Path(__file__).resolve().parent


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _iter_entry_files() -> list[Path]:
    files = list((KNOWLEDGE_ROOT / "concepts").glob("*.json"))
    files.extend((KNOWLEDGE_ROOT / "sutras").glob("*.json"))
    return sorted(files)


def _flatten_file(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict) and "entries" in payload:
        return list(payload["entries"])
    if isinstance(payload, dict) and "concept_id" in payload:
        return [payload]
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict) and "concept_id" in item]
    return []


@lru_cache(maxsize=1)
def load_all_entries() -> tuple[dict[str, Any], ...]:
    entries: list[dict[str, Any]] = []
    for path in _iter_entry_files():
        entries.extend(_flatten_file(_read_json(path)))
    return tuple(entries)


def load_approved_entries() -> list[dict[str, Any]]:
    return [e for e in load_all_entries() if is_agent_visible(e)]


def get_entry_by_id(concept_id: str, *, approved_only: bool = True) -> dict[str, Any] | None:
    pool = load_approved_entries() if approved_only else list(load_all_entries())
    for entry in pool:
        if entry.get("concept_id") == concept_id:
            return entry
    return None


def clear_cache() -> None:
    load_all_entries.cache_clear()
