"""ADK tool: deterministic practice answer checking."""

from __future__ import annotations

from typing import Any, Optional

from .errors import tool_error, tool_ok
from .service import ONE_OPERAND, SUTRAS, TWO_OPERAND, build_practice_check


def check_practice_answer(
    sutra: str,
    question_key: str,
    answer: str,
    difficulty: str = "beginner",
    a: Optional[int] = None,
    b: Optional[int] = None,
    number: Optional[int] = None,
) -> dict[str, Any]:
    """Check a learner's practice answer with the existing practice engine.

    Args:
        sutra: One of nikhilam, urdhva, ekadhikena, yavadunam, ekanyunena.
        question_key: Practice question key (for example result or deviation_a).
        answer: The learner's submitted answer text.
        difficulty: beginner, intermediate, or advanced.
        a: First factor when needed.
        b: Second factor when needed.
        number: Single operand when needed.

    Returns:
        The shared practice check contract fields, wrapped with ok=True/False.
    """
    name = (sutra or "").lower().strip()
    if name not in SUTRAS:
        return tool_error(
            "unsupported_sutra",
            f"Unsupported sutra '{sutra}'. Choose one of: {', '.join(SUTRAS)}.",
        )
    if name in TWO_OPERAND and (a is None or b is None):
        return tool_error("invalid_operands", "Provide both a and b for this sutra.")
    if name in ONE_OPERAND and number is None:
        return tool_error("invalid_operands", "Provide the number parameter.")
    if not question_key:
        return tool_error("invalid_operands", "Provide question_key.")

    try:
        checked = build_practice_check(
            name,
            difficulty,
            question_key,
            answer if answer is not None else "",
            a=a,
            b=b,
            number=number,
        )
    except ValueError as error:
        return tool_error("invalid_operands", str(error))
    except Exception:  # noqa: BLE001
        return tool_error("engine_error", "The practice checker could not run.")

    # Drop the full question list from the model-facing payload to keep turns small.
    checked.pop("questions", None)
    return tool_ok(**checked)
