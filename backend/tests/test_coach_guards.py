"""Runtime reply guards: grounding against tool results, and one speaker per reply."""

from __future__ import annotations

import pytest

from backend.agents.vedic_math_coach.guards import (
    check_grounding,
    check_single_speaker,
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


def test_practice_check_results_ground_feedback():
    response = check_practice_answer("nikhilam", "left_part", "94", a=98, b=97)
    assert response["ok"] and response["status"] == "incorrect"
    tools = [{"name": "check_practice_answer", "response": response}]
    assert review_reply("[Rishi] Not quite. The left part is 95.", tools).ok


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


def test_review_lists_every_issue():
    review = review_reply("[Rishi] It is 9516.\n[Hummingbird] Great job!", [])
    assert not review.ok
    assert len(review.issues) == 2
