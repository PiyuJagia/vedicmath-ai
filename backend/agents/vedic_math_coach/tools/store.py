"""In-process store for verified calculations within a conversation."""

from __future__ import annotations

import uuid
from typing import Any

LAST_CALCULATION_ID_KEY = "vedicmath_last_calculation_id"
LAST_RESULT_KEY = "vedicmath_last_result"

# calculation_id -> immutable snapshot (engine-authored only)
_CALCULATIONS: dict[str, dict[str, Any]] = {}


def remember_calculation(snapshot: dict[str, Any], tool_context: Any | None = None) -> str:
    """Persist a verified calculation and optionally write its id into ADK session state."""
    calculation_id = str(uuid.uuid4())
    _CALCULATIONS[calculation_id] = dict(snapshot)
    if tool_context is not None:
        state = getattr(tool_context, "state", None)
        if state is not None:
            state[LAST_CALCULATION_ID_KEY] = calculation_id
            state[LAST_RESULT_KEY] = snapshot.get("result")
    return calculation_id


def get_calculation(calculation_id: str) -> dict[str, Any] | None:
    return _CALCULATIONS.get(calculation_id)


def clear_store() -> None:
    """Test helper."""
    _CALCULATIONS.clear()
