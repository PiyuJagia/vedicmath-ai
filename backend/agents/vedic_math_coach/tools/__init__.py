"""ADK tools that wrap the existing deterministic maths engines."""

from .calculate_sutra import calculate_sutra
from .check_practice_answer import check_practice_answer
from .get_lesson import get_lesson

COACH_TOOLS = [
    calculate_sutra,
    get_lesson,
    check_practice_answer,
]

__all__ = [
    "COACH_TOOLS",
    "calculate_sutra",
    "get_lesson",
    "check_practice_answer",
]
