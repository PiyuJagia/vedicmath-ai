"""Deterministic checks run on a live coach reply before a learner sees it.

``review_reply`` is the single entry point. It does not change the reply; the
caller decides what to do with a failed review (for example, replace it with a
deterministic line).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Mapping

from .grounding import GroundingResult, check_grounding, trusted_numbers
from .persona import PersonaResult, check_single_speaker


@dataclass(frozen=True)
class ReplyReview:
    grounding: GroundingResult
    persona: PersonaResult

    @property
    def ok(self) -> bool:
        return self.grounding.ok and self.persona.ok

    @property
    def issues(self) -> tuple[str, ...]:
        found = list(self.grounding.notes)
        if not self.persona.ok:
            found.append(f"{self.persona.speaker_count} personas spoke in one reply")
        return tuple(found)


def review_reply(
    reply: str,
    tool_responses: Iterable[Mapping[str, Any]],
    learner_texts: Iterable[str | None] = (),
) -> ReplyReview:
    """Check grounding and persona rules for one agent reply."""
    allowed = trusted_numbers(tool_responses, learner_texts)
    return ReplyReview(grounding=check_grounding(reply, allowed), persona=check_single_speaker(reply))


__all__ = [
    "GroundingResult",
    "PersonaResult",
    "ReplyReview",
    "check_grounding",
    "check_single_speaker",
    "review_reply",
    "trusted_numbers",
]
