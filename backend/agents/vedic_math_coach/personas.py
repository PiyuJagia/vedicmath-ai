"""Character personas for the VedicMath Coach.

Only one persona should speak in a given agent reply. The instruction file
asks the model to prefix that reply with a speaker tag.
"""

from __future__ import annotations

import re
from enum import Enum


class Persona(str, Enum):
    BOY_COACH = "Boy Coach"
    RABBIT = "Rabbit"
    HUMMINGBIRD = "Hummingbird"


PERSONA_TAGS = {
    Persona.BOY_COACH: "[Boy Coach]",
    Persona.RABBIT: "[Rabbit]",
    Persona.HUMMINGBIRD: "[Hummingbird]",
}

_SPEAKER_RE = re.compile(
    r"^\s*\[(?P<name>Boy Coach|Rabbit|Hummingbird)\]\s*",
    re.IGNORECASE | re.MULTILINE,
)


def parse_speaker(reply: str) -> Persona | None:
    """Return the persona tagged at the start of a reply, if any."""
    match = _SPEAKER_RE.search(reply or "")
    if not match:
        return None
    name = match.group("name").title()
    if name.lower() == "boy coach":
        return Persona.BOY_COACH
    if name.lower() == "rabbit":
        return Persona.RABBIT
    if name.lower() == "hummingbird":
        return Persona.HUMMINGBIRD
    return None


def count_speakers(reply: str) -> int:
    """How many distinct persona tags appear anywhere in the reply."""
    found = {match.group(1).lower() for match in re.finditer(r"\[(Boy Coach|Rabbit|Hummingbird)\]", reply or "", re.I)}
    return len(found)


def suggest_persona(user_message: str) -> Persona:
    """Heuristic expected routing for tests (mirrors the instruction guidance)."""
    text = (user_message or "").lower()
    rabbit_cues = (
        "arrow",
        "animation",
        "carry",
        "borrow",
        "digit",
        "tile",
        "hint",
        "visual",
        "stage",
        "moving",
    )
    bird_cues = (
        "encourage",
        "motivat",
        "streak",
        "passed",
        "milestone",
        "proud",
        "cheer",
        "stuck and sad",
        "give up",
    )
    if any(cue in text for cue in rabbit_cues):
        return Persona.RABBIT
    if any(cue in text for cue in bird_cues):
        return Persona.HUMMINGBIRD
    return Persona.BOY_COACH
