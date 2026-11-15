"""Runtime grounding check: every number in a live reply must come from the engines.

The coach instructions ask Gemini never to do arithmetic itself. This module
enforces that rule after the fact. A reply passes when:

* every number it states appears in this turn's tool results or in text the
  learner supplied (their message, the problem label, their own answer), and
* every simple equation it writes (``98 - 3 = 95``) is arithmetically true.

Small counting words such as "step 2" or "two numbers" are always allowed, as
are the powers of ten used as Sutra bases.

Known limit: a number is matched by its absolute value, so a reply that drops
the minus sign from an engine value (deviation -3 written as 3) still passes.
Sign mistakes are caught when they appear inside an equation.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Iterable, Mapping

from backend.agents.vedic_math_coach.eval.intermediate_claims import (
    extract_claimed_equations,
    verify_equation_string,
)

# Ordinals and counts ("step 3", "level 2", "10 seconds") never need a source.
SMALL_NUMBER_LIMIT = 10
SUTRA_BASES = frozenset({10, 100, 1000, 10000})

# A number token: optional thousands separators, not part of a larger word.
_NUMBER_RE = re.compile(r"(?<![\w.])\d{1,3}(?:,\d{3})+(?![\w,])|(?<![\w.])\d+(?!\w)")


def _numbers_in_text(text: str) -> set[int]:
    return {int(token.replace(",", "")) for token in _NUMBER_RE.findall(text or "")}


def _collect(value: Any, found: set[int]) -> None:
    if isinstance(value, bool):
        return
    if isinstance(value, int):
        found.add(abs(value))
    elif isinstance(value, float) and value.is_integer():
        found.add(abs(int(value)))
    elif isinstance(value, str):
        found.update(_numbers_in_text(value))
    elif isinstance(value, Mapping):
        for item in value.values():
            _collect(item, found)
    elif isinstance(value, (list, tuple, set, frozenset)):
        for item in value:
            _collect(item, found)


def trusted_numbers(
    tool_responses: Iterable[Mapping[str, Any]],
    learner_texts: Iterable[str | None] = (),
) -> frozenset[int]:
    """Numbers the reply may state: successful tool results plus learner-supplied text."""
    found: set[int] = set()
    for item in tool_responses or ():
        response = item.get("response") or {}
        if response.get("ok") is False:
            continue
        _collect(response, found)
    for text in learner_texts:
        found.update(_numbers_in_text(text or ""))
    return frozenset(found)


@dataclass(frozen=True)
class GroundingResult:
    """Outcome of checking one reply."""

    ungrounded_numbers: tuple[int, ...] = ()
    false_equations: tuple[str, ...] = ()
    notes: tuple[str, ...] = field(default=())

    @property
    def ok(self) -> bool:
        return not self.ungrounded_numbers and not self.false_equations


def check_grounding(reply: str, allowed: frozenset[int]) -> GroundingResult:
    """Check a reply against the numbers it is allowed to state."""
    false_equations = tuple(
        claim for claim in extract_claimed_equations(reply) if verify_equation_string(claim) is False
    )
    ungrounded = sorted(
        number
        for number in _numbers_in_text(reply)
        if number > SMALL_NUMBER_LIMIT and number not in SUTRA_BASES and number not in allowed
    )
    notes = []
    if ungrounded:
        notes.append(f"{len(ungrounded)} number(s) not produced by a tool or the learner")
    if false_equations:
        notes.append(f"{len(false_equations)} false equation(s)")
    return GroundingResult(
        ungrounded_numbers=tuple(ungrounded),
        false_equations=false_equations,
        notes=tuple(notes),
    )
