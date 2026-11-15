"""Process-wide ADK Runner for FastAPI coach chat (in-memory sessions)."""

from __future__ import annotations

import asyncio
from typing import Any

from google.adk.errors.already_exists_error import AlreadyExistsError
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

from backend.agents.gemini_connectivity import load_llm_env_if_present, redact_secrets, require_ai_studio_config
from backend.agents.vedic_math_coach.config import APP_NAME
from backend.agents.vedic_math_coach.observability import ensure_langsmith_tracing
from backend.agents.vedic_math_coach.session import ChatTurnResult, chat_turn, make_runner

_runtime_lock = asyncio.Lock()
_runner: Runner | None = None
_service: InMemorySessionService | None = None
_llm_ready = False


def _ensure_llm() -> None:
    global _llm_ready
    if _llm_ready:
        return
    load_llm_env_if_present()
    require_ai_studio_config()
    # Re-ensure after dotenv load so LANGSMITH_* from .env are applied.
    ensure_langsmith_tracing()
    _llm_ready = True


def get_runtime() -> tuple[Runner, InMemorySessionService]:
    """Lazy singleton Runner + session service for this process."""
    global _runner, _service
    if _runner is None or _service is None:
        ensure_langsmith_tracing()
        _runner, _service = make_runner()
    return _runner, _service


def reset_runtime_for_tests() -> None:
    """Drop the singleton (tests only)."""
    global _runner, _service, _llm_ready
    _runner = None
    _service = None
    _llm_ready = False


async def ensure_adk_session(session_id: str) -> None:
    """Create the ADK session if missing. user_id == session_id for ownership."""
    if not session_id or not str(session_id).strip():
        raise ValueError("session_id is required")
    sid = str(session_id).strip()
    _, service = get_runtime()
    existing = await service.get_session(app_name=APP_NAME, user_id=sid, session_id=sid)
    if existing is not None:
        return
    try:
        await service.create_session(app_name=APP_NAME, user_id=sid, session_id=sid)
    except AlreadyExistsError:
        return


async def run_coach_turn(session_id: str, message: str) -> ChatTurnResult:
    """Ensure session + LLM config, then run one ADK chat turn."""
    async with _runtime_lock:
        try:
            _ensure_llm()
        except Exception as error:  # noqa: BLE001
            raise RuntimeError(redact_secrets(str(error))) from error
        await ensure_adk_session(session_id)
        runner, _ = get_runtime()
        try:
            return await chat_turn(
                runner,
                user_id=session_id,
                session_id=session_id,
                message=message,
            )
        except Exception as error:  # noqa: BLE001
            raise RuntimeError(redact_secrets(str(error))) from error


def extract_verified_calculation_id(tool_responses: list[dict[str, Any]]) -> str | None:
    """Pick the latest backend-minted calculation_id from successful tool payloads."""
    found: str | None = None
    for item in tool_responses:
        name = item.get("name")
        response = item.get("response") or {}
        if name not in {"calculate_sutra", "get_lesson"}:
            continue
        if not response.get("ok"):
            continue
        cid = response.get("calculation_id")
        if isinstance(cid, str) and cid.strip():
            found = cid.strip()
    return found
