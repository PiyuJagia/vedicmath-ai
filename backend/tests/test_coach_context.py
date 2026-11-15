"""Tollgate 6C: learning-context validation for /coach/chat."""

from __future__ import annotations

from backend.agents.vedic_math_coach.handoff.context import (
    enrich_learner_message,
    format_context_preamble,
    validate_learning_context,
)
from backend.agents.vedic_math_coach.handoff.schemas import CoachLearningContext, LearningScreen
from fastapi.testclient import TestClient

from backend.main import app


def test_validate_strips_unknown_sutra_and_clips_fields():
    raw = CoachLearningContext(
        screen=LearningScreen.THEORY,
        sutra_id="NotASutra",
        difficulty="beginner",
        problem_label="x" * 200,
        learner_answer="12",
        check_status="incorrect",
        frame_index=2,
    )
    cleaned = validate_learning_context(raw)
    assert cleaned is not None
    assert cleaned.sutra_id is None
    assert cleaned.difficulty == "beginner"
    assert cleaned.problem_label is not None and len(cleaned.problem_label) <= 80
    assert cleaned.learner_answer == "12"
    assert cleaned.check_status == "incorrect"
    assert cleaned.frame_index == 2


def test_preamble_marks_learner_answer_untrusted():
    ctx = CoachLearningContext(
        screen=LearningScreen.PRACTICE,
        sutra_id="nikhilam",
        difficulty="beginner",
        learner_answer="999",
        check_status="incorrect",
    )
    text = format_context_preamble(ctx)
    assert "informational only" in text.lower() or "Do NOT treat learner_answer as correct" in text
    assert "untrusted" in text
    assert "engine_check_status=incorrect" in text
    enriched = enrich_learner_message("Why was I wrong?", ctx)
    assert "Learner message:" in enriched
    assert "Why was I wrong?" in enriched


def test_chat_accepts_context_without_trusting_answer_fields():
    client = TestClient(app)
    # Empty message still rejected even with rich context
    session_id = client.post("/coach/sessions").json()["session_id"]
    response = client.post(
        "/coach/chat",
        json={
            "session_id": session_id,
            "message": "   ",
            "context": {
                "screen": "theory",
                "sutra_id": "nikhilam",
                "difficulty": "beginner",
                "learner_answer": "9506",
            },
        },
    )
    assert response.status_code == 400

    # Forbidden client field for "correct_answer" must 422
    bad = client.post(
        "/coach/chat",
        json={
            "session_id": session_id,
            "message": "hello",
            "context": {
                "screen": "practice",
                "sutra_id": "nikhilam",
                "correct_answer": "9506",
            },
        },
    )
    assert bad.status_code == 422
