"""Phase 7A: progressive hints must not leak protected answers early."""

from __future__ import annotations

from backend.agents.vedic_math_coach.handoff.chat_service import build_chat_response
from backend.agents.vedic_math_coach.handoff.schemas import CharacterId
from backend.agents.vedic_math_coach.session import ChatTurnResult
from backend.agents.vedic_math_coach.tools.progressive_hints import (
    build_progressive_hint,
    get_progressive_hint,
    redact_forbidden_values,
)
from backend.agents.vedic_math_coach.tools.store import clear_store
from fastapi.testclient import TestClient

from backend.main import app


def setup_function():
    clear_store()


def test_level1_deviation_hint_excludes_answer_digit():
    packet = build_progressive_hint(
        sutra="nikhilam",
        difficulty="beginner",
        hint_level=1,
        question_key="deviation_a",
        a=98,
        b=93,
    )
    assert packet["ok"] is True
    assert packet["hint_level"] == 1
    assert "2" in packet["forbidden_values"]
    assert "2" not in packet["allowed_text"].split()
    assert "9114" in packet["forbidden_values"] or "9114" in packet["forbidden_values"]
    assert "9114" not in packet["allowed_text"]


def test_level2_names_operation_without_answer():
    packet = get_progressive_hint("nikhilam", hint_level=2, question_key="deviation_a", a=98, b=93)
    assert packet["ok"]
    assert "base" in packet["allowed_text"].lower()
    assert "2" in packet["forbidden_values"]
    # Must not say the deviation is 2
    assert "deviation is 2" not in packet["allowed_text"].lower()
    assert " drops by 2" not in packet["allowed_text"].lower()


def test_level3_may_show_expression_still_forbids_answer_token():
    packet = build_progressive_hint(
        sutra="nikhilam",
        difficulty="beginner",
        hint_level=3,
        question_key="deviation_a",
        a=98,
        b=93,
    )
    assert "100" in packet["allowed_text"] and "98" in packet["allowed_text"]
    assert "2" in packet["forbidden_values"]


def test_redact_forbidden_values_strips_leak():
    text = "For 98, the arrow drops by 2 to reach the tile."
    cleaned, changed = redact_forbidden_values(text, ["2", "9114"])
    assert changed is True
    assert "2" not in cleaned.split()
    assert "…" in cleaned


def test_chat_response_redacts_rabbit_leak_when_hint_tool_used():
    client = TestClient(app)
    session_id = client.post("/coach/sessions").json()["session_id"]
    turn = ChatTurnResult(
        text="[Rabbit]\nFor 98, the arrow drops by 2.",
        tool_responses=[
            {
                "name": "get_progressive_hint",
                "response": {
                    "ok": True,
                    "hint_level": 1,
                    "allowed_text": "Look at how far 98 sits from the base.",
                    "forbidden_values": ["2", "9114"],
                },
            }
        ],
    )
    out = build_chat_response(session_id=session_id, turn=turn)
    assert out.message.character.id == CharacterId.RABBIT
    assert "2" not in out.message.text.split()
    assert "..." in out.message.text.replace("…", "...") or "hid a number" in out.message.text.lower()


def test_rishi_display_name_on_chat_envelope():
    client = TestClient(app)
    session_id = client.post("/coach/sessions").json()["session_id"]
    turn = ChatTurnResult(text="[Rishi]\nLet's look at the base together.")
    out = build_chat_response(session_id=session_id, turn=turn)
    assert out.message.character.id.value == "boy_coach"
    assert out.message.character.display_name == "Rishi"


def test_deterministic_rabbit_hint_endpoint_no_llm():
    client = TestClient(app)
    session_id = client.post("/coach/sessions").json()["session_id"]
    response = client.post(
        "/coach/chat",
        json={
            "session_id": session_id,
            "message": "As Rabbit, give me a hint about the deviation.",
            "context": {
                "screen": "practice",
                "sutra_id": "nikhilam",
                "difficulty": "beginner",
                "problem_label": "98 × 93",
                "question_key": "deviation_a",
                "hint_level": 1,
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["message"]["character"]["id"] == "rabbit"
    assert body["tools_used"] == ["get_progressive_hint"]
    assert "2" not in body["message"]["text"].split()
    assert body["actions"] == []
