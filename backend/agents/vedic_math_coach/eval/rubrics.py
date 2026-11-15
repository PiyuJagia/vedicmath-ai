"""Teaching-intelligence rubrics (0–4) for Phase 7B.

Deterministic heuristics score what can be machine-checked.
Optional LLM-as-judge fills semantic criteria only when credits exist.
Arithmetic truth is NEVER delegated to an LLM judge.
"""

from __future__ import annotations

from typing import Any

# Criterion → what it measures (for reports / docs)
RUBRIC_CRITERIA: dict[str, str] = {
    "mathematical_grounding": "Agreement with verified mathematical evidence",
    "intermediate_step_accuracy": "Intermediate claims match engine teaching steps",
    "conceptual_understanding": "Explains why the method works (not only the result)",
    "age_appropriateness": "Accessible, respectful language for school-age learners",
    "misconception_diagnosis": "Identifies a supported error pattern when evidence exists",
    "hint_quality": "Progressive hint respects disclosure level",
    "persona_appropriateness": "Correct use of Rishi / Rabbit / Hummingbird",
    "context_relevance": "Responds to the actual sutra, problem, and step",
    "next_step_guidance": "Useful, app-real next action when appropriate",
    "unsupported_abstention": "Refuses unsupported methods / fabricated history",
    "instructional_usefulness": "Helps the learner make progress without answer dumps",
}

# Pass threshold when a criterion applies (0–4 scale)
PASS_THRESHOLD = 3


def score_to_normalized(score: int | float | None) -> float | None:
    if score is None:
        return None
    return round(max(0.0, min(4.0, float(score))) / 4.0, 3)


def apply_pass_gate(scores: dict[str, int | None]) -> bool:
    """A case passes when every applicable criterion scores >= PASS_THRESHOLD."""
    applicable = [s for s in scores.values() if s is not None]
    if not applicable:
        return False
    return all(s >= PASS_THRESHOLD for s in applicable)


def heuristic_age_appropriateness(text: str) -> int:
    lowered = (text or "").lower()
    penalties = 0
    for bad in ("idiot", "stupid", "dumb", "shut up", "magical sutra", "magic trick that always"):
        if bad in lowered:
            penalties += 1
    if len(text or "") > 1800:
        penalties += 1
    if penalties == 0:
        return 4
    if penalties == 1:
        return 2
    return 0


def heuristic_persona(expected: str | None, actual: str | None) -> int | None:
    if not expected:
        return None
    return 4 if expected == actual else 0


def heuristic_unsupported_abstention(text: str, expect: dict[str, Any]) -> int | None:
    if not expect.get("check_unsupported_abstention"):
        return None
    lowered = (text or "").lower()
    banned = expect.get("text_excludes_any") or []
    if any(b.lower() in lowered for b in banned):
        return 0
    # Soft positive: acknowledges limitation or steers to supported sutra
    if any(p in lowered for p in ("not supported", "this app", "instead", "urdhva", "nikhilam", "don't have")):
        return 4
    return 3


def heuristic_fake_history(text: str, expect: dict[str, Any]) -> int | None:
    if not expect.get("check_no_fake_history"):
        return None
    lowered = (text or "").lower()
    banned = expect.get("text_excludes_any") or [
        "you have mastered",
        "yesterday you",
        "your streak is",
        "you always",
    ]
    if any(b.lower() in lowered for b in banned):
        return 0
    return 4


def heuristic_conceptual_cues(text: str, expect: dict[str, Any]) -> int | None:
    if not expect.get("check_conceptual_cues"):
        return None
    required = expect.get("conceptual_cues") or []
    if not required:
        return None
    lowered = (text or "").lower()
    hits = sum(1 for c in required if c.lower() in lowered)
    if hits == len(required):
        return 4
    if hits >= max(1, len(required) // 2):
        return 3
    if hits >= 1:
        return 2
    return 0


def heuristic_misconception_diagnosis(text: str, expect: dict[str, Any]) -> int | None:
    """Score whether the reply names a supported error pattern when required."""
    if not expect.get("check_misconception"):
        return None
    lowered = (text or "").lower()
    required = [c.lower() for c in (expect.get("misconception_cues") or [])]
    banned = [b.lower() for b in (expect.get("text_excludes_any") or [])]
    if banned and any(b in lowered for b in banned):
        return 0
    if not required:
        return 3 if lowered.strip() else 0
    hits = sum(1 for c in required if c in lowered)
    if hits == len(required):
        return 4
    if hits >= 1:
        return 3
    return 0


def heuristic_context_relevance(text: str, expect: dict[str, Any]) -> int | None:
    if not expect.get("check_context_relevance"):
        return None
    required = [c.lower() for c in (expect.get("context_cues") or [])]
    if not required:
        return None
    lowered = (text or "").lower()
    hits = sum(1 for c in required if c in lowered)
    if hits == len(required):
        return 4
    if hits >= max(1, len(required) // 2):
        return 3
    return 0
