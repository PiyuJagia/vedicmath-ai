"""Minimal Gemini connectivity helpers for Tollgate 2 (no Coach Agent).

Uses Google ADK's Gemini model wrapper against the Gemini Developer API
(AI Studio). Does not implement tools or educational agents.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

from dotenv import load_dotenv
from google.adk.models.google_llm import Gemini
from google.adk.models.llm_request import LlmRequest
from google.genai import types

# Concrete Gemini Developer API model that accepts new AI Studio keys.
# ADK 2.14 still defaults to gemini-2.5-flash, but that id returns 404 for new
# users; the API recommends gemini-3.8-flash instead.
GEMINI_MODEL = "gemini-3.8-flash"

_REPO_ROOT = Path(__file__).resolve().parents[2]
_SECRET_PATTERNS = (
    re.compile(r"AIza[0-9A-Za-z_\-]{10,}"),
    re.compile(r"(?i)(api[_-]?key|apikey)\s*[:=]\s*\S+"),
)


def load_llm_env(env_path: Path | None = None) -> Path:
    """Load the repository-root `.env` into the process environment.

    Returns the path that was loaded. Does not print secret values.
    """
    path = env_path or (_REPO_ROOT / ".env")
    if not path.is_file():
        raise FileNotFoundError(f"Expected LLM env file at {path}")
    load_dotenv(path, override=False)
    return path


def load_llm_env_if_present(env_path: Path | None = None) -> Path | None:
    """Load the repository-root `.env` when it exists; otherwise rely on the process env.

    Hosted deployments (Render) inject GOOGLE_API_KEY / LANGSMITH_* as real
    environment variables and have no `.env` file, so a missing file is normal.
    """
    path = env_path or (_REPO_ROOT / ".env")
    if not path.is_file():
        return None
    load_dotenv(path, override=False)
    return path


def require_ai_studio_config() -> None:
    """Confirm we are using the Gemini Developer API, not Vertex AI."""
    flag = (os.getenv("GOOGLE_GENAI_USE_VERTEXAI") or "false").strip().lower()
    if flag not in {"false", "0", "no"}:
        raise RuntimeError(
            "GOOGLE_GENAI_USE_VERTEXAI must be false for AI Studio connectivity. "
            f"Got {flag!r}."
        )
    if not (os.getenv("GOOGLE_API_KEY") or "").strip():
        raise RuntimeError("GOOGLE_API_KEY is missing or empty.")


def redact_secrets(text: str) -> str:
    """Strip API-key-shaped substrings from error text before logging or asserting."""
    cleaned = text
    for pattern in _SECRET_PATTERNS:
        cleaned = pattern.sub("[REDACTED]", cleaned)
    key = os.getenv("GOOGLE_API_KEY") or ""
    if key and key in cleaned:
        cleaned = cleaned.replace(key, "[REDACTED]")
    return cleaned


async def ask_gemini(message: str, *, model: str = GEMINI_MODEL) -> str:
    """Send one user message through ADK's Gemini wrapper and return the text reply."""
    require_ai_studio_config()
    llm = Gemini(model=model)
    request = LlmRequest(
        model=model,
        contents=[
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=message)],
            )
        ],
    )
    texts: list[str] = []
    async for response in llm.generate_content_async(request, stream=False):
        if response.error_message:
            raise RuntimeError(redact_secrets(response.error_message))
        if response.content and response.content.parts:
            for part in response.content.parts:
                if getattr(part, "text", None):
                    texts.append(part.text)
    reply = "".join(texts).strip()
    if not reply:
        raise RuntimeError("Gemini returned an empty response.")
    return reply
