"""In-memory sessions and a small chat helper for the Coach Agent."""

from __future__ import annotations

from dataclasses import dataclass, field
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


def _as_dict(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return dict(value)
    if hasattr(value, "items"):
        try:
            return dict(value.items())
        except Exception:  # noqa: BLE001
            return {}
    if hasattr(value, "model_dump"):
        try:
            dumped = value.model_dump()
            return dumped if isinstance(dumped, dict) else {}
        except Exception:  # noqa: BLE001
            return {}
    return {}


@dataclass
class ChatTurnResult:
    """One ADK turn: spoken text plus backend-observed tool traffic."""

    text: str
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    tool_responses: list[dict[str, Any]] = field(default_factory=list)

    @property
    def tools_used(self) -> list[str]:
        names: list[str] = []
        for call in self.tool_calls:
            name = call.get("name")
            if isinstance(name, str) and name not in names:
                names.append(name)
        return names


async def _chat_turn_impl(
    runner: Runner,
    *,
    user_id: str,
    session_id: str,
    message: str,
) -> ChatTurnResult:
    """Send one user message; return text plus observed tool calls/responses."""
    reply_parts: list[str] = []
    tool_calls: list[dict[str, Any]] = []
    tool_responses: list[dict[str, Any]] = []

    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=types.Content(role="user", parts=[types.Part.from_text(text=message)]),
    ):
        if getattr(event, "error_message", None):
            raise RuntimeError(str(event.error_message))

        content = getattr(event, "content", None)
        if content and getattr(content, "parts", None):
            for part in content.parts:
                fc = getattr(part, "function_call", None)
                if fc is not None and getattr(fc, "name", None):
                    tool_calls.append(
                        {
                            "name": fc.name,
                            "args": _as_dict(getattr(fc, "args", None)),
                        }
                    )
                fr = getattr(part, "function_response", None)
                if fr is not None and getattr(fr, "name", None):
                    tool_responses.append(
                        {
                            "name": fr.name,
                            "response": _as_dict(getattr(fr, "response", None)),
                        }
                    )

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
    return ChatTurnResult(text=reply, tool_calls=tool_calls, tool_responses=tool_responses)


def _wrap_chat_turn(fn):
    """Attach a LangSmith parent span when the SDK is installed (no-op otherwise)."""
    try:
        from langsmith import traceable

        from backend.agents.vedic_math_coach.observability.langsmith import (
            privacy_process_inputs,
            privacy_process_outputs,
        )

        return traceable(
            name="rishi_chat_turn",
            run_type="chain",
            metadata={"coach": "rishi", "framework": "google-adk"},
            process_inputs=privacy_process_inputs,
            process_outputs=privacy_process_outputs,
        )(fn)
    except Exception:  # noqa: BLE001
        return fn


chat_turn = _wrap_chat_turn(_chat_turn_impl)


async def chat(
    runner: Runner,
    *,
    user_id: str,
    session_id: str,
    message: str,
) -> str:
    """Send one user message and return the agent's combined text reply."""
    result = await chat_turn(runner, user_id=user_id, session_id=session_id, message=message)
    return result.text
