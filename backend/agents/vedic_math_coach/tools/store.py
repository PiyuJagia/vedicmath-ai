"""In-process store for verified calculations, scoped to a learner session.

Only the backend may mint calculation_ids. Animation events are stored only
after they come from the deterministic engines — never from the LLM.
"""

from __future__ import annotations

import uuid
from typing import Any

LAST_CALCULATION_ID_KEY = "vedicmath_last_calculation_id"
LAST_RESULT_KEY = "vedicmath_last_result"

# calculation_id -> immutable snapshot (engine-authored only)
_CALCULATIONS: dict[str, dict[str, Any]] = {}


def session_id_from_context(tool_context: Any | None) -> str | None:
    """Best-effort session id from an ADK ToolContext / Context."""
    if tool_context is None:
        return None
    session = getattr(tool_context, "session", None)
    if session is not None:
        sid = getattr(session, "id", None) or getattr(session, "session_id", None)
        if sid:
            return str(sid)
    for attr in ("session_id", "_session_id"):
        value = getattr(tool_context, attr, None)
        if value:
            return str(value)
    return None


def remember_calculation(
    snapshot: dict[str, Any],
    tool_context: Any | None = None,
    *,
    session_id: str | None = None,
) -> str:
    """Persist a verified calculation. Returns a backend-minted calculation_id."""
    owner = session_id or session_id_from_context(tool_context)
    if not owner:
        raise ValueError("session_id is required to store a calculation.")

    calculation_id = str(uuid.uuid4())
    record = dict(snapshot)
    record["session_id"] = owner
    # LLM must never supply these; strip if a caller accidentally passes them.
    record.pop("animation_steps", None)
    record.pop("calculation_id", None)
    _CALCULATIONS[calculation_id] = record

    if tool_context is not None:
        state = getattr(tool_context, "state", None)
        if state is not None:
            state[LAST_CALCULATION_ID_KEY] = calculation_id
            state[LAST_RESULT_KEY] = snapshot.get("result")
    return calculation_id


def get_calculation(calculation_id: str) -> dict[str, Any] | None:
    """Lookup by id only (no ownership check). Prefer get_calculation_for_session."""
    return _CALCULATIONS.get(calculation_id)


def get_calculation_for_session(
    calculation_id: str,
    session_id: str,
) -> dict[str, Any] | None:
    """Return the snapshot only when it belongs to this session."""
    record = _CALCULATIONS.get(calculation_id)
    if record is None:
        return None
    if record.get("session_id") != session_id:
        return None
    return record


def attach_animation_payload(
    calculation_id: str,
    *,
    session_id: str,
    animation_steps: list[Any],
    animation_format: str,
) -> dict[str, Any] | None:
    """Cache engine-authored animation on the calculation (first write wins)."""
    record = get_calculation_for_session(calculation_id, session_id)
    if record is None:
        return None
    if "animation_steps" not in record:
        record["animation_steps"] = animation_steps
        record["animation_format"] = animation_format
    return record


def clear_store() -> None:
    """Test helper."""
    _CALCULATIONS.clear()
