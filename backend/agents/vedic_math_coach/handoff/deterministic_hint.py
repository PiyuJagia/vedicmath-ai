"""Deterministic Rabbit hint replies (Phase 7A) — no LLM required for early hints."""

from __future__ import annotations

import re
from typing import Optional

from backend.agents.vedic_math_coach.tools.progressive_hints import build_progressive_hint

from .schemas import (
    AgentMessage,
    CharacterId,
    CharacterIdentity,
    CoachChatResponse,
    CoachLearningContext,
)

_HINT_CUES = (
    "hint",
    "rabbit",
    "stuck",
    "help me",
    "don't get",
    "dont get",
    "too hard",
    "visual",
    "what should i look",
)


def _operands_from_context(context: CoachLearningContext) -> tuple[Optional[int], Optional[int], Optional[int]]:
    a = b = number = None
    nums = [int(n) for n in re.findall(r"\d+", context.problem_label or "")]
    sutra = context.sutra_id or ""
    if sutra in {"nikhilam", "urdhva"} and len(nums) >= 2:
        a, b = nums[0], nums[1]
    elif sutra in {"ekadhikena", "yavadunam", "ekanyunena"} and nums:
        number = nums[0]
    return a, b, number


def wants_deterministic_hint(message: str, context: CoachLearningContext | None) -> bool:
    if context is None or context.hint_level is None or not context.sutra_id:
        return False
    text = (message or "").lower()
    return any(cue in text for cue in _HINT_CUES)


def try_deterministic_rabbit_hint(
    *,
    session_id: str,
    message: str,
    context: CoachLearningContext | None,
) -> CoachChatResponse | None:
    """Return a Rabbit reply from verified hint packets when appropriate."""
    if not wants_deterministic_hint(message, context) or context is None:
        return None

    level = max(1, min(3, int(context.hint_level or 1)))
    a, b, number = _operands_from_context(context)
    if a is None and b is None and number is None:
        return None

    packet = build_progressive_hint(
        sutra=context.sutra_id or "",
        difficulty=context.difficulty or "beginner",
        hint_level=level,
        question_key=context.question_key,
        a=a,
        b=b,
        number=number,
    )
    if not packet.get("ok"):
        return None

    text = str(packet.get("allowed_text") or "").strip()
    if not text:
        return None

    return CoachChatResponse(
        session_id=session_id,
        message=AgentMessage(
            text=text,
            character=CharacterIdentity.from_id(CharacterId.RABBIT),
        ),
        calculation=None,
        actions=[],
        lesson=None,
        tools_used=["get_progressive_hint"],
    )
