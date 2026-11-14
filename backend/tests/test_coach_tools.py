"""Tollgate 4B: ADK maths tool wrappers around existing engines."""

from __future__ import annotations

import pytest

from backend.agents.vedic_math_coach import root_agent
from backend.agents.vedic_math_coach.tools import (
    calculate_sutra,
    check_practice_answer,
    get_lesson,
)
from backend.agents.vedic_math_coach.tools.service import animation_format
from backend.agents.vedic_math_coach.tools.store import clear_store, get_calculation


@pytest.fixture(autouse=True)
def _clean_store():
    clear_store()
    yield
    clear_store()


def test_root_agent_registers_three_maths_tools():
    names = {getattr(tool, "__name__", getattr(tool, "name", str(tool))) for tool in root_agent.tools}
    # Function tools may be wrapped; names should still mention the callables.
    joined = " ".join(sorted(names)).lower()
    assert "calculate_sutra" in joined
    assert "get_lesson" in joined
    assert "check_practice_answer" in joined


def test_calculate_nikhilam_beginner():
    out = calculate_sutra("nikhilam", "beginner", a=98, b=97)
    assert out["ok"] is True
    assert out["result"] == 98 * 97 == 9506
    assert out["numbers"] == [98, 97]
    assert out["teaching_steps"]
    assert "animation_steps" not in out
    assert get_calculation(out["calculation_id"])["result"] == 9506


def test_get_lesson_reuses_calculation_id_and_animation():
    calc = calculate_sutra("nikhilam", "beginner", a=98, b=97)
    lesson = get_lesson(calculation_id=calc["calculation_id"])
    assert lesson["ok"] is True
    assert lesson["result"] == calc["result"]
    assert lesson["animation_steps"]
    assert lesson["animation_format"] == "grouped"
    assert lesson["watch_animation"]["calculation_id"] == calc["calculation_id"]
    assert lesson["open_animation"]["calculation_id"] == calc["calculation_id"]
    # Events are engine-authored; final reveal matches verified product.
    reveal = None
    for step in lesson["animation_steps"]:
        for event in step["events"]:
            if event.get("action") == "reveal_result":
                reveal = event.get("value")
    assert reveal == 9506


@pytest.mark.parametrize(
    "sutra,kwargs,expected",
    [
        ("nikhilam", {"a": 98, "b": 97}, 9506),
        ("urdhva", {"a": 23, "b": 14}, 322),
        ("ekadhikena", {"number": 35}, 1225),
        ("yavadunam", {"number": 97}, 97 * 97),
        ("ekanyunena", {"number": 7}, 7 * 99),
    ],
)
def test_calculate_all_five_sutras_beginner(sutra, kwargs, expected):
    out = calculate_sutra(sutra, "beginner", **kwargs)
    assert out["ok"] is True
    assert out["result"] == expected
    lesson = get_lesson(calculation_id=out["calculation_id"])
    assert lesson["ok"] is True
    assert lesson["result"] == expected
    assert lesson["animation_format"] in {"grouped", "flat"}
    assert animation_format(lesson["animation_steps"]) == lesson["animation_format"]


@pytest.mark.parametrize(
    "sutra,difficulty,kwargs,expected",
    [
        ("nikhilam", "intermediate", {"a": 998, "b": 997}, 998 * 997),
        ("nikhilam", "advanced", {"a": 9998, "b": 9997}, 9998 * 9997),
        ("urdhva", "intermediate", {"a": 87, "b": 877}, 87 * 877),
        ("urdhva", "advanced", {"a": 1234, "b": 5678}, 1234 * 5678),
        ("ekadhikena", "intermediate", {"number": 115}, 115 * 115),
        ("ekadhikena", "advanced", {"number": 1005}, 1005 * 1005),
        ("yavadunam", "intermediate", {"number": 997}, 997 * 997),
        ("ekanyunena", "intermediate", {"number": 42}, 42 * 999),
    ],
)
def test_calculate_higher_levels(sutra, difficulty, kwargs, expected):
    out = calculate_sutra(sutra, difficulty, **kwargs)
    assert out["ok"] is True
    assert out["result"] == expected


def test_invalid_operands_and_unsupported_sutra():
    assert calculate_sutra("nikhilam", "beginner", a=50, b=97)["ok"] is False
    assert calculate_sutra("paravartya", "beginner", a=1, b=2)["code"] == "unsupported_sutra"
    assert calculate_sutra("ekadhikena", "beginner", number=34)["ok"] is False
    assert get_lesson(calculation_id="missing")["code"] == "unknown_calculation"


def test_check_practice_answer_nikhilam():
    correct = check_practice_answer("nikhilam", "result", "9506", "beginner", a=98, b=97)
    assert correct["ok"] is True
    assert correct["status"] == "correct"
    assert correct["is_correct"] is True

    wrong = check_practice_answer("nikhilam", "result", "9505", "beginner", a=98, b=97)
    assert wrong["ok"] is True
    assert wrong["status"] == "incorrect"
    assert wrong["correct_answer"] == "9506"

    bad = check_practice_answer("nikhilam", "result", "abc", "beginner", a=98, b=97)
    assert bad["ok"] is True
    assert bad["status"] == "invalid"
