"""Expose the coach's maths tools to any MCP client.

The tools are the same functions Rishi calls through Google ADK
(``backend.agents.vedic_math_coach.tools``), so an MCP client gets exactly the
engine-verified results the app uses. Nothing here does arithmetic.

One deliberate difference from the ADK tools: calculations are stored under
one session per server process, because MCP clients have no learner session.
Like the ADK tool, ``check_practice_answer`` never returns the correct value for
a wrong answer, so a client can coach with hints without leaking it.
"""

from __future__ import annotations

import uuid
from typing import Any, Optional

from mcp.server.mcpserver import MCPServer

from backend.agents.vedic_math_coach import tools
from backend.knowledge.retrieval import knowledge_rag_enabled

SERVER_NAME = "vedicmath"

INSTRUCTIONS = (
    "Deterministic Vedic Maths engines for five Sutras: nikhilam, urdhva, ekadhikena, "
    "yavadunam and ekanyunena. Use these tools for every number; do not compute results yourself. "
    "Nikhilam deviations are base - number; Yavadunam deviations are number - base."
)


def build_server(session_id: str | None = None) -> MCPServer:
    """Create the server. Each server process owns one calculation session."""
    owner = session_id or f"mcp-{uuid.uuid4().hex[:12]}"
    server = MCPServer(name=SERVER_NAME, instructions=INSTRUCTIONS)

    @server.tool()
    def calculate_sutra(
        sutra: str,
        difficulty: str = "beginner",
        a: Optional[int] = None,
        b: Optional[int] = None,
        number: Optional[int] = None,
    ) -> dict[str, Any]:
        """Run a Vedic Maths calculation and return the result, teaching steps and a calculation_id.

        Args:
            sutra: nikhilam, urdhva, ekadhikena, yavadunam or ekanyunena.
            difficulty: beginner, intermediate or advanced.
            a: First factor (nikhilam, urdhva).
            b: Second factor (nikhilam, urdhva).
            number: Single operand (ekadhikena, yavadunam, ekanyunena).
        """
        return tools.calculate_sutra(sutra, difficulty=difficulty, a=a, b=b, number=number, session_id=owner)

    @server.tool()
    def get_lesson(
        sutra: Optional[str] = None,
        difficulty: str = "beginner",
        a: Optional[int] = None,
        b: Optional[int] = None,
        number: Optional[int] = None,
        calculation_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """Return teaching steps and animation events, from a calculation_id or from operands.

        Args:
            sutra: nikhilam, urdhva, ekadhikena, yavadunam or ekanyunena.
            difficulty: beginner, intermediate or advanced.
            a: First factor (nikhilam, urdhva).
            b: Second factor (nikhilam, urdhva).
            number: Single operand (ekadhikena, yavadunam, ekanyunena).
            calculation_id: An id returned by calculate_sutra on this server.
        """
        return tools.get_lesson(
            sutra=sutra,
            difficulty=difficulty,
            a=a,
            b=b,
            number=number,
            calculation_id=calculation_id,
            session_id=owner,
        )

    @server.tool()
    def check_practice_answer(
        sutra: str,
        question_key: str,
        answer: str,
        difficulty: str = "beginner",
        a: Optional[int] = None,
        b: Optional[int] = None,
        number: Optional[int] = None,
    ) -> dict[str, Any]:
        """Grade a learner's answer to one practice step: correct, incorrect or invalid, with a mistake tag.

        Args:
            sutra: nikhilam, urdhva, ekadhikena, yavadunam or ekanyunena.
            question_key: The practice step, for example left_part or result.
            answer: The learner's answer text.
            difficulty: beginner, intermediate or advanced.
            a: First factor (nikhilam, urdhva).
            b: Second factor (nikhilam, urdhva).
            number: Single operand (ekadhikena, yavadunam, ekanyunena).
        """
        return tools.check_practice_answer(sutra, question_key, answer, difficulty=difficulty, a=a, b=b, number=number)

    @server.tool()
    def get_progressive_hint(
        sutra: str,
        hint_level: int = 1,
        difficulty: str = "beginner",
        question_key: Optional[str] = None,
        a: Optional[int] = None,
        b: Optional[int] = None,
        number: Optional[int] = None,
    ) -> dict[str, Any]:
        """Return a level-gated hint (1 = nudge, 2 = operation, 3 = guided step) from verified lesson data.

        Args:
            sutra: nikhilam, urdhva, ekadhikena, yavadunam or ekanyunena.
            hint_level: 1, 2 or 3.
            difficulty: beginner, intermediate or advanced.
            question_key: The practice step the learner is on.
            a: First factor (nikhilam, urdhva).
            b: Second factor (nikhilam, urdhva).
            number: Single operand (ekadhikena, yavadunam, ekanyunena).
        """
        return tools.get_progressive_hint(
            sutra,
            hint_level=hint_level,
            difficulty=difficulty,
            question_key=question_key,
            a=a,
            b=b,
            number=number,
        )

    # Same switch as the agent: the knowledge pack is off unless VEDIC_KNOWLEDGE_RAG is set.
    if knowledge_rag_enabled():

        @server.tool()
        def search_vedic_math_knowledge(
            question: str = "",
            sutra_id: Optional[str] = None,
            difficulty: Optional[str] = None,
        ) -> dict[str, Any]:
            """Search the curated Vedic Maths concept pack for why/how explanations. Reference text only.

            Args:
                question: The question in natural language.
                sutra_id: Optional Sutra filter.
                difficulty: beginner, intermediate or advanced.
            """
            return tools.search_vedic_math_knowledge(question=question, sutra_id=sutra_id, difficulty=difficulty)

    return server
