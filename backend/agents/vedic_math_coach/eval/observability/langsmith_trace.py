"""Eval-runner LangSmith helpers (delegates to app observability).

Keeps experiment/run metadata for offline/live eval manifests while reusing
the same Google ADK → LangSmith integration as production coach traffic.
"""

from __future__ import annotations

from typing import Any

from backend.agents.vedic_math_coach.observability.langsmith import (
    ensure_langsmith_tracing,
    langsmith_available,
    langsmith_tracing_enabled,
    reset_langsmith_config_state_for_tests,
)

__all__ = [
    "langsmith_available",
    "langsmith_tracing_enabled",
    "maybe_configure_langsmith",
    "reset_langsmith_config_state_for_tests",
]


def maybe_configure_langsmith(
    *,
    experiment_id: str | None = None,
    run_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    tags: list[str] | None = None,
) -> dict[str, Any]:
    """Configure tracing for an evaluation run; returns status for manifests."""
    meta = {
        "traffic": "eval",
        "experiment_id": experiment_id,
        "run_id": run_id,
        **(metadata or {}),
    }
    tag_list = list(tags or [])
    tag_list.extend(["eval", "synthetic-eval"])
    if experiment_id:
        tag_list.append(experiment_id)
    status = ensure_langsmith_tracing(metadata=meta, tags=tag_list)
    # Preserve prior key used by manifests/tests
    status.setdefault("project", status.get("agent_id"))
    return status
