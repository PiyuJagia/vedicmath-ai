"""Tollgate 6A: ADK chat endpoint + handoff composition."""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.agents.gemini_connectivity import load_llm_env
from backend.agents.vedic_math_coach.handoff.chat_service import build_chat_response, strip_speaker_tag
from backend.agents.vedic_math_coach.handoff.runtime import extract_verified_calculation_id, reset_runtime_for_tests
from backend.agents.vedic_math_coach.handoff.schemas import AnimationIntent
from backend.agents.vedic_math_coach.session import ChatTurnResult
from backend.agents.vedic_math_coach.tools.calculate_sutra import calculate_sutra
from backend.agents.vedic_math_coach.tools.store import clear_store
from backend.main import app
from backend.tests.live_gate import LIVE_SKIP_REASON, ENV_PATH, live_gemini_ready

REPO_ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(autouse=True)
def _clean():
    clear_store()
    reset_runtime_for_tests()
    yield
    clear_store()
    reset_runtime_for_tests()


@pytest.fixture()
def client():
    return TestClient(app)


def _live_ready() -> bool:
    return live_gemini_ready()


live = pytest.mark.skipif(not _live_ready(), reason=LIVE_SKIP_REASON)


def test_strip_speaker_tag():
    assert strip_speaker_tag("[Boy Coach]\nHello there.") == "Hello there."
    assert strip_speaker_tag("[Rishi]\nHello there.") == "Hello there."
    assert strip_speaker_tag("[Rabbit] Watch the carry.") == "Watch the carry."


def test_extract_calculation_id_from_tool_responses():
    responses = [
        {"name": "calculate_sutra", "response": {"ok": True, "calculation_id": "c1", "result": 9506}},
        {"name": "get_lesson", "response": {"ok": True, "calculation_id": "c1", "result": 9506}},
    ]
    assert extract_verified_calculation_id(responses) == "c1"
    assert extract_verified_calculation_id([{"name": "calculate_sutra", "response": {"ok": False}}]) is None


def test_build_chat_response_offers_watch_after_calculate(client):
    session_id = client.post("/coach/sessions").json()["session_id"]
    calc = calculate_sutra("nikhilam", "beginner", a=98, b=97, session_id=session_id)
    turn = ChatTurnResult(
        text="[Boy Coach]\nThe verified product is 9506.",
        tool_calls=[{"name": "calculate_sutra", "args": {"sutra": "nikhilam", "a": 98, "b": 97}}],
        tool_responses=[
            {
                "name": "calculate_sutra",
                "response": {
                    "ok": True,
                    "calculation_id": calc["calculation_id"],
                    "result": 9506,
                },
            }
        ],
    )
    out = build_chat_response(session_id=session_id, turn=turn)
    assert out.message.character.id.value == "boy_coach"
    assert "9506" in out.message.text
    assert "[Boy Coach]" not in out.message.text
    assert out.calculation is not None
    assert out.calculation.result == 9506
    assert out.actions[0].type == "watch_animation"
    assert out.actions[0].calculation_id == calc["calculation_id"]
    assert out.tools_used == ["calculate_sutra"]


def test_build_chat_response_open_requires_structured_intent(client):
    session_id = client.post("/coach/sessions").json()["session_id"]
    calc = calculate_sutra("nikhilam", "beginner", a=98, b=97, session_id=session_id)
    turn = ChatTurnResult(
        text="[Rabbit]\nOpening the steps.",
        tool_responses=[
            {
                "name": "get_lesson",
                "response": {"ok": True, "calculation_id": calc["calculation_id"], "result": 9506},
            }
        ],
    )
    out = build_chat_response(
        session_id=session_id,
        turn=turn,
        animation_intent=AnimationIntent.OPEN,
        calculation_id=calc["calculation_id"],
    )
    assert out.actions[0].type == "open_animation"
    assert out.actions[0].auto_open is True
    assert out.lesson is not None
    assert out.lesson.result == 9506


def test_build_chat_response_ignores_forged_calculation_id(client):
    session_id = client.post("/coach/sessions").json()["session_id"]
    other = client.post("/coach/sessions").json()["session_id"]
    calc = calculate_sutra("nikhilam", "beginner", a=98, b=97, session_id=other)
    turn = ChatTurnResult(
        text="[Boy Coach]\nHere you go.",
        tool_responses=[],
    )
    out = build_chat_response(
        session_id=session_id,
        turn=turn,
        animation_intent=AnimationIntent.WATCH,
        calculation_id=calc["calculation_id"],
    )
    assert out.actions == []
    assert out.calculation is None


