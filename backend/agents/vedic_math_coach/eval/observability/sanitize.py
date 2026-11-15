"""Sanitize synthetic eval payloads before any remote tracing export."""

from __future__ import annotations

import re
from typing import Any

_SECRET_PATTERNS = [
    re.compile(r"(?i)(api[_-]?key|token|authorization|bearer)\s*[:=]\s*\S+"),
    re.compile(r"AIza[0-9A-Za-z\-_]{20,}"),
    re.compile(r"(?i)langsmith[_-]?api[_-]?key\s*[:=]\s*\S+"),
]

_PII_HINTS = re.compile(
    r"(?i)\b(email|phone|address|ssn|student[_-]?id|parent|guardian)\b\s*[:=]\s*\S+"
)


def redact_secrets(text: str) -> str:
    out = text or ""
    for pattern in _SECRET_PATTERNS:
        out = pattern.sub("[REDACTED_SECRET]", out)
    out = _PII_HINTS.sub("[REDACTED_PII_FIELD]", out)
    return out


def sanitize_message(text: str, *, synthetic: bool = True) -> str:
    """Eval traces must use synthetic learner text only."""
    cleaned = redact_secrets(text)
    if not synthetic:
        # Production learner traffic must not be exported in 7B.5.
        return "[REDACTED_NON_SYNTHETIC]"
    return cleaned


def sanitize_tool_args(args: dict[str, Any] | None) -> dict[str, Any]:
    if not args:
        return {}
    safe: dict[str, Any] = {}
    for key, value in args.items():
        key_l = str(key).lower()
        if any(s in key_l for s in ("key", "token", "secret", "password", "authorization")):
            safe[key] = "[REDACTED]"
        elif isinstance(value, str):
            safe[key] = redact_secrets(value)[:500]
        elif isinstance(value, (int, float, bool)) or value is None:
            safe[key] = value
        else:
            safe[key] = redact_secrets(str(value))[:500]
    return safe


def sanitize_trace_metadata(meta: dict[str, Any] | None) -> dict[str, Any]:
    base = dict(meta or {})
    # Keep internal knowledge paths out of remote metadata
    for banned in ("api_key", "GOOGLE_API_KEY", "LANGSMITH_API_KEY", "database_url"):
        base.pop(banned, None)
    return {k: (redact_secrets(str(v)) if isinstance(v, str) else v) for k, v in base.items()}
