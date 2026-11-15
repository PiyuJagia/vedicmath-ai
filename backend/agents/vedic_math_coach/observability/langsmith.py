"""LangSmith tracing for Google ADK coach execution (Rishi).

Verified stack: Google ADK + Gemini (not LangChain). Official integration:
``langsmith.integrations.google_adk.configure_google_adk``
Docs: https://docs.langchain.com/langsmith/trace-with-google-adk

Enable with LANGSMITH_TRACING=true and LANGSMITH_API_KEY. Prefer agent addressing:
LANGSMITH_AGENT_ID + LANGSMITH_AGENT_ENVIRONMENT. Failures never break coaching.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_REPO_ROOT = Path(__file__).resolve().parents[4]
_CONFIGURED = False
_DOTENV_LOADED = False
_LAST_STATUS: dict[str, Any] = {"enabled": False}


def _soft_load_dotenv() -> None:
    """Load repo `.env` once. Do not re-apply after tests clear env vars."""
    global _DOTENV_LOADED
    if _DOTENV_LOADED:
        return
    try:
        from dotenv import load_dotenv

        env_path = _REPO_ROOT / ".env"
        if env_path.is_file():
            load_dotenv(env_path, override=False)
        _DOTENV_LOADED = True
    except Exception:  # noqa: BLE001
        _DOTENV_LOADED = True
        return


def _truthy(name: str) -> bool:
    return (os.getenv(name) or "").strip().lower() in {"1", "true", "yes", "on"}


def langsmith_tracing_enabled() -> bool:
    """True when tracing is opted in and an API key is present."""
    _soft_load_dotenv()
    if not _truthy("LANGSMITH_TRACING"):
        return False
    return bool((os.getenv("LANGSMITH_API_KEY") or "").strip())


def langsmith_available() -> bool:
    try:
        import langsmith  # noqa: F401
        from langsmith.integrations.google_adk import configure_google_adk  # noqa: F401

        return True
    except Exception:  # noqa: BLE001
        return False


def _sanitize_metadata(meta: dict[str, Any] | None) -> dict[str, Any]:
    from backend.agents.vedic_math_coach.eval.observability.sanitize import (
        sanitize_trace_metadata,
    )

    return sanitize_trace_metadata(meta)


def production_io_redaction_enabled() -> bool:
    """Redact learner I/O in custom spans for production / explicit opt-in."""
    _soft_load_dotenv()
    if _truthy("VEDIC_LANGSMITH_REDACT_IO"):
        return True
    env = (os.getenv("LANGSMITH_AGENT_ENVIRONMENT") or "local").strip().lower()
    return env in {"production", "prod"}


def privacy_process_inputs(inputs: dict[str, Any]) -> dict[str, Any]:
    """Strip runner objects; hash ids / redact message text when required."""
    import hashlib

    out: dict[str, Any] = {}
    redact = production_io_redaction_enabled()
    for key, value in (inputs or {}).items():
        if key == "runner":
            continue
        if key in {"user_id", "session_id"} and value is not None:
            digest = hashlib.sha256(str(value).encode("utf-8")).hexdigest()[:16]
            out[key] = digest if redact else str(value)
        elif key == "message" and redact:
            text = str(value or "")
            out[key] = f"[REDACTED_MESSAGE chars={len(text)}]"
        else:
            out[key] = value
    return out


def privacy_process_outputs(outputs: dict[str, Any]) -> dict[str, Any]:
    if not production_io_redaction_enabled():
        # Still drop bulky tool payloads from custom parent span when huge.
        return outputs or {}
    result = dict(outputs or {})
    if "text" in result:
        text = str(result.get("text") or "")
        result["text"] = f"[REDACTED_REPLY chars={len(text)}]"
    if "tool_calls" in result:
        result["tool_calls"] = [
            {"name": (c or {}).get("name")} for c in (result.get("tool_calls") or [])
        ]
    if "tool_responses" in result:
        result["tool_responses"] = [
            {"name": (r or {}).get("name"), "ok": ((r or {}).get("response") or {}).get("ok")}
            for r in (result.get("tool_responses") or [])
        ]
    return result


def ensure_langsmith_tracing(
    *,
    metadata: dict[str, Any] | None = None,
    tags: list[str] | None = None,
    force_reconfigure: bool = False,
) -> dict[str, Any]:
    """Configure ADK→LangSmith once for this process when enabled.

    Captures agent runs, Gemini LLM calls, and tool invocations (including
    ``calculate_sutra`` / ``get_progressive_hint``) via the official ADK wrappers.
    """
    global _CONFIGURED, _LAST_STATUS
    _soft_load_dotenv()

    agent_id = (os.getenv("LANGSMITH_AGENT_ID") or "vedicmath-ai-rishi").strip()
    agent_env = (os.getenv("LANGSMITH_AGENT_ENVIRONMENT") or "local").strip()
    endpoint = (os.getenv("LANGSMITH_ENDPOINT") or "https://api.smith.langchain.com").strip()
    status: dict[str, Any] = {
        "enabled": False,
        "configured": _CONFIGURED,
        "agent_id": agent_id,
        "agent_environment": agent_env,
        "endpoint": endpoint,
        "sdk_available": langsmith_available(),
        "error": None,
    }

    if not langsmith_tracing_enabled():
        status["reason"] = (
            "Set LANGSMITH_TRACING=true and LANGSMITH_API_KEY to enable tracing."
        )
        _LAST_STATUS = status
        return status

    if _CONFIGURED and not force_reconfigure:
        status["enabled"] = True
        status["configured"] = True
        _LAST_STATUS = status
        return status

    if not langsmith_available():
        status["error"] = 'Install with: pip install "langsmith[google-adk]"'
        _LAST_STATUS = status
        return status

    try:
        from langsmith.address import agent_address
        from langsmith.integrations.google_adk import configure_google_adk

        # Ensure endpoint is visible to the SDK (dotenv may have set it already).
        os.environ.setdefault("LANGSMITH_ENDPOINT", endpoint)
        os.environ.setdefault("LANGSMITH_AGENT_ID", agent_id)
        os.environ.setdefault("LANGSMITH_AGENT_ENVIRONMENT", agent_env)

        # Prefer agent addressing. LANGSMITH_PROJECT in the environment conflicts
        # with LANGSMITH_AGENT_ID/ENVIRONMENT and causes traces to be dropped.
        # Keep the logical project name in metadata/tags only.
        project_label = (os.getenv("LANGSMITH_PROJECT") or "vedicmath-ai-rishi").strip()
        cleared_project = os.environ.pop("LANGSMITH_PROJECT", None)

        meta = _sanitize_metadata(
            {
                "app": "vedicmath-ai",
                "coach": "rishi",
                "framework": "google-adk",
                "model": os.getenv("VEDIC_TRACE_MODEL") or "gemini-3.8-flash",
                "langsmith_project_label": project_label,
                "io_redaction": production_io_redaction_enabled(),
                **(metadata or {}),
            }
        )
        tag_list = sorted(
            set(
                [
                    "vedicmath-ai",
                    "rishi",
                    "google-adk",
                    agent_id,
                    agent_env,
                    project_label,
                    *(tags or []),
                ]
            )
        )

        # Agent addressing (preferred). Do not pass project_name with address.
        ok = configure_google_adk(
            name="vedicmath_rishi_session",
            address=agent_address(agent_id, agent_env),
            metadata=meta,
            tags=tag_list,
        )
        # Restore label for other tools that read LANGSMITH_PROJECT as a name only.
        if cleared_project is not None:
            os.environ["LANGSMITH_PROJECT"] = cleared_project
        elif project_label:
            os.environ["LANGSMITH_PROJECT"] = project_label
        status["project_label"] = project_label
        status["destination"] = "agent_address"
        status["io_redaction"] = production_io_redaction_enabled()
        if cleared_project:
            status["note"] = (
                "Cleared LANGSMITH_PROJECT during configure_google_adk to avoid "
                "agent-address vs project conflict; restored afterward as a label."
            )
        if not ok:
            status["error"] = "configure_google_adk returned False"
            _LAST_STATUS = status
            return status

        _CONFIGURED = True
        status.update({"enabled": True, "configured": True})
        _LAST_STATUS = status
        logger.info(
            "LangSmith ADK tracing enabled for agent=%s env=%s",
            agent_id,
            agent_env,
        )
        return status
    except Exception as exc:  # noqa: BLE001 — never break coaching on trace setup
        logger.warning("LangSmith configure failed; continuing without tracing: %s", exc)
        status["error"] = str(exc)
        _LAST_STATUS = status
        return status


def last_langsmith_status() -> dict[str, Any]:
    return dict(_LAST_STATUS)


def reset_langsmith_config_state_for_tests() -> None:
    global _CONFIGURED, _LAST_STATUS
    _CONFIGURED = False
    _LAST_STATUS = {"enabled": False}
