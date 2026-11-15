"""ADK tool: approved lesson + immutable animation payload from the engines."""

from __future__ import annotations

from typing import Any, Optional

from .errors import tool_error, tool_ok
from .service import build_lesson
from .store import (
    LAST_CALCULATION_ID_KEY,
    attach_animation_payload,
    get_calculation,
    get_calculation_for_session,
    remember_calculation,
    session_id_from_context,
)


def get_lesson(
    sutra: Optional[str] = None,
    difficulty: str = "beginner",
    a: Optional[int] = None,
    b: Optional[int] = None,
    number: Optional[int] = None,
    calculation_id: Optional[str] = None,
    tool_context: Any = None,
    session_id: Optional[str] = None,
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
        session_id: Optional explicit session owner (HTTP / tests).

    Returns:
        ok payload with teaching_steps, animation_steps, result, and calculation_id.
    """
    owner = session_id or session_id_from_context(tool_context)
    problem = None
    cached = None

    if calculation_id:
        if owner:
            cached = get_calculation_for_session(calculation_id, owner)
            if cached is None:
                # Distinguish missing vs unauthorized when the id exists elsewhere.
                if get_calculation(calculation_id) is not None:
                    return tool_error(
                        "unauthorized_calculation",
                        "That calculation_id does not belong to this session.",
                    )
                return tool_error(
                    "unknown_calculation",
                    "That calculation_id was not found in this session.",
                )
        else:
            cached = get_calculation(calculation_id)
            if cached is None:
                return tool_error(
                    "unknown_calculation",
                    "That calculation_id was not found in this session.",
                )
        problem = cached["problem"]
    elif tool_context is not None and not sutra:
        state = getattr(tool_context, "state", None) or {}
        prior = state.get(LAST_CALCULATION_ID_KEY)
        if prior and owner:
            cached = get_calculation_for_session(prior, owner)
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

    # Prefer previously cached engine animation for this calculation_id.
    if cached and cached.get("animation_steps") is not None:
        animation_steps = cached["animation_steps"]
        animation_format = cached.get("animation_format") or (
            "grouped" if animation_steps and isinstance(animation_steps[0], dict) and "events" in animation_steps[0] else "flat"
        )
        return tool_ok(
            calculation_id=calculation_id,
            sutra_id=cached["sutra_id"],
            sutra=cached.get("sutra", cached["sutra_id"]),
            numbers=cached["numbers"],
            difficulty=cached["difficulty"],
            operands=cached.get("operands"),
            teaching_steps=cached["teaching_steps"],
            animation_steps=animation_steps,
            animation_format=animation_format,
            result=cached["result"],
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
        if cached is not None and cached["result"] != lesson["result"]:
            return tool_error(
                "result_mismatch",
                "The lesson result does not match the stored calculation.",
            )
        if owner:
            attach_animation_payload(
                calculation_id,
                session_id=owner,
                animation_steps=lesson["animation_steps"],
                animation_format=lesson["animation_format"],
            )
    else:
        if not owner:
            return tool_error(
                "missing_session",
                "A learner session is required before storing a verified calculation.",
            )
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
            session_id=owner,
        )
        attach_animation_payload(
            calculation_id,
            session_id=owner,
            animation_steps=lesson["animation_steps"],
            animation_format=lesson["animation_format"],
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
