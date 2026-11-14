"""ADK entry point for the VedicMath Coach (`root_agent`)."""

from __future__ import annotations

from pathlib import Path

from google.adk.agents import Agent

from .config import AGENT_NAME, GEMINI_MODEL

_INSTRUCTIONS_PATH = Path(__file__).with_name("instructions.md")
_INSTRUCTION = _INSTRUCTIONS_PATH.read_text(encoding="utf-8")

root_agent = Agent(
    name=AGENT_NAME,
    model=GEMINI_MODEL,
    description=(
        "VedicMath AI conversational coach with Boy Coach, Rabbit, and "
        "Hummingbird personas. Guides learning; calculation tools are not "
        "connected yet."
    ),
    instruction=_INSTRUCTION,
    # Sub-agents can be attached here later without changing the ADK entry point.
    sub_agents=[],
)
