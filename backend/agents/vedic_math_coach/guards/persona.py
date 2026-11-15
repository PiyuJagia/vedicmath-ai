"""Runtime persona check: one character speaks per reply.

The instructions tell Gemini to answer as exactly one of Rishi, Rabbit or
Hummingbird. This turns that rule into a check the backend can act on.
"""

from __future__ import annotations

from dataclasses import dataclass

from backend.agents.vedic_math_coach.personas import Persona, count_speakers, parse_speaker


@dataclass(frozen=True)
class PersonaResult:
    """Who the reply says is speaking, and whether more than one voice appears."""

    speaker: Persona | None
    speaker_count: int

    @property
    def ok(self) -> bool:
        return self.speaker_count <= 1


def check_single_speaker(reply: str) -> PersonaResult:
    """A reply with no tag counts as Rishi; two or more distinct tags fail."""
    return PersonaResult(speaker=parse_speaker(reply), speaker_count=count_speakers(reply))
