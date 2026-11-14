"""Structured tool errors (never raise secrets or stack traces to the model)."""

from __future__ import annotations

from typing import Any


def tool_error(code: str, message: str, **extra: Any) -> dict[str, Any]:
    return {"ok": False, "code": code, "message": message, **extra}


def tool_ok(**payload: Any) -> dict[str, Any]:
    return {"ok": True, **payload}
