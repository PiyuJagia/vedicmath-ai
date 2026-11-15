"""VedicMath Coach agent package (Google ADK).

Importable both as ``backend.agents.vedic_math_coach`` in pytest and as the
top-level ``vedic_math_coach`` package when running ``adk web backend/agents``.
"""

from .agent import root_agent

__all__ = ["root_agent"]
