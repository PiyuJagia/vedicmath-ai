"""Backend-owned builders for watch_animation / open_animation UI actions.

Never accepts LLM-generated animation events or caller-supplied calculation ids
as new identities — only validates ids previously minted by remember_calculation.
"""

from __future__ import annotations

import copy
from typing import Any, Optional

from backend.agents.vedic_math_coach.tools.store import (
    attach_animation_payload,
    get_calculation,
    get_calculation_for_session,
)


def _animation_format(animation_steps: list) -> str:
    if not animation_steps:
        return "empty"
    first = animation_steps[0]
    if isinstance(first, dict) and "events" in first:
        return "grouped"
    return "flat"


def _build_lesson(*args, **kwargs):
    # Lazy import avoids circular import: service → main → handoff → actions.
    from backend.agents.vedic_math_coach.tools.service import build_lesson

    return build_lesson(*args, **kwargs)


from .errors import (
    ENGINE_ERROR,
    INVALID_INTENT,
    MISSING_SESSION,
    UNAUTHORIZED_CALCULATION,
    UNKNOWN_CALCULATION,
    UNSUPPORTED_ANIMATION,
    HandoffError,
    raise_handoff,
)
from .schemas import (
    AgentMessage,
    AnimationFormat,
    AnimationIntent,
    CharacterId,
    CharacterIdentity,
    CoachHandoffResponse,
    LessonAnimationPayload,
    OpenAnimationAction,
    VerifiedCalculationRef,
    WatchAnimationAction,
)


def _require_session(session_id: str | None) -> str:
    if not session_id or not str(session_id).strip():
        raise_handoff(MISSING_SESSION)
    return str(session_id).strip()


def lookup_calculation(session_id: str, calculation_id: str) -> dict[str, Any]:
    """Session-scoped calculation lookup with controlled errors."""
    owner = _require_session(session_id)
    if not calculation_id or not str(calculation_id).strip():
        raise_handoff(UNKNOWN_CALCULATION)

    cid = str(calculation_id).strip()
    owned = get_calculation_for_session(cid, owner)
    if owned is not None:
        return owned

    if get_calculation(cid) is not None:
        raise_handoff(UNAUTHORIZED_CALCULATION)
    raise_handoff(UNKNOWN_CALCULATION)


def _load_lesson_payload(session_id: str, calculation_id: str, record: dict[str, Any]) -> LessonAnimationPayload:
    """Build or reuse the deterministic animation payload for a stored calculation."""
    if record.get("animation_steps") is not None:
        fmt = record.get("animation_format") or _animation_format(record["animation_steps"])
        if fmt not in {"grouped", "flat"} or not record["animation_steps"]:
            raise_handoff(UNSUPPORTED_ANIMATION)
        return LessonAnimationPayload(
            calculation_id=calculation_id,
            sutra_id=record["sutra_id"],
            sutra=record.get("sutra", record["sutra_id"]),
            numbers=list(record["numbers"]),
            difficulty=record["difficulty"],
            result=record["result"],
            animation_format=AnimationFormat(fmt),
            teaching_steps=copy.deepcopy(record["teaching_steps"]),
            animation_steps=copy.deepcopy(record["animation_steps"]),
        )

    problem = record["problem"]
    try:
        lesson = _build_lesson(
            problem["sutra"],
            problem["difficulty"],
            a=problem.get("a"),
            b=problem.get("b"),
            number=problem.get("number"),
        )
    except ValueError as error:
        raise HandoffError("invalid_operands", str(error), status_code=400) from error
    except Exception:  # noqa: BLE001
        raise_handoff(ENGINE_ERROR)

    if lesson["result"] != record["result"]:
        raise HandoffError(
            "result_mismatch",
            "The lesson result does not match the stored calculation.",
            status_code=409,
        )

    fmt = lesson["animation_format"]
    if fmt not in {"grouped", "flat"} or not lesson["animation_steps"]:
        raise_handoff(UNSUPPORTED_ANIMATION)

    attach_animation_payload(
        calculation_id,
        session_id=session_id,
        animation_steps=copy.deepcopy(lesson["animation_steps"]),
        animation_format=fmt,
    )

    return LessonAnimationPayload(
        calculation_id=calculation_id,
        sutra_id=lesson["sutra_id"],
        sutra=lesson["sutra"],
        numbers=list(lesson["numbers"]),
        difficulty=lesson["difficulty"],
        result=lesson["result"],
        animation_format=AnimationFormat(fmt),
        teaching_steps=copy.deepcopy(lesson["teaching_steps"]),
        animation_steps=copy.deepcopy(lesson["animation_steps"]),
    )


def verified_ref(calculation_id: str, record: dict[str, Any]) -> VerifiedCalculationRef:
    return VerifiedCalculationRef(
        calculation_id=calculation_id,
        sutra_id=record["sutra_id"],
        difficulty=record["difficulty"],
        numbers=list(record["numbers"]),
        result=record["result"],
    )


def build_animation_action(
    *,
    session_id: str,
    calculation_id: str,
    intent: AnimationIntent | str,
    text: str = "",
    character_id: CharacterId | str = CharacterId.RABBIT,
    include_lesson: bool | None = None,
) -> CoachHandoffResponse:
    """Create a watch_animation or open_animation action for a valid calculation.

    ``intent`` must be the structured enum (or its value). Free-form chat phrases
    are never parsed here.
    """
    owner = _require_session(session_id)
    try:
        intent_enum = intent if isinstance(intent, AnimationIntent) else AnimationIntent(intent)
    except ValueError as error:
        raise HandoffError(*INVALID_INTENT[:2], status_code=INVALID_INTENT[2]) from error

    record = lookup_calculation(owner, calculation_id)
    lesson = _load_lesson_payload(owner, calculation_id, record)
    calc = verified_ref(calculation_id, record)

    if intent_enum is AnimationIntent.WATCH:
        action = WatchAnimationAction(
            calculation_id=calculation_id,
            animation_format=lesson.animation_format,
        )
        default_text = text or "Would you like to watch the animation for this problem?"
        # Watch offers a button; lesson payload is optional (UI can resolve later).
        attach_lesson = True if include_lesson is None else include_lesson
    else:
        action = OpenAnimationAction(
            calculation_id=calculation_id,
            animation_format=lesson.animation_format,
        )
        default_text = text or "Opening the animation for this verified calculation."
        # Open always returns the engine payload so the stage can start immediately.
        attach_lesson = True if include_lesson is None else include_lesson

    return CoachHandoffResponse(
        message=AgentMessage(
            text=default_text,
            character=CharacterIdentity.from_id(character_id),
        ),
        calculation=calc,
        actions=[action],
        lesson=lesson if attach_lesson else None,
    )


def compose_handoff(
    *,
    session_id: str,
    text: str,
    character_id: CharacterId | str = CharacterId.BOY_COACH,
    calculation_id: Optional[str] = None,
    animation_intent: Optional[AnimationIntent | str] = None,
) -> CoachHandoffResponse:
    """Compose a coach envelope. Actions are added only via structured intent."""
    owner = _require_session(session_id)
    character = CharacterIdentity.from_id(character_id)

    if animation_intent is None:
        calc = None
        if calculation_id:
            record = lookup_calculation(owner, calculation_id)
            calc = verified_ref(calculation_id, record)
        return CoachHandoffResponse(
            message=AgentMessage(text=text, character=character),
            calculation=calc,
            actions=[],
            lesson=None,
        )

    return build_animation_action(
        session_id=owner,
        calculation_id=calculation_id or "",
        intent=animation_intent,
        text=text,
        character_id=character_id,
    )
