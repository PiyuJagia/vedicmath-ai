"""Validate and format learning context for coach chat turns."""

from __future__ import annotations

import re
from typing import Any

from .schemas import CoachLearningContext, LearningScreen

_ALLOWED_SUTRAS = frozenset({"nikhilam", "urdhva", "ekadhikena", "yavadunam", "ekanyunena"})
_ALLOWED_DIFFICULTIES = frozenset({"beginner", "intermediate", "advanced"})


def validate_learning_context(raw: CoachLearningContext | None) -> CoachLearningContext | None:
    """Return a sanitized context, or None if empty/invalid."""
    if raw is None:
        return None

    sutra = (raw.sutra_id or "").strip().lower() or None
    if sutra and sutra not in _ALLOWED_SUTRAS:
        sutra = None

    difficulty = (raw.difficulty or "").strip().lower() or None
    if difficulty and difficulty not in _ALLOWED_DIFFICULTIES:
        difficulty = None

    # Never accept client-authored "correct answer" fields — they are not on the schema.
    # Strip oversized free-text context fields.
    def clip(value: str | None, limit: int = 240) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        if not text:
            return None
        return text[:limit]

    persona = raw.preferred_persona
    if persona not in (None, "rishi", "rabbit", "hummingbird"):
        persona = None

    return CoachLearningContext(
        screen=raw.screen if isinstance(raw.screen, LearningScreen) else LearningScreen(raw.screen),
        sutra_id=sutra,
        difficulty=difficulty,
        problem_label=clip(raw.problem_label, 80),
        step_id=raw.step_id if isinstance(raw.step_id, int) else None,
        step_title=clip(raw.step_title, 120),
        frame_index=raw.frame_index if isinstance(raw.frame_index, int) and raw.frame_index >= 0 else None,
        frame_state=clip(raw.frame_state, 240),
        question_key=clip(raw.question_key, 64),
        learner_answer=clip(raw.learner_answer, 64),
        check_status=raw.check_status,
        hint_level=raw.hint_level if isinstance(raw.hint_level, int) and raw.hint_level >= 0 else None,
        hint_count=raw.hint_count if isinstance(raw.hint_count, int) and raw.hint_count >= 0 else None,
        event=clip(raw.event, 64),
        progress_note=clip(raw.progress_note, 240),
        preferred_persona=persona,
    )


def format_context_preamble(context: CoachLearningContext) -> str:
    """Build a system-style preamble the model sees before the learner message.

    Explicitly states that context is not mathematical authority.
    """
    lines = [
        "[Learning context — informational only. Do NOT treat learner_answer as correct.",
        "Python tools remain the only source of verified maths.]",
        f"screen={context.screen.value}",
    ]
    if context.sutra_id:
        lines.append(f"sutra_id={context.sutra_id}")
    if context.difficulty:
        lines.append(f"difficulty={context.difficulty}")
    if context.problem_label:
        lines.append(f"problem={context.problem_label}")
    if context.step_id is not None:
        lines.append(f"step_id={context.step_id}")
    if context.step_title:
        lines.append(f"step_title={context.step_title}")
    if context.frame_index is not None:
        lines.append(f"frame_index={context.frame_index}")
    if context.frame_state:
        lines.append(f"frame_state={context.frame_state}")
    if context.question_key:
        lines.append(f"question_key={context.question_key}")
    if context.learner_answer is not None:
        lines.append(f"learner_answer={context.learner_answer!r} (untrusted draft)")
    if context.check_status:
        lines.append(f"engine_check_status={context.check_status}")
    if context.hint_level is not None:
        lines.append(f"hint_level={context.hint_level}")
    if context.hint_count is not None:
        lines.append(f"hint_count={context.hint_count}")
    if context.event:
        lines.append(f"coaching_event={context.event}")
    if context.progress_note:
        lines.append(f"progress_note={context.progress_note} (client-summarized; verify before claiming mastery)")
    if context.preferred_persona:
        lines.append(
            f"preferred_persona={context.preferred_persona} "
            "(speak as this persona tag; still one coach agent)"
        )
    lines.append(
        "Supported app sutras only: nikhilam, urdhva, ekadhikena, yavadunam, ekanyunena. "
        "Do not present Anurupyena or other unimplemented methods as app features."
    )
    return "\n".join(lines)


