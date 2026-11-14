"""ADK tool: approved lesson + immutable animation payload from the engines."""

from __future__ import annotations

from typing import Any, Optional

from .errors import tool_error, tool_ok
from .service import build_lesson
from .store import LAST_CALCULATION_ID_KEY, get_calculation, remember_calculation


def get_lesson(
    sutra: Optional[str] = None,
    difficulty: str = "beginner",
    a: Optional[int] = None,
    b: Optional[int] = None,
    number: Optional[int] = None,
    calculation_id: Optional[str] = None,
    tool_context: Any = None,
) -> dict[str, Any]:
    """Fetch teaching steps and animation events from the deterministic engines.

    Prefer passing calculation_id from a prior calculate_sutra call so the
    animation matches the verified result. Never invent or edit animation events.

    Args:
        sutra: Sutra id if not using calculation_id.
        difficulty: beginner, intermediate, or advanced.
        a: First factor when needed.
        b: Second factor when needed.
        number: Single operand when needed.
        calculation_id: Id returned by calculate_sutra (preferred).
        tool_context: Injected by ADK.

    Returns:
        ok payload with teaching_steps, animation_steps, result, and calculation_id.
    """
    problem = None
    if calculation_id:
        cached = get_calculation(calculation_id)
        if cached is None:
            return tool_error("unknown_calculation", "That calculation_id was not found in this session.")
        problem = cached["problem"]
    elif tool_context is not None and not sutra:
        state = getattr(tool_context, "state", None) or {}
        prior = state.get(LAST_CALCULATION_ID_KEY)
        if prior:
            cached = get_calculation(prior)
            if cached:
                calculation_id = prior
                problem = cached["problem"]

    if problem is None:
        if not sutra:
            return tool_error(
                "invalid_operands",
                "Provide a calculation_id or sutra with the required operands.",
            )
        problem = {
            "sutra": sutra.lower().strip(),
            "difficulty": difficulty,
            "a": a,
            "b": b,
            "number": number,
        }

    try:
        lesson = build_lesson(
            problem["sutra"],
            problem["difficulty"],
            a=problem.get("a"),
            b=problem.get("b"),
            number=problem.get("number"),
        )
    except ValueError as error:
        return tool_error("invalid_operands", str(error))
    except Exception:  # noqa: BLE001
        return tool_error("engine_error", "The maths engine could not load this lesson.")

    if calculation_id:
        cached = get_calculation(calculation_id)
        if cached is not None and cached["result"] != lesson["result"]:
            return tool_error(
                "result_mismatch",
                "The lesson result does not match the stored calculation.",
            )
    else:
        calculation_id = remember_calculation(
            {
                "sutra_id": lesson["sutra_id"],
                "difficulty": lesson["difficulty"],
                "numbers": lesson["numbers"],
                "result": lesson["result"],
                "teaching_steps": lesson["teaching_steps"],
                "problem": lesson["problem"],
            },
            tool_context,
        )

    return tool_ok(
        calculation_id=calculation_id,
        sutra_id=lesson["sutra_id"],
        sutra=lesson["sutra"],
        numbers=lesson["numbers"],
        difficulty=lesson["difficulty"],
        operands=lesson["operands"],
        teaching_steps=lesson["teaching_steps"],
        animation_steps=lesson["animation_steps"],
        animation_format=lesson["animation_format"],
        result=lesson["result"],
        watch_animation={
            "calculation_id": calculation_id,
            "intent": "watch_animation",
            "note": "UI may play this payload; the coach must not fabricate events.",
        },
        open_animation={
            "calculation_id": calculation_id,
            "intent": "open_animation",
            "note": "Same validated payload as watch_animation.",
        },
    )
