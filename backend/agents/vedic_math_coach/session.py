"""In-memory sessions and a small chat helper for the Coach Agent."""

from __future__ import annotations

from typing import Any

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from .agent import root_agent
from .config import APP_NAME


def make_session_service() -> InMemorySessionService:
    """Fresh in-memory session store (one per process / test)."""
    return InMemorySessionService()


def make_runner(session_service: InMemorySessionService | None = None) -> tuple[Runner, InMemorySessionService]:
    service = session_service or make_session_service()
    runner = Runner(app_name=APP_NAME, agent=root_agent, session_service=service)
    return runner, service


async def create_learner_session(
    session_service: InMemorySessionService,
    *,
    user_id: str,
    session_id: str | None = None,
    state: dict[str, Any] | None = None,
):
    """Open a new in-memory session for one learner."""
    return await session_service.create_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=session_id,
        state=state,
    )


def _event_text(event: Any) -> str:
    content = getattr(event, "content", None)
    if not content or not getattr(content, "parts", None):
        return ""
    chunks: list[str] = []
    for part in content.parts:
        text = getattr(part, "text", None)
        if text:
            chunks.append(text)
    return "".join(chunks)


async def chat(
    runner: Runner,
    *,
    user_id: str,
    session_id: str,
    message: str,
) -> str:
    """Send one user message and return the agent's combined text reply."""
    reply_parts: list[str] = []
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=types.Content(role="user", parts=[types.Part.from_text(text=message)]),
    ):
        if getattr(event, "error_message", None):
            raise RuntimeError(str(event.error_message))
        # Prefer final (non-partial) model text from the coach agent.
        author = getattr(event, "author", None)
        text = _event_text(event)
        if not text:
            continue
        if getattr(event, "partial", False):
            continue
        if author in {None, "user"}:
            continue
        reply_parts.append(text)
    reply = "".join(reply_parts).strip()
    if not reply:
        raise RuntimeError("Coach agent returned an empty reply.")
    return reply