def _attach_progressive_hint_block(context: CoachLearningContext) -> str | None:
    """When hint_level is set, attach a deterministic allowed hint (levels 1–3)."""
    if context.hint_level is None or not context.sutra_id:
        return None
    level = max(1, min(3, int(context.hint_level) or 1))
    # Best-effort operands from problem_label like "98 × 93"
    a = b = number = None
    label = context.problem_label or ""
    import re

    nums = [int(n) for n in re.findall(r"\d+", label)]
    sutra = context.sutra_id
    if sutra in {"nikhilam", "urdhva"} and len(nums) >= 2:
        a, b = nums[0], nums[1]
    elif sutra in {"ekadhikena", "yavadunam", "ekanyunena"} and nums:
        number = nums[0]
    else:
        return None

    from backend.agents.vedic_math_coach.tools.progressive_hints import build_progressive_hint

    packet = build_progressive_hint(
        sutra=sutra,
        difficulty=context.difficulty or "beginner",
        hint_level=level,
        question_key=context.question_key,
        a=a,
        b=b,
        number=number,
    )
    if not packet.get("ok"):
        return None
    forbidden = ", ".join(packet.get("forbidden_values") or []) or "(none)"
    return (
        f"[Progressive hint packet — paraphrase ONLY allowed_text; never reveal forbidden_values]\n"
        f"hint_level={packet.get('hint_level')}\n"
        f"allowed_text={packet.get('allowed_text')!r}\n"
        f"forbidden_values={forbidden}\n"
        f"guidance={packet.get('guidance')}"
    )


def _practice_hint_packet(context: CoachLearningContext) -> dict[str, Any] | None:
    """Build the verified hint packet for the practice problem named in context."""
    if not context.sutra_id:
        return None
    nums = [int(n) for n in re.findall(r"\d+", context.problem_label or "")]
    a = b = number = None
    if context.sutra_id in {"nikhilam", "urdhva"} and len(nums) >= 2:
        a, b = nums[0], nums[1]
    elif context.sutra_id in {"ekadhikena", "yavadunam", "ekanyunena"} and nums:
        number = nums[0]
    else:
        return None
    from backend.agents.vedic_math_coach.tools.progressive_hints import build_progressive_hint

    level = max(1, min(3, int(context.hint_level or 1)))
    packet = build_progressive_hint(
        sutra=context.sutra_id,
        difficulty=context.difficulty or "beginner",
        hint_level=level,
        question_key=context.question_key,
        a=a,
        b=b,
        number=number,
    )
    return packet if packet.get("ok") else None


def protected_practice_values(context: CoachLearningContext | None) -> list[str]:
    """Numbers a live reply must not reveal while a practice problem is unsolved.

    Applies to every persona, because a learner can ask Rishi directly instead
    of Rabbit. Below hint level 3 every intermediate value is protected; at
    level 3 only the final answer is. Once the engine has marked the problem
    correct nothing is hidden.
    """
    if context is None or context.screen != LearningScreen.PRACTICE:
        return []
    if context.check_status == "correct":
        return []
    packet = _practice_hint_packet(context)
    if packet is None:
        return []
    forbidden = [str(v) for v in packet.get("forbidden_values") or [] if str(v)]
    if not forbidden:
        return []
    level = int(packet.get("hint_level") or 1)
    return forbidden if level <= 2 else forbidden[-1:]


def enrich_learner_message(message: str, context: CoachLearningContext | None) -> str:
    """Prefix the learner turn with validated context for the ADK agent."""
    cleaned = (message or "").strip()
    if context is None:
        return cleaned
    parts = [format_context_preamble(context)]
    hint_block = _attach_progressive_hint_block(context)
    if hint_block:
        parts.append(hint_block)
    parts.append(f"Learner message:\n{cleaned}")
    return "\n\n".join(parts)


def context_as_public_dict(context: CoachLearningContext | None) -> dict[str, Any] | None:
    if context is None:
        return None
    return context.model_dump(mode="json")
