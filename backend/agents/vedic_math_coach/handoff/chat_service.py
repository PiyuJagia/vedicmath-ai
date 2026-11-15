"""Compose a CoachHandoffResponse from an ADK chat turn (backend-owned actions)."""

from __future__ import annotations

import logging
import re
from typing import Iterable, Optional

from backend.agents.vedic_math_coach.guards import check_grounding, first_speaker_only, trusted_numbers
from backend.agents.vedic_math_coach.personas import Persona, parse_speaker
from backend.agents.vedic_math_coach.session import ChatTurnResult

from .actions import build_animation_action, compose_handoff, lookup_calculation, verified_ref
from .errors import HandoffError
from .runtime import extract_verified_calculation_id
from .schemas import (
    AgentMessage,
    AnimationIntent,
    CharacterId,
    CharacterIdentity,
    CoachChatResponse,
)

logger = logging.getLogger(__name__)

# Shown instead of a reply that states a number no tool or learner supplied.
UNGROUNDED_REPLY = (
    "I want to be sure every number I give you is right. "
    "Let's work it out together from the steps on screen. Which part shall we look at first?"
)

_SPEAKER_LINE = re.compile(
    r"^\s*\[(?:Rishi|Boy Coach|Rabbit|Hummingbird)\]\s*",
    re.IGNORECASE,
)


def persona_to_character_id(persona: Persona | None) -> CharacterId:
    if persona is Persona.RABBIT:
        return CharacterId.RABBIT
    if persona is Persona.HUMMINGBIRD:
        return CharacterId.HUMMINGBIRD
    return CharacterId.BOY_COACH


def strip_speaker_tag(reply: str) -> str:
    text = (reply or "").strip()
    return _SPEAKER_LINE.sub("", text, count=1).strip()


def build_chat_response(
    *,
    session_id: str,
    turn: ChatTurnResult,
    animation_intent: Optional[AnimationIntent] = None,
    calculation_id: Optional[str] = None,
    protected_values: Optional[list[str]] = None,
    learner_texts: Iterable[str | None] = (),
) -> CoachChatResponse:
    """Map ADK prose + tool results onto the typed handoff envelope.

    Animation actions are minted only from backend-validated calculation_ids
    observed in tool responses (or an explicit client-supplied id that passes
    session ownership checks). LLM prose is never parsed for executable UI.

    ``learner_texts`` is what the learner supplied this turn (their message and
    validated context); numbers in it may be quoted back without a tool result.
    """
    # One character per reply: drop anything after a second persona tag.
    reply = first_speaker_only(turn.text)
    persona = parse_speaker(reply)
    character_id = persona_to_character_id(persona)
    spoken = strip_speaker_tag(reply) or reply.strip()

    # Answer-disclosure safety for every persona: values protected by the
    # learner's practice state, plus any a hint tool marked forbidden at level <= 2.
    forbidden = list(protected_values or [])
    for tr in turn.tool_responses or []:
        if tr.get("name") != "get_progressive_hint":
            continue
        response = tr.get("response") or {}
        if response.get("ok") and int(response.get("hint_level") or 1) <= 2:
            forbidden.extend(str(v) for v in response.get("forbidden_values") or [])
    if forbidden:
        from backend.agents.vedic_math_coach.tools.progressive_hints import redact_forbidden_values

        spoken, _ = redact_forbidden_values(spoken, forbidden)

    # Mathematical integrity: every number must come from a tool or the learner.
    grounding = check_grounding(spoken, trusted_numbers(turn.tool_responses, learner_texts))
    if not grounding.ok:
        logger.warning("coach reply replaced by grounding guard: %s", "; ".join(grounding.notes))
        spoken = UNGROUNDED_REPLY

    tool_calc_id = extract_verified_calculation_id(turn.tool_responses)
    # Prefer an explicit client calculation_id only after ownership validation.
    chosen_id = calculation_id or tool_calc_id

    calc_ref = None
    if chosen_id:
        try:
            record = lookup_calculation(session_id, chosen_id)
            calc_ref = verified_ref(chosen_id, record)
        except HandoffError:
            # Drop forged / foreign ids rather than failing the whole chat turn.
            chosen_id = tool_calc_id
            calc_ref = None
            if chosen_id:
                try:
                    record = lookup_calculation(session_id, chosen_id)
                    calc_ref = verified_ref(chosen_id, record)
                except HandoffError:
                    chosen_id = None
                    calc_ref = None

    intent = animation_intent
    # Successful calculate_sutra / get_lesson → offer Watch unless Open was requested.
    if intent is None and chosen_id and any(
        tr.get("name") in {"calculate_sutra", "get_lesson"} and (tr.get("response") or {}).get("ok")
        for tr in turn.tool_responses
    ):
        intent = AnimationIntent.WATCH

    if intent is not None and chosen_id:
        try:
            handoff = build_animation_action(
                session_id=session_id,
                calculation_id=chosen_id,
                intent=intent,
                text=spoken,
                character_id=character_id,
                include_lesson=True,
            )
            return CoachChatResponse(
                session_id=session_id,
                message=handoff.message,
                calculation=handoff.calculation,
                actions=handoff.actions,
                lesson=handoff.lesson,
                tools_used=turn.tools_used,
            )
        except HandoffError:
            # Fall through to prose-only if animation payload is unsupported.
            pass

    handoff = compose_handoff(
        session_id=session_id,
        text=spoken,
        character_id=character_id,
        calculation_id=chosen_id if calc_ref else None,
        animation_intent=None,
    )
    return CoachChatResponse(
        session_id=session_id,
        message=AgentMessage(
            text=spoken,
            character=CharacterIdentity.from_id(character_id),
        ),
        calculation=handoff.calculation or calc_ref,
        actions=list(handoff.actions),
        lesson=handoff.lesson,
        tools_used=turn.tools_used,
    )