def test_chat_endpoint_uses_runtime(monkeypatch, client):
    session_id = client.post("/coach/sessions").json()["session_id"]
    calc = calculate_sutra("urdhva", "beginner", a=23, b=14, session_id=session_id)

    async def fake_turn(_sid: str, _message: str):
        return ChatTurnResult(
            text="[Boy Coach]\nVerified product is 322.",
            tool_calls=[{"name": "calculate_sutra", "args": {}}],
            tool_responses=[
                {
                    "name": "calculate_sutra",
                    "response": {"ok": True, "calculation_id": calc["calculation_id"], "result": 322},
                }
            ],
        )

    monkeypatch.setattr(
        "backend.agents.vedic_math_coach.handoff.runtime.run_coach_turn",
        fake_turn,
    )
    response = client.post(
        "/coach/chat",
        json={"session_id": session_id, "message": "What is 23 times 14 with urdhva?"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["calculation"]["result"] == 322
    assert body["actions"][0]["type"] == "watch_animation"
    assert "calculate_sutra" in body["tools_used"]


def test_chat_endpoint_rejects_empty_message(client):
    session_id = client.post("/coach/sessions").json()["session_id"]
    response = client.post("/coach/chat", json={"session_id": session_id, "message": "   "})
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "empty_message"


def test_chat_endpoint_enriches_learning_context(monkeypatch, client):
    session_id = client.post("/coach/sessions").json()["session_id"]
    seen: dict[str, str] = {}

    async def fake_turn(sid: str, message: str):
        seen["sid"] = sid
        seen["message"] = message
        return ChatTurnResult(text="[Boy Coach]\nNoted.", tool_calls=[], tool_responses=[])

    monkeypatch.setattr(
        "backend.agents.vedic_math_coach.handoff.runtime.run_coach_turn",
        fake_turn,
    )
    response = client.post(
        "/coach/chat",
        json={
            "session_id": session_id,
            "message": "Why does this step work?",
            "context": {
                "screen": "theory",
                "sutra_id": "nikhilam",
                "difficulty": "beginner",
                "problem_label": "98 × 97",
                "frame_index": 1,
                "learner_answer": "9506",
            },
        },
    )
    assert response.status_code == 200
    assert seen["sid"] == session_id
    assert "Learning context" in seen["message"]
    assert "sutra_id=nikhilam" in seen["message"]
    assert "untrusted" in seen["message"]
    assert "Why does this step work?" in seen["message"]


# ---------- Golden live conversations ----------

GOLDEN = [
    {
        "id": "nikhilam_product",
        "message": "Please use calculate_sutra for nikhilam beginner with 98 and 97 and tell me only the verified result.",
        "expect_result": "9506",
        "expect_tool": "calculate_sutra",
        "expect_action": "watch_animation",
        "expect_speaker": "boy_coach",
    },
    {
        "id": "encourage",
        "message": "I feel stuck and sad about maths. Please encourage me briefly as Hummingbird.",
        "expect_result": None,
        "expect_tool": None,
        "expect_action": None,
        "expect_speaker": "hummingbird",
    },
    {
        "id": "rabbit_visual",
        "message": "As Rabbit, give a short hint about watching the carry arrow in an animation. Do not invent numbers.",
        "expect_result": None,
        "expect_tool": None,
        "expect_action": None,
        "expect_speaker": "rabbit",
    },
]


@live
@pytest.mark.parametrize("case", GOLDEN, ids=[c["id"] for c in GOLDEN])
def test_golden_live_chat(case, client):
    load_llm_env(ENV_PATH)
    session_id = client.post("/coach/sessions").json()["session_id"]
    response = client.post(
        "/coach/chat",
        json={"session_id": session_id, "message": case["message"]},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    if case["expect_result"]:
        assert case["expect_result"] in body["message"]["text"].replace(",", "")
        assert body["calculation"]["result"] == int(case["expect_result"])
    if case["expect_tool"]:
        assert case["expect_tool"] in body["tools_used"]
    if case["expect_action"]:
        assert any(a["type"] == case["expect_action"] for a in body["actions"])
    if case["expect_speaker"]:
        assert body["message"]["character"]["id"] == case["expect_speaker"]
    assert os.environ["GOOGLE_API_KEY"] not in body["message"]["text"]


@live
def test_live_multi_turn_and_open_animation(client):
    load_llm_env(ENV_PATH)
    session_id = client.post("/coach/sessions").json()["session_id"]
    first = client.post(
        "/coach/chat",
        json={
            "session_id": session_id,
            "message": "Use calculate_sutra nikhilam beginner a=98 b=97. Reply with the verified result.",
        },
    )
    assert first.status_code == 200
    calc_id = first.json()["calculation"]["calculation_id"]
    assert first.json()["actions"][0]["type"] == "watch_animation"

    second = client.post(
        "/coach/chat",
        json={
            "session_id": session_id,
            "message": "Please open the animation for that calculation.",
            "animation_intent": "open_animation",
            "calculation_id": calc_id,
        },
    )
    assert second.status_code == 200
    body = second.json()
    assert body["actions"][0]["type"] == "open_animation"
    assert body["calculation"]["calculation_id"] == calc_id
    assert body["lesson"]["result"] == 9506

    # Cross-session isolation: forged id from another session must not attach actions.
    other = client.post("/coach/sessions").json()["session_id"]
    forged = client.post(
        "/coach/chat",
        json={
            "session_id": other,
            "message": "Hello",
            "animation_intent": "watch_animation",
            "calculation_id": calc_id,
        },
    )
    assert forged.status_code == 200
    assert forged.json()["actions"] == []
