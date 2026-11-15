"""Tollgate 5A: animation handoff contract (schemas + action builder + API)."""

from .errors import HandoffError
from .schemas import (
    AgentMessage,
    AnimationFormat,
    AnimationIntent,
    CharacterId,
    CharacterIdentity,
    CoachHandoffResponse,
    OpenAnimationAction,
    VerifiedCalculationRef,
    WatchAnimationAction,
)

# Lazy: importing actions/api pulls tool service → main; keep package import light.


def __getattr__(name: str):
    if name in {
        "build_animation_action",
        "compose_handoff",
        "lookup_calculation",
    }:
        from . import actions

        return getattr(actions, name)
    if name == "coach_router":
        from .api import router

        return router
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    "AgentMessage",
    "AnimationFormat",
    "AnimationIntent",
    "CharacterId",
    "CharacterIdentity",
    "CoachHandoffResponse",
    "HandoffError",
    "OpenAnimationAction",
    "VerifiedCalculationRef",
    "WatchAnimationAction",
    "build_animation_action",
    "coach_router",
    "compose_handoff",
    "lookup_calculation",
]
