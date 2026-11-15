"""Controlled errors for the animation handoff contract."""

from __future__ import annotations

from typing import Any


class HandoffError(Exception):
    """Raised when an animation action cannot be built safely."""

    def __init__(self, code: str, message: str, *, status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code

    def as_dict(self) -> dict[str, Any]:
        return {"ok": False, "code": self.code, "message": self.message}


MISSING_SESSION = ("missing_session", "A learner session id is required.", 400)
UNKNOWN_CALCULATION = ("unknown_calculation", "That calculation_id was not found.", 404)
UNAUTHORIZED_CALCULATION = (
    "unauthorized_calculation",
    "That calculation_id does not belong to this session.",
    403,
)
UNSUPPORTED_ANIMATION = (
    "unsupported_animation",
    "No animation payload is available for this calculation.",
    422,
)
INVALID_INTENT = (
    "invalid_intent",
    "animation_intent must be watch_animation or open_animation.",
    400,
)
ENGINE_ERROR = ("engine_error", "The maths engine could not load this lesson.", 500)


def raise_handoff(code_tuple: tuple[str, str, int]) -> None:
    code, message, status = code_tuple
    raise HandoffError(code, message, status_code=status)
