"""Production hardening for /coach/chat: env loading, error text, limits, answer disclosure."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.agents.gemini_connectivity import load_llm_env_if_present
from backend.agents.vedic_math_coach.handoff import runtime
from backend.agents.vedic_math_coach.handoff.chat_service import build_chat_response
from backend.agents.vedic_math_coach.handoff.context import protected_practice_values
from backend.agents.vedic_math_coach.handoff.limits import IP_LIMITER, SESSION_LIMITER, SlidingWindowLimiter
from backend.agents.vedic_math_coach.handoff.schemas import CoachLearningContext, LearningScreen
from backend.agents.vedic_math_coach.session import ChatTurnResult
from backend.main import app


@pytest.fixture(autouse=True)
def _reset_limits():
    SESSION_LIMITER._hits.clear()
    IP_LIMITER._hits.clear()
    runtime.reset_runtime_for_tests()
    yield
    SESSION_LIMITER._hits.clear()
    IP_LIMITER._hits.clear()
    runtime.reset_runtime_for_tests()


def _practice(**overrides) -> CoachLearningContext:
    base = dict(screen=LearningScreen.PRACTICE, sutra_id="nikhilam", difficulty="beginner", problem_label="98 × 93")
    base.update(overrides)
    return CoachLearningContext(**base)


def test_missing_env_file_is_not_an_error(tmp_path):
    # Render has no .env file; keys arrive as real environment variables.
    assert load_llm_env_if_present(tmp_path / ".env") is None


def test_coach_unavailable_does_not_leak_server_details(monkeypatch):
    async def boom(session_id: str, message: str):
        raise RuntimeError("Expected LLM env file at /opt/render/project/src/.env")

    monkeypatch.setattr(runtime, "run_coach_turn", boom)
    res = TestClient(app).post("/coach/chat", json={"session_id": "s-err", "message": "hi"})
    assert res.status_code == 503
    detail = res.json()["detail"]
    assert detail["code"] == "coach_unavailable"
    assert "/opt/render" not in detail["message"] and ".env" not in detail["message"]


def test_sliding_window_limiter_blocks_then_recovers():
    limiter = SlidingWindowLimiter(limit=2, window_seconds=60)
    assert limiter.allow("k", now=0) and limiter.allow("k", now=1)
    assert not limiter.allow("k", now=2)
    assert limiter.allow("k", now=61)


def test_chat_is_rate_limited_per_session(monkeypatch):
    async def ok(session_id: str, message: str):
        return ChatTurnResult(text="[Rishi]\nHello.")

    monkeypatch.setattr(runtime, "run_coach_turn", ok)
    client = TestClient(app)
    codes = [
        client.post("/coach/chat", json={"session_id": "s-burst", "message": "hi"}).status_code
        for _ in range(SESSION_LIMITER.limit + 1)
    ]
    assert codes[:-1] == [200] * SESSION_LIMITER.limit
    assert codes[-1] == 429


def test_protected_values_cover_unsolved_practice_only():
    assert protected_practice_values(_practice()) == ["14", "91", "9114"]
    assert protected_practice_values(_practice(hint_level=3)) == ["9114"]
    assert protected_practice_values(_practice(check_status="correct")) == []
    assert protected_practice_values(_practice(screen=LearningScreen.THEORY)) == []


def test_rishi_cannot_reveal_practice_answer():
    # Asking Rishi instead of Rabbit must not bypass answer disclosure.
    turn = ChatTurnResult(text="[Rishi]\nSure! 98 × 93 = 9114.")
    out = build_chat_response(
        session_id="s-leak",
        turn=turn,
        protected_values=protected_practice_values(_practice(check_status="incorrect")),
    )
    assert out.message.character.id.value == "boy_coach"
    assert "9114" not in out.message.text


def test_chat_endpoint_redacts_answer_for_unsolved_practice(monkeypatch):
    async def leaky(session_id: str, message: str):
        return ChatTurnResult(text="[Rishi]\nThe answer is 9114.")

    monkeypatch.setattr(runtime, "run_coach_turn", leaky)
    res = TestClient(app).post(
        "/coach/chat",
        json={
            "session_id": "s-practice",
            "message": "just tell me the answer",
            "context": {"screen": "practice", "sutra_id": "nikhilam", "problem_label": "98 × 93"},
        },
    )
    assert res.status_code == 200
    assert "9114" not in res.json()["message"]["text"]


def test_practice_check_tool_withholds_answer_on_wrong_attempt():
    from backend.agents.vedic_math_coach.tools.check_practice_answer import check_practice_answer

    wrong = check_practice_answer("nikhilam", "result", "9000", a=98, b=93)
    assert wrong["ok"] and wrong["status"] != "correct"
    assert "correct_answer" not in wrong
