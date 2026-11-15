"""Phase 7B: offline teaching-intelligence evaluation v2."""

from __future__ import annotations

from backend.agents.vedic_math_coach.eval.hint_disclosure import (
    evaluate_hint_disclosure,
    score_hint_reply_against_engine,
)
from backend.agents.vedic_math_coach.eval.intermediate_claims import (
    nikhilam_deviation_is_correct,
    score_intermediate_claims,
    verify_equation_string,
)
from backend.agents.vedic_math_coach.eval.teaching_v2_scoring import (
    evaluate_fixture,
    load_offline_fixtures,
    run_offline_teaching_v2,
)
from backend.agents.vedic_math_coach.tools.progressive_hints import build_progressive_hint


def test_offline_fixtures_cover_required_categories():
    payload = load_offline_fixtures()
    fixtures = payload["fixtures"]
    assert len(fixtures) >= 25
    categories = {f.get("category") for f in fixtures}
    for needed in ("conceptual", "adversarial", "hint_leakage", "safety", "persona", "guidance"):
        assert needed in categories
    assert any(f.get("label") == "bad" for f in fixtures)
    assert any(f.get("label") == "good" for f in fixtures)


def test_intermediate_equation_oracle():
    assert verify_equation_string("100 - 98 = 2") is True
    assert verify_equation_string("100 − 98 = 8") is False
    assert verify_equation_string("2 × 3 = 6") is True
    assert nikhilam_deviation_is_correct(100, 98, 2) is True
    assert nikhilam_deviation_is_correct(100, 98, 8) is False


def test_intermediate_claims_detect_wrong_arithmetic():
    scored = score_intermediate_claims("First, 100 − 98 = 8 and then 8 × 7 = 56.")
    assert scored["passed"] is False
    assert scored["incorrect"]


def test_hint_levels_forbid_answer_but_allow_operands():
    for level in (1, 2, 3):
        packet = build_progressive_hint(
            sutra="nikhilam",
            difficulty="beginner",
            hint_level=level,
            question_key="deviation_a",
            a=98,
            b=93,
        )
        assert packet["ok"]
        assert "2" in packet["forbidden_values"]
        assert "9114" in packet["forbidden_values"]
        # Operands / base may appear in allowed text
        safe = score_hint_reply_against_engine(
            packet["allowed_text"],
            sutra="nikhilam",
            difficulty="beginner",
            hint_level=level,
            question_key="deviation_a",
            a=98,
            b=93,
        )
        assert safe["passed"] is True, safe


def test_hint_disclosure_catches_direct_and_paraphrase_leaks():
    direct = evaluate_hint_disclosure(
        "The deviation is 2 — write 2 now.",
        hint_level=1,
        forbidden_values=["2", "9114"],
        allowed_operands=["98", "93", "100"],
    )
    assert direct["passed"] is False
    assert "2" in direct["leaked_tokens"]

    paraphrase = evaluate_hint_disclosure(
        "The distance from the base is two.",
        hint_level=1,
        forbidden_values=["2", "9114"],
        allowed_operands=["98", "100"],
    )
    assert paraphrase["passed"] is False
    assert "2" in paraphrase["paraphrase_leaks"]


def test_hint_disclosure_catches_premature_l1_expression():
    premature = score_hint_reply_against_engine(
        "At this stage just compute 100 − 98 and you'll see the digit.",
        sutra="nikhilam",
        difficulty="beginner",
        hint_level=1,
        question_key="deviation_a",
        a=98,
        b=93,
    )
    assert premature["passed"] is False
    assert premature.get("premature_expression") is True

    allowed_l3 = score_hint_reply_against_engine(
        "Work out 100 − 98. That expression is your guided step; finish the arithmetic yourself.",
        sutra="nikhilam",
        difficulty="beginner",
        hint_level=3,
        question_key="deviation_a",
        a=98,
        b=93,
    )
    assert allowed_l3["passed"] is True


def test_hint_disclosure_does_not_flag_operand_alone():
    result = evaluate_hint_disclosure(
        "Tile A holds 98 near the base.",
        hint_level=1,
        forbidden_values=["2", "9114"],
        allowed_operands=["98", "93", "100"],
    )
    assert result["passed"] is True
    assert "98" in result["allowed_operand_mentions"]


def test_offline_suite_rejects_all_known_bad_and_accepts_known_good():
    report = run_offline_teaching_v2(write_report=True)
    summary = report["summary"]
    assert summary["mode"] == "offline"
    assert summary["total"] >= 20
    # Evaluator sensitivity: every known-bad fixture must be rejected (scored as passed for the eval)
    assert summary["evaluator_sensitivity_known_bad"] == 1.0, summary
    assert summary["evaluator_acceptance_known_good"] == 1.0, summary
    assert summary["pass_rate"] == 1.0, summary["failures"]


def test_known_bad_wrong_intermediate_fixture_fails_content_gate():
    payload = load_offline_fixtures()
    fixture = next(f for f in payload["fixtures"] if f["id"] == "bad_correct_result_wrong_intermediate")
    # Direct content evaluation without must_fail flip: equations incorrect
    from backend.agents.vedic_math_coach.eval.teaching_v2_scoring import _evaluate_single_response

    expect = dict(fixture["expect"])
    expect.pop("must_fail", None)
    scored = _evaluate_single_response(expect, fixture["response"], None)
    assert scored["checks"].get("intermediate_equations") is False


def test_each_hint_level_adversarial_fixture_present():
    payload = load_offline_fixtures()
    levels = set()
    for fixture in payload["fixtures"]:
        if fixture.get("category") != "hint_leakage":
            continue
        hint = fixture.get("hint") or {}
        if hint.get("hint_level"):
            levels.add(hint["hint_level"])
        for turn in fixture.get("turns") or []:
            if turn.get("hint", {}).get("hint_level"):
                levels.add(turn["hint"]["hint_level"])
    assert {1, 2, 3}.issubset(levels)


def test_evaluate_fixture_multi_turn_circumvention():
    payload = load_offline_fixtures()
    fixture = next(f for f in payload["fixtures"] if f["id"] == "bad_multi_turn_hint_circumvention")
    scored = evaluate_fixture(fixture)
    assert scored["passed"] is True  # evaluator correctly rejects the leaking second turn
