"""ADK entry point for the VedicMath Coach (`root_agent`)."""

from __future__ import annotations

from pathlib import Path

# Configure LangSmith ADK tracing before the Agent is constructed when enabled.
from backend.agents.vedic_math_coach.observability import ensure_langsmith_tracing

ensure_langsmith_tracing()

from google.adk.agents import Agent

from backend.knowledge.retrieval import knowledge_rag_enabled

from .config import AGENT_NAME, GEMINI_MODEL
from .tools import COACH_TOOLS

_INSTRUCTIONS_PATH = Path(__file__).with_name("instructions.md")
_KNOWLEDGE_RAG_PATH = Path(__file__).with_name("instructions_knowledge_rag.md")
_INSTRUCTION = _INSTRUCTIONS_PATH.read_text(encoding="utf-8")
if knowledge_rag_enabled() and _KNOWLEDGE_RAG_PATH.is_file():
    _INSTRUCTION = (
        _INSTRUCTION.rstrip()
        + "\n\n"
        + _KNOWLEDGE_RAG_PATH.read_text(encoding="utf-8").strip()
        + "\n"
    )

root_agent = Agent(
    name=AGENT_NAME,
    model=GEMINI_MODEL,
    description=(
        "VedicMath AI conversational coach with Rishi, Rabbit, and "
        "Hummingbird personas. Uses deterministic maths tools for calculations, "
        "lessons, practice checks, and progressive hints"
        + (
            ", plus curated conceptual knowledge retrieval."
            if knowledge_rag_enabled()
            else "."
        )
    ),
    instruction=_INSTRUCTION,
    tools=list(COACH_TOOLS),
    # Sub-agents can be attached here later without changing the ADK entry point.
    sub_agents=[],
)
