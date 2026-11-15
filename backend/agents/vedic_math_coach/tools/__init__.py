"""ADK tools that wrap the existing deterministic maths engines."""

from backend.knowledge.retrieval import knowledge_rag_enabled

from .calculate_sutra import calculate_sutra
from .check_practice_answer import check_practice_answer
from .get_lesson import get_lesson
from .progressive_hints import get_progressive_hint
from .search_vedic_math_knowledge import search_vedic_math_knowledge

COACH_TOOLS = [
    calculate_sutra,
    get_lesson,
    check_practice_answer,
    get_progressive_hint,
]

# Feature-flagged until Phase 7C approval for production coaching retrieval.
if knowledge_rag_enabled():
    COACH_TOOLS.append(search_vedic_math_knowledge)

__all__ = [
    "COACH_TOOLS",
    "calculate_sutra",
    "get_lesson",
    "check_practice_answer",
    "get_progressive_hint",
    "search_vedic_math_knowledge",
]
