"""Tollgate 5A: animation handoff contract (watch / open actions)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.agents.vedic_math_coach.handoff.actions import build_animation_action, compose_handoff
from backend.agents.vedic_math_coach.handoff.errors import HandoffError
from backend.agents.vedic_math_coach.handoff.schemas import AnimationIntent
from backend.agents.vedic_math_coach.tools.calculate_sutra import calculate_sutra
from backend.agents.vedic_math_coach.tools.get_lesson import get_lesson
from backend.agents.vedic_math_coach.tools.service import build_lesson
from backend.agents.vedic_math_coach.tools.store import clear_store, get_calculation
from backend.main import app


@pytest.fixture(autouse=True)
def _clean_store():
    clear_store()
    yield
    clear_store()


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def session_a(client):
    return client.post("/coach/sessions").json()["session_id"]


@pytest.fixture()
def session_b(client):
    return client.post("/coach/sessions").json()["session_id"]


def _calc(session_id: str, *, a: int = 98, b: int = 97):
    out = calculate_sutra("nikhilam", "beginner", a=a, b=b, session_id=session_id)
    assert out["ok"] is True
    return out


def test_watch_animation_after_calculation(session_a):
    calc = _calc(session_a)
    handoff = build_animation_action(
        session_id=session_a,
        calculation_id=calc["calculation_id"],
        intent=AnimationIntent.WATCH,
        text="Want to watch the steps?",
    )
    assert handoff.ok is True
    assert handoff.message.text == "Want to watch the steps?"
    assert handoff.message.character.display_name == "Rabbit"
    assert len(handoff.actions) == 1
    action = handoff.actions[0]
    assert action.type == "watch_animation"
    assert action.auto_open is False
    assert action.calculation_id == calc["calculation_id"]
    assert action.animation_format.value == "grouped"
    assert handoff.calculation is not None
    assert handoff.calculation.result == 9506
    assert handoff.lesson is not None
    assert handoff.lesson.animation_steps


def test_open_animation_requires_structured_intent(session_a):
    calc = _calc(session_a)
    handoff = build_animation_action(
        session_id=session_a,
        calculation_id=calc["calculation_id"],
        intent=AnimationIntent.OPEN,
        character_id="rabbit",
        text="Opening the animation now.",
    )
    assert handoff.actions[0].type == "open_animation"
    assert handoff.actions[0].auto_open is True
    assert handoff.message.character.id.value == "rabbit"
    assert handoff.lesson is not None
    assert handoff.lesson.result == 9506


def test_watch_and_open_share_same_calculation_and_lesson(session_a):
    calc = _calc(session_a)
    watch = build_animation_action(
        session_id=session_a,
        calculation_id=calc["calculation_id"],
        intent="watch_animation",
    )
    opened = build_animation_action(
        session_id=session_a,
        calculation_id=calc["calculation_id"],
        intent="open_animation",
    )
    assert watch.calculation.calculation_id == opened.calculation.calculation_id
    assert watch.lesson.animation_steps == opened.lesson.animation_steps
    assert watch.lesson.result == opened.lesson.result == 9506


def test_repeated_animation_requests_do_not_recalculate_via_llm(session_a, monkeypatch):
    """Handoff path reuses cached engine animation; no fresh calculate_sutra."""
    calc = _calc(session_a)
    first = build_animation_action(
        session_id=session_a,
        calculation_id=calc["calculation_id"],
        intent=AnimationIntent.OPEN,
    )

    calls = {"build_lesson": 0}

    def counting_build(*args, **kwargs):
        calls["build_lesson"] += 1
        return build_lesson(*args, **kwargs)

    monkeypatch.setattr(
        "backend.agents.vedic_math_coach.handoff.actions._build_lesson",
        counting_build,
    )

    second = build_animation_action(
        session_id=session_a,
        calculation_id=calc["calculation_id"],
        intent=AnimationIntent.OPEN,
    )
    third = build_animation_action(
        session_id=session_a,
        calculation_id=calc["calculation_id"],
        intent=AnimationIntent.WATCH,
    )

    # First open already cached animation_steps on the store; later requests reuse it.
    assert calls["build_lesson"] == 0
    assert second.lesson.animation_steps == first.lesson.animation_steps
    assert third.actions[0].calculation_id == calc["calculation_id"]


def test_forged_and_cross_session_ids_rejected(session_a, session_b):
    calc = _calc(session_a)

    with pytest.raises(HandoffError) as forged:
        build_animation_action(
            session_id=session_a,
            calculation_id="00000000-0000-0000-0000-000000000000",
            intent=AnimationIntent.WATCH,
        )
    assert forged.value.code == "unknown_calculation"

    with pytest.raises(HandoffError) as cross:
        build_animation_action(
            session_id=session_b,
            calculation_id=calc["calculation_id"],
            intent=AnimationIntent.OPEN,
        )
    assert cross.value.code == "unauthorized_calculation"

    # Tool layer also rejects cross-session access.
    denied = get_lesson(calculation_id=calc["calculation_id"], session_id=session_b)
    assert denied["ok"] is False
    assert denied["code"] == "unauthorized_calculation"


def test_missing_session_and_empty_animation_do_not_produce_actions(session_a, monkeypatch):
    with pytest.raises(HandoffError) as missing:
        compose_handoff(session_id="", text="hi")
    assert missing.value.code == "missing_session"

    calc = _calc(session_a)
    record = get_calculation(calc["calculation_id"])
    assert record is not None

    def empty_lesson(*_a, **_k):
        return {
            "sutra_id": "nikhilam",
            "sutra": "nikhilam",
            "numbers": [98, 97],
            "difficulty": "beginner",
            "operands": {},
            "teaching_steps": [{"id": "x"}],
            "animation_steps": [],
            "result": 9506,
            "animation_format": "empty",
            "problem": record["problem"],
        }

    monkeypatch.setattr(
        "backend.agents.vedic_math_coach.handoff.actions._build_lesson",
        empty_lesson,
    )
    with pytest.raises(HandoffError) as unsupported:
        build_animation_action(
            session_id=session_a,
            calculation_id=calc["calculation_id"],
            intent=AnimationIntent.WATCH,
        )
    assert unsupported.value.code == "unsupported_animation"


def test_animation_payload_matches_deterministic_engine(session_a):
    calc = _calc(session_a)
    engine = build_lesson("nikhilam", "beginner", a=98, b=97)
    handoff = build_animation_action(
        session_id=session_a,
        calculation_id=calc["calculation_id"],
        intent=AnimationIntent.OPEN,
    )
    assert handoff.lesson.animation_steps == engine["animation_steps"]
    assert handoff.lesson.animation_format.value == engine["animation_format"]
    # Mutating the response must not alter the store (immutability of source).
    handoff.lesson.animation_steps[0]["events"] = [{"action": "fabricated_by_llm"}]
    again = build_animation_action(
        session_id=session_a,
        calculation_id=calc["calculation_id"],
        intent=AnimationIntent.OPEN,
    )
    assert again.lesson.animation_steps == engine["animation_steps"]


def test_http_calculate_offers_watch_and_open_resolve(client, session_a):
    created = client.post(
        "/coach/calculations",
        json={
            "session_id": session_a,
            "sutra": "nikhilam",
            "difficulty": "beginner",
            "a": 98,
            "b": 97,
            "text": "Verified product ready.",
        },
    )
    assert created.status_code == 200
    body = created.json()
    assert body["ok"] is True
    assert body["calculation"]["result"] == 9506
    assert body["handoff"]["actions"][0]["type"] == "watch_animation"
    assert "animation_steps" not in body["handoff"]["message"]
    cid = body["calculation"]["calculation_id"]

    opened = client.post(
        "/coach/animations",
        json={
            "session_id": session_a,
            "calculation_id": cid,
            "intent": "open_animation",
            "character_id": "rabbit",
            "text": "Here comes the stage.",
        },
    )
    assert opened.status_code == 200
    open_body = opened.json()
    assert open_body["actions"][0]["type"] == "open_animation"
    assert open_body["actions"][0]["auto_open"] is True
    assert open_body["lesson"]["result"] == 9506
    assert open_body["calculation"]["calculation_id"] == cid


def test_http_rejects_forged_id_and_invalid_intent(client, session_a):
    forged = client.post(
        "/coach/animations",
        json={
            "session_id": session_a,
            "calculation_id": "not-a-real-id",
            "intent": "open_animation",
        },
    )
    assert forged.status_code == 404
    assert forged.json()["detail"]["code"] == "unknown_calculation"

    bad_intent = client.post(
        "/coach/animations",
        json={
            "session_id": session_a,
            "calculation_id": "whatever",
            "intent": "please_show_animation",
        },
    )
    assert bad_intent.status_code == 422  # pydantic validation on enum


def test_compose_without_intent_has_no_actions(session_a):
    calc = _calc(session_a)
    handoff = compose_handoff(
        session_id=session_a,
        text="Nice work on 98 × 97.",
        character_id="boy_coach",
        calculation_id=calc["calculation_id"],
        animation_intent=None,
    )
    assert handoff.actions == []
    assert handoff.lesson is None
    assert handoff.calculation.result == 9506
