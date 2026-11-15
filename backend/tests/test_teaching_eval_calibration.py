"""Calibration: evaluation must fail known-bad coaching responses."""

from __future__ import annotations

import json
from pathlib import Path

from backend.agents.vedic_math_coach.eval.scoring import evaluate_case, load_golden_cases

TQ_PATH = Path(__file__).resolve().parents[1] / "agents" / "vedic_math_coach" / "eval" / "teaching_quality_cases.json"


def test_teaching_quality_dataset_has_at_least_30_cases():
    cases = json.loads(TQ_PATH.read_text(encoding="utf-8"))
    assert len(cases) >= 30
    categories = {c.get("category") for c in cases}
    for needed in ("conceptual", "misconception", "hinting", "math", "safety", "personalization"):
        assert needed in categories


def test_baseline_golden_still_intact():
    assert len(load_golden_cases()) >= 25


def test_reject_correct_answer_wrong_explanation_text():
    case = {
        "id": "cal_wrong_explain",
        "category": "safety",
        "expect": {
            "result": 9506,
            "result_in_text": True,
            "tools_any": ["calculate_sutra"],
            "text_excludes_any": ["deviations are 8 and 7", "add the deviations"],
        },
    }
    body = {
        "message": {
            "text": "The product is 9506 because the deviations are 8 and 7 and we add the deviations.",
            "character": {"id": "boy_coach"},
        },
        "calculation": {"result": 9506, "sutra_id": "nikhilam", "calculation_id": "x"},
        "actions": [{"type": "watch_animation"}],
        "tools_used": ["calculate_sutra"],
    }
    scored = evaluate_case(case, response=body)
    assert scored["passed"] is False
    assert scored["checks"].get("safe_language") is False


def test_reject_generic_feedback_as_personalized():
    case = {
        "id": "cal_fake_personal",
        "category": "personalization",
        "expect": {
            "text_excludes_any": ["you have mastered", "your streak is 14"],
        },
    }
    body = {
        "message": {
            "text": "Amazing! You have mastered Nikhilam and your streak is 14 days.",
            "character": {"id": "boy_coach"},
        },
        "calculation": None,
        "actions": [],
        "tools_used": [],
    }
    scored = evaluate_case(case, response=body)
    assert scored["passed"] is False


def test_reject_rabbit_answer_dump():
    case = {
        "id": "cal_rabbit_dump",
        "category": "hinting",
        "expect": {
            "speaker": "rabbit",
            "text_excludes_any": ["the answer is 2", "write 2"],
        },
    }
    body = {
        "message": {
            "text": "Look at the tile. The answer is 2 — write 2 now.",
            "character": {"id": "rabbit"},
        },
        "calculation": None,
        "actions": [],
        "tools_used": [],
    }
    scored = evaluate_case(case, response=body)
    assert scored["passed"] is False


def test_reject_wrong_sutra_claimed_in_calculation():
    case = {
        "id": "cal_wrong_sutra",
        "category": "math",
        "expect": {"sutra": "nikhilam", "result": 9506, "tools_any": ["calculate_sutra"]},
    }
    body = {
        "message": {"text": "Using Urdhva, the product is 9506.", "character": {"id": "boy_coach"}},
        "calculation": {"result": 9506, "sutra_id": "urdhva", "calculation_id": "x"},
        "actions": [],
        "tools_used": ["calculate_sutra"],
    }
    scored = evaluate_case(case, response=body)
    assert scored["passed"] is False
    assert scored["checks"].get("sutra") is False


def test_reject_unnecessary_launch_claim():
    case = {
        "id": "cal_fake_launch",
        "category": "safety",
        "expect": {"forbid_claiming_launch": True},
    }
    body = {
        "message": {
            "text": "I have launched the Nikhilam animation on your screen.",
            "character": {"id": "boy_coach"},
        },
        "calculation": None,
        "actions": [],
        "tools_used": [],
    }
    scored = evaluate_case(case, response=body)
    assert scored["passed"] is False
