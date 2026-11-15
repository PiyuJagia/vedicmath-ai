"""Tollgate 2: Gemini LLM connectivity via Google ADK.

Live tests need a repository-root `.env` with GOOGLE_API_KEY and
GOOGLE_GENAI_USE_VERTEXAI=false. They never print the API key.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

import pytest

from backend.agents.gemini_connectivity import (
    GEMINI_MODEL,
    ask_gemini,
    load_llm_env,
    redact_secrets,
    require_ai_studio_config,
)
from backend.tests.live_gate import LIVE_SKIP_REASON, ENV_PATH, live_gemini_ready

REPO_ROOT = Path(__file__).resolve().parents[2]


def _live_ready() -> bool:
    return live_gemini_ready()


def test_env_example_documents_ai_studio_flag():
    example = (REPO_ROOT / ".env.example").read_text(encoding="utf-8")
    assert "GOOGLE_API_KEY=" in example
    assert "GOOGLE_GENAI_USE_VERTEXAI=false" in example


@pytest.mark.skipif(not ENV_PATH.is_file(), reason="repository-root .env is absent")
def test_dotenv_loads_from_repo_root_without_exposing_secrets():
    path = load_llm_env(ENV_PATH)
    assert path == ENV_PATH
    key = os.getenv("GOOGLE_API_KEY") or ""
    assert key, "GOOGLE_API_KEY should be loaded from .env"
    assert (os.getenv("GOOGLE_GENAI_USE_VERTEXAI") or "").strip().lower() in {"false", "0", "no"}
    # The loaded secret must not appear in model id or path strings we log about.
    assert key not in GEMINI_MODEL
    assert key not in str(path)


def test_redact_secrets_strips_key_shaped_text(monkeypatch):
    fake = "AIzaSyDummyKeyValueForUnitTestOnly012345"
    monkeypatch.setenv("GOOGLE_API_KEY", fake)
    message = f"auth failed for key={fake} and GOOGLE_API_KEY={fake}"
    cleaned = redact_secrets(message)
    assert fake not in cleaned
    assert "[REDACTED]" in cleaned


def test_missing_api_key_fails_gracefully(monkeypatch):
    monkeypatch.setenv("GOOGLE_GENAI_USE_VERTEXAI", "false")
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="GOOGLE_API_KEY"):
        require_ai_studio_config()


def test_vertex_ai_flag_rejected(monkeypatch):
    monkeypatch.setenv("GOOGLE_API_KEY", "not-a-real-key")
    monkeypatch.setenv("GOOGLE_GENAI_USE_VERTEXAI", "true")
    with pytest.raises(RuntimeError, match="GOOGLE_GENAI_USE_VERTEXAI"):
        require_ai_studio_config()


def test_invalid_api_key_fails_without_leaking_secret(monkeypatch):
    bogus = "AIzaSyInvalidConnectivityProbeKey000000000"
    monkeypatch.setenv("GOOGLE_API_KEY", bogus)
    monkeypatch.setenv("GOOGLE_GENAI_USE_VERTEXAI", "false")
    with pytest.raises(Exception) as raised:
        asyncio.run(ask_gemini("Hello, can you hear me?"))
    text = redact_secrets(f"{raised.value!s} {raised.value!r}")
    assert bogus not in text


@pytest.mark.skipif(not _live_ready(), reason=LIVE_SKIP_REASON)
def test_gemini_responds_to_hello():
    load_llm_env(ENV_PATH)
    require_ai_studio_config()
    assert GEMINI_MODEL == "gemini-3.8-flash"
    reply = asyncio.run(ask_gemini("Hello, can you hear me?"))
    assert isinstance(reply, str)
    assert len(reply) > 0
    assert any(token in reply.lower() for token in ("yes", "hello", "hear", "here", "hi"))
    assert os.environ["GOOGLE_API_KEY"] not in reply
