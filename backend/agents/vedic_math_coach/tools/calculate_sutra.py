"""ADK tool: verified calculation + teaching steps (no animation events)."""

from __future__ import annotations

from typing import Any, Optional

from .errors import tool_error, tool_ok
from .service import ONE_OPERAND, SUTRAS, TWO_OPERAND, build_lesson
from .store import remember_calculation, session_id_from_context


def calculate_sutra(
    sutra: str,
    difficulty: str = "beginner",
    a: Optional[int] = None,
    b: Optional[int] = None,
    number: Optional[int] = None,
    tool_context: Any = None,
    session_id: Optional[str] = None,
) -> dict[str, Any]:
    """Run a Vedic Math calculation with the deterministic Python engines.

    Use this when the learner asks for a product, square, or step-by-step
    method. Do not invent arithmetic yourself.

    Args:
        sutra: One of nikhilam, urdhva, ekadhikena, yavadunam, ekanyunena.
        difficulty: beginner, intermediate, or advanced.
        a: First factor (nikhilam, urdhva).
        b: Second factor (nikhilam, urdhva).
        number: Single operand (ekadhikena, yavadunam, ekanyunena).
        tool_context: Injected by ADK; used to remember the calculation id.
        session_id: Optional explicit session owner (HTTP / tests). Prefer
            tool_context.session when running inside ADK.

    Returns:
        ok payload with result, teaching_steps, and calculation_id, or an error.
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

    owner = session_id or session_id_from_context(tool_context)
    if not owner:
        return tool_error(
            "missing_session",
            "A learner session is required before storing a verified calculation.",
        )

    try:
        lesson = build_lesson(name, difficulty, a=a, b=b, number=number)
    except ValueError as error:
        return tool_error("invalid_operands", str(error))
    except Exception:  # noqa: BLE001 — surface a safe message only
        return tool_error("engine_error", "The maths engine could not complete this problem.")

    snapshot = {
        "sutra_id": lesson["sutra_id"],
        "difficulty": lesson["difficulty"],
        "numbers": lesson["numbers"],
        "result": lesson["result"],
        "teaching_steps": lesson["teaching_steps"],
        "problem": lesson["problem"],
    }
    try:
        calculation_id = remember_calculation(
            snapshot,
            tool_context,
            session_id=owner,
        )
    except ValueError as error:
        return tool_error("missing_session", str(error))

    return tool_ok(
        calculation_id=calculation_id,
        sutra_id=lesson["sutra_id"],
        sutra=lesson["sutra"],
        numbers=lesson["numbers"],
        difficulty=lesson["difficulty"],
        operands=lesson["operands"],
        teaching_steps=lesson["teaching_steps"],
        result=lesson["result"],
        note=(
            "Teaching steps are engine-authored. For animation events call "
            "get_lesson with this calculation_id. Do not invent animation events."
        ),
    )
