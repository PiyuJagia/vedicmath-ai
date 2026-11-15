"""FastAPI routes for the Coach animation handoff contract + ADK chat."""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, HTTPException, Request

from .errors import HandoffError
from .schemas import (
    AnimationIntent,
    AnimationResolveRequest,
    CalculateRequest,
    CalculateResponse,
    CoachChatRequest,
    CoachChatResponse,
    CoachHandoffResponse,
    CreateSessionResponse,
    HandoffComposeRequest,
    HandoffErrorResponse,
)


router = APIRouter(prefix="/coach", tags=["coach"])
logger = logging.getLogger(__name__)


def _http_error(error: HandoffError) -> HTTPException:
    return HTTPException(
        status_code=error.status_code,
        detail=error.as_dict(),
    )


def _actions():
    from . import actions

    return actions


def _calculate_sutra():
    from backend.agents.vedic_math_coach.tools.calculate_sutra import calculate_sutra

    return calculate_sutra


@router.post("/sessions", response_model=CreateSessionResponse)
async def create_coach_session() -> CreateSessionResponse:
    """Mint a learner/session id and open a matching ADK conversation session."""
    session_id = str(uuid.uuid4())
    from .runtime import ensure_adk_session

    try:
        await ensure_adk_session(session_id)
    except Exception:  # noqa: BLE001 — session mint still useful without ADK warm-up
        pass
    return CreateSessionResponse(session_id=session_id)


@router.post(
    "/calculations",
    response_model=CalculateResponse,
    responses={400: {"model": HandoffErrorResponse}, 403: {"model": HandoffErrorResponse}},
)
def create_calculation(body: CalculateRequest) -> CalculateResponse:
    """Run a deterministic calculation and optionally offer watch_animation."""
    actions = _actions()
    result = _calculate_sutra()(
        body.sutra,
        body.difficulty,
        a=body.a,
        b=body.b,
        number=body.number,
        session_id=body.session_id,
    )
    if not result.get("ok"):
        raise HTTPException(
            status_code=400,
            detail={
                "ok": False,
                "code": result.get("code", "engine_error"),
                "message": result.get("message", "Calculation failed."),
            },
        )

    calculation_id = result["calculation_id"]
    try:
        record = actions.lookup_calculation(body.session_id, calculation_id)
        calc = actions.verified_ref(calculation_id, record)
    except HandoffError as error:
        raise _http_error(error) from error

    try:
        if body.offer_watch:
            handoff = actions.build_animation_action(
                session_id=body.session_id,
                calculation_id=calculation_id,
                intent=AnimationIntent.WATCH,
                text=body.text,
                character_id=body.character_id,
                include_lesson=True,
            )
        else:
            handoff = actions.compose_handoff(
                session_id=body.session_id,
                text=body.text,
                character_id=body.character_id,
                calculation_id=calculation_id,
                animation_intent=None,
            )
    except HandoffError as error:
        raise _http_error(error) from error

    return CalculateResponse(
        calculation=calc,
        teaching_steps=list(result.get("teaching_steps") or []),
        handoff=handoff,
    )


@router.post(
    "/animations",
    response_model=CoachHandoffResponse,
    responses={
        400: {"model": HandoffErrorResponse},
        403: {"model": HandoffErrorResponse},
        404: {"model": HandoffErrorResponse},
        422: {"model": HandoffErrorResponse},
    },
)
def resolve_animation(body: AnimationResolveRequest) -> CoachHandoffResponse:
    """Resolve watch_animation or open_animation from a structured intent."""
    try:
        return _actions().build_animation_action(
            session_id=body.session_id,
            calculation_id=body.calculation_id,
            intent=body.intent,
            text=body.text,
            character_id=body.character_id,
        )
    except HandoffError as error:
        raise _http_error(error) from error


@router.post(
    "/handoff",
    response_model=CoachHandoffResponse,
    responses={
        400: {"model": HandoffErrorResponse},
        403: {"model": HandoffErrorResponse},
        404: {"model": HandoffErrorResponse},
        422: {"model": HandoffErrorResponse},
    },
)
def compose_coach_handoff(body: HandoffComposeRequest) -> CoachHandoffResponse:
    """Compose conversational text with optional structured animation actions."""
    try:
        return _actions().compose_handoff(
            session_id=body.session_id,
            text=body.text,
            character_id=body.character_id,
            calculation_id=body.calculation_id,
            animation_intent=body.animation_intent,
        )
    except HandoffError as error:
        raise _http_error(error) from error


@router.post(
    "/chat",
    response_model=CoachChatResponse,
    responses={
        400: {"model": HandoffErrorResponse},
        429: {"model": HandoffErrorResponse},
        503: {"model": HandoffErrorResponse},
    },
)
async def coach_chat(body: CoachChatRequest, request: Request) -> CoachChatResponse:
    """Live ADK Coach turn: Gemini + deterministic tools → typed UI handoff."""
    from .chat_service import build_chat_response
    from .context import enrich_learner_message, protected_practice_values, validate_learning_context
    from .limits import IP_LIMITER, SESSION_LIMITER
    from .runtime import run_coach_turn

    message = (body.message or "").strip()
    if not message:
        raise HTTPException(
            status_code=400,
            detail={"ok": False, "code": "empty_message", "message": "Please type a message for the coach."},
        )
    if not (body.session_id or "").strip():
        raise HTTPException(
            status_code=400,
            detail={"ok": False, "code": "missing_session", "message": "A learner session id is required."},
        )

    # Cost control: bound live turns per learner session and per client IP.
    # Render's proxy puts the client address first in X-Forwarded-For.
    forwarded = (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
    client_ip = forwarded or (request.client.host if request.client else "unknown")
    if not SESSION_LIMITER.allow(body.session_id.strip()) or not IP_LIMITER.allow(client_ip):
        raise HTTPException(
            status_code=429,
            detail={
                "ok": False,
                "code": "rate_limited",
                "message": "Rishi needs a short breather. Please try again in a minute.",
            },
        )

    # Sanitize UI context; never trust client maths as authoritative.
    try:
        context = validate_learning_context(body.context)
    except (ValueError, TypeError) as error:
        raise HTTPException(
            status_code=400,
            detail={
                "ok": False,
                "code": "invalid_context",
                "message": f"Learning context is invalid: {error}",
            },
        ) from error

    # Progressive Rabbit hints: serve verified packets without the LLM when possible.
    from .deterministic_hint import try_deterministic_rabbit_hint

    deterministic = try_deterministic_rabbit_hint(
        session_id=body.session_id.strip(),
        message=message,
        context=context,
    )
    if deterministic is not None:
        return deterministic

    enriched = enrich_learner_message(message, context)

    try:
        turn = await run_coach_turn(body.session_id.strip(), enriched)
    except RuntimeError as error:
        # Details (already secret-redacted) go to server logs only, never to the learner.
        logger.warning("coach_chat failed: %s", error)
        raise HTTPException(
            status_code=503,
            detail={
                "ok": False,
                "code": "coach_unavailable",
                "message": "The coach is temporarily unavailable. Please try again.",
            },
        ) from error

    return build_chat_response(
        session_id=body.session_id.strip(),
        turn=turn,
        animation_intent=body.animation_intent,
        calculation_id=body.calculation_id,
        protected_values=protected_practice_values(context),
    )
