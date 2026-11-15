"""Runtime reply guards: grounding against tool results, and one speaker per reply."""

from __future__ import annotations

import pytest

from backend.agents.vedic_math_coach.guards import (
    check_grounding,
    check_single_speaker,
    first_speaker_only,
    review_reply,
    trusted_numbers,
)
from backend.agents.vedic_math_coach.personas import Persona
from backend.agents.vedic_math_coach.tools import calculate_sutra, check_practice_answer
from backend.agents.vedic_math_coach.tools.store import clear_store

SESSION = "coach-guards-session"


@pytest.fixture(autouse=True)
def _clean_store():
    clear_store()
    yield
    clear_store()


@pytest.fixture
def nikhilam_98_97():
    response = calculate_sutra("nikhilam", a=98, b=97, session_id=SESSION)
    assert response["ok"]
    return [{"name": "calculate_sutra", "response": response}]


def test_reply_quoting_engine_values_passes(nikhilam_98_97):
    reply = "[Rishi] 98 is 2 below 100 and 97 is 3 below. 98 − 3 = 95, and 2 × 3 = 6, so the answer is 9506."
    review = review_reply(reply, nikhilam_98_97)
    assert review.ok, review.issues


def test_invented_result_is_flagged(nikhilam_98_97):
    review = review_reply("[Rishi] So 98 × 97 is 9516.", nikhilam_98_97)
    assert not review.ok
    assert review.grounding.ungrounded_numbers == (9516,)


def test_false_equation_is_flagged_even_when_numbers_are_known(nikhilam_98_97):
    # 95 and 6 are engine values, but the equation joining them is wrong.
    review = review_reply("[Rishi] Remember 98 - 3 = 94.", nikhilam_98_97)
    assert not review.ok
    assert review.grounding.false_equations == ("98 - 3 = 94",)


def test_failed_tool_results_are_not_trusted():
    failed = [{"name": "calculate_sutra", "response": {"ok": False, "message": "Base 9506 unsupported"}}]
    assert 9506 not in trusted_numbers(failed)


def test_learner_text_may_be_quoted(nikhilam_98_97):
    review = review_reply("[Rishi] You wrote 9407. Let's look again.", nikhilam_98_97, ["my answer is 9407"])
    assert review.ok, review.issues


def test_small_counts_and_bases_need_no_source():
    result = check_grounding("Step 2 of 6: measure each number from 100.", frozenset())
    assert result.ok


def test_thousands_separator_is_read_as_one_number():
    allowed = trusted_numbers([{"name": "calculate_sutra", "response": {"ok": True, "result": 1234}}])
    assert check_grounding("The answer is 1,234.", allowed).ok
    assert check_grounding("The answer is 1,235.", allowed).ungrounded_numbers == (1235,)


def test_feedback_cannot_state_an_answer_the_checker_withheld():
    response = check_practice_answer("nikhilam", "left_part", "94", a=98, b=97)
    assert response["ok"] and response["status"] == "incorrect"
    tools = [{"name": "check_practice_answer", "response": response}]
    assert review_reply("[Rishi] Not quite: 94 is close. Which deviation do you take away?", tools).ok
    assert review_reply("[Rishi] Not quite. The left part is 95.", tools).grounding.ungrounded_numbers == (95,)


def test_no_tool_calls_means_no_large_numbers():
    review = review_reply("[Rishi] 98 times 97 is 9506.", [])
    assert review.grounding.ungrounded_numbers == (97, 98, 9506)


@pytest.mark.parametrize(
    ("reply", "speaker", "ok"),
    [
        ("[Rishi] Let's think about the base.", Persona.BOY_COACH, True),
        ("[Rabbit] Watch the carry arrow.", Persona.RABBIT, True),
        ("No tag at all.", None, True),
        ("[Rishi] Here is the idea.\n[Rabbit] And here is a hint.", Persona.BOY_COACH, False),
    ],
)
def test_single_speaker(reply, speaker, ok):
    result = check_single_speaker(reply)
    assert result.speaker is speaker
    assert result.ok is ok


def test_first_speaker_only_trims_a_second_voice():
    reply = "[Rishi] Here is the idea.\n[Rabbit] And here is a hint."
    assert first_speaker_only(reply) == "[Rishi] Here is the idea."
    assert first_speaker_only("[Rabbit] One voice. [Rabbit] Same voice.") == "[Rabbit] One voice. [Rabbit] Same voice."


def test_review_lists_every_issue():
    review = review_reply("[Rishi] It is 9516.\n[Hummingbird] Great job!", [])
    assert not review.ok
    assert len(review.issues) == 2


def test_chat_response_replaces_an_ungrounded_reply(nikhilam_98_97):
    from backend.agents.vedic_math_coach.handoff.chat_service import UNGROUNDED_REPLY, build_chat_response
    from backend.agents.vedic_math_coach.session import ChatTurnResult

    turn = ChatTurnResult(text="[Rishi] 98 × 97 is 9516.", tool_responses=[])
    out = build_chat_response(session_id=SESSION, turn=turn, learner_texts=["What is 98 × 97?"])
    assert out.message.text == UNGROUNDED_REPLY


def test_chat_response_keeps_a_grounded_reply_and_one_speaker(nikhilam_98_97):
    from backend.agents.vedic_math_coach.handoff.chat_service import build_chat_response
    from backend.agents.vedic_math_coach.session import ChatTurnResult

    turn = ChatTurnResult(text="[Rishi] It comes to 9506.\n[Hummingbird] Well done!", tool_responses=nikhilam_98_97)
    out = build_chat_response(session_id=SESSION, turn=turn, learner_texts=["What is 98 × 97?"])
    assert out.message.text.startswith("It comes to 9506.")
    assert "Well done" not in out.message.text
