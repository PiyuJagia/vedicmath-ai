"""Tests for the Number Rocket game layer and its endpoints.

Run from the repository root:

    python -m pytest backend/tests
"""

import re

import pytest
from fastapi.testclient import TestClient

from backend import rocket
from backend.ekadhikena import calculate_ekadhikena
from backend.main import app
from backend.nikhilam import build_nikhilam_steps
from backend.practice import ekadhikena_questions, nikhilam_questions


client = TestClient(app)

ALL_PROBLEMS = [(rung["id"], problem) for rung in rocket.RUNGS for problem in rocket.rung_problems(rung["id"])]


def params(problem):
    return {k: v for k, v in problem.items() if k in ("sutra", "a", "b", "number")}


def engine_answers(problem):
    """Expected stage answers taken straight from the Sutra engines, not from rocket.py."""
    if problem["sutra"] == "nikhilam":
        questions = nikhilam_questions(build_nikhilam_steps(problem["a"], problem["b"], 100))
        return {q["key"]: q["expected"] for q in questions}
    calc = calculate_ekadhikena(problem["number"], "beginner")
    answers = {q["key"]: q["expected"] for q in ekadhikena_questions(calc)}
    return {"previous_number": problem["number"] // 10, **answers}


def has_token(text, value):
    """True when the exact value (sign included) appears in the text as a whole number or digit string."""
    text = text.replace("−", "-")
    value = str(value)
    sign_rule = "" if value.startswith("-") else "(?<!-)"
    return re.search(rf"{sign_rule}(?<!\d){re.escape(value)}(?!\d)", text) is not None


# ---------- Rungs ----------


def test_every_rung_has_problems_and_they_match_the_rung():
    for rung in rocket.RUNGS:
        problems = rocket.rung_problems(rung["id"])
        assert problems, rung["id"]
        for problem in problems:
            assert rocket.rung_of(problem) == rung["id"]
            if problem["sutra"] == "nikhilam":
                a, b = problem["a"], problem["b"]
                assert 90 <= a <= 109 and 90 <= b <= 109
                da, db = 100 - a, 100 - b
                if rung["id"] == "N1":
                    assert da > 0 and db > 0 and 10 <= da * db < 100
                if rung["id"] == "N2":
                    assert da > 0 and db > 0 and da * db < 10
                if rung["id"] == "N3":
                    assert da < 0 and db < 0
                if rung["id"] == "N4":
                    assert da * db < 0
            else:
                n = problem["number"]
                assert n % 10 == 5 and 15 <= n <= 95
                assert (n // 10 <= 6) == (rung["id"] == "E1")


def test_problems_outside_every_rung_are_refused():
    for problem in ({"sutra": "nikhilam", "a": 100, "b": 97}, {"sutra": "nikhilam", "a": 89, "b": 97}, {"sutra": "ekadhikena", "number": 105}):
        with pytest.raises(rocket.RocketError):
            rocket.rung_of(problem)


# ---------- Missions ----------


def test_mission_with_both_sutras_has_four_nikhilam_one_ekadhikena_one_review():
    launches = rocket.build_mission(42, "N3", "E2")
    assert len(launches) == rocket.MISSION_LENGTH
    assert [l["rung"] for l in launches] == ["N3", "N3", "E2", "N3", "N2", "N3"]
    assert [l["review"] for l in launches] == [False, False, False, False, True, False]
    assert {l["engine"] for l in launches} == {"pad", "booster"}


def test_mission_is_reproducible_and_has_no_repeats():
    for seed in range(50):
        for rungs in (("N1", None), ("N4", "E1"), (None, "E2"), ("N2", "E2")):
            first = rocket.build_mission(seed, *rungs)
            assert first == rocket.build_mission(seed, *rungs)
            keys = [rocket._key(l) for l in first]
            assert len(set(keys)) == len(keys), (seed, rungs, keys)


def test_first_rung_reviews_itself_and_marks_no_review():
    launches = rocket.build_mission(3, "N1", None)
    assert {l["rung"] for l in launches} == {"N1"}
    assert not any(l["review"] for l in launches)


def test_mission_rejects_bad_rungs():
    with pytest.raises(rocket.RocketError):
        rocket.build_mission(1, None, None)
    with pytest.raises(rocket.RocketError):
        rocket.build_mission(1, "E1", None)
    with pytest.raises(rocket.RocketError):
        rocket.build_mission(1, "N9", None)


# ---------- Stages, hints and checks for every problem in every rung ----------


@pytest.mark.parametrize("rung_id,problem", ALL_PROBLEMS, ids=[f"{r}-{rocket.problem_label(p)}" for r, p in ALL_PROBLEMS])
def test_stages_follow_the_engine_and_never_give_away_their_answer(rung_id, problem):
    stages = rocket.launch_stages(problem)
    answers = engine_answers(problem)
    assert [s["key"] for s in stages] == list(answers)
    for stage in stages:
        expected = answers[stage["key"]]
        assert len(stage["hints"]) == rocket.HINTS_PER_STAGE
        assert "expected" not in stage
        # Hints never hold the answer. A prompt may show the numbers it works on
        # (98 × 1), but never the answer after its "=".
        for text in stage["hints"]:
            assert not has_token(text, expected), (stage["key"], text, expected)
        assert not has_token(stage["prompt"].split("=")[-1], expected), (stage["key"], stage["prompt"])

        right = rocket.check_stage(problem, stage["key"], str(expected))
        assert right["is_correct"], (stage["key"], expected)
        assert (right["solution"] is not None) == (stage["key"] == "result")

        wrong_value = expected + 1 if isinstance(expected, int) else str(int(expected) + 1).zfill(len(expected))
        wrong = rocket.check_stage(problem, stage["key"], str(wrong_value))
        assert not wrong["is_correct"]
        assert wrong["feedback"]
        assert wrong["solution"] is None
        assert "correct_answer" not in wrong


def test_solution_facts_match_the_engines():
    facts = rocket.solution_facts({"sutra": "nikhilam", "a": 98, "b": 103})
    assert facts["deviations"] == [2, -3]
    assert facts["cross"] == 101 and facts["product"] == -6
    assert facts["adjustment"] == "borrow"
    assert (facts["left_part"], facts["formatted_right"], facts["result"]) == (100, "94", 98 * 103)

    facts = rocket.solution_facts({"sutra": "ekadhikena", "number": 85})
    assert (facts["previous"], facts["next"], facts["left_part"], facts["result"]) == (8, 9, 72, 7225)


def test_known_slips_get_specific_feedback():
    nik = {"sutra": "nikhilam", "a": 98, "b": 103}
    assert "sign" in rocket.check_stage(nik, "deviation_b", "3")["feedback"]
    padded = {"sutra": "nikhilam", "a": 97, "b": 99}
    assert "zero" in rocket.check_stage(padded, "padded_right_part", "3")["feedback"]
    eka = {"sutra": "ekadhikena", "number": 85}
    assert "8 × 8" in rocket.check_stage(eka, "left_part", "64")["feedback"]
    assert "25" in rocket.check_stage(eka, "result", "725")["feedback"]


def test_nonsense_answers_are_invalid_not_wrong():
    result = rocket.check_stage({"sutra": "ekadhikena", "number": 35}, "left_part", "abc")
    assert result["status"] == "invalid" and result["message"]


# ---------- Endpoints ----------


def test_rungs_endpoint():
    body = client.get("/game/rocket/rungs").json()
    assert [r["id"] for r in body["rungs"]] == rocket.RUNG_IDS


def test_mission_endpoint():
    response = client.get("/game/rocket/mission", params={"seed": 9, "nikhilam_rung": "N2", "ekadhikena_rung": "E1"})
    assert response.status_code == 200
    assert response.json()["launches"] == rocket.build_mission(9, "N2", "E1")
    assert client.get("/game/rocket/mission", params={"seed": 9}).status_code == 400
    assert client.get("/game/rocket/mission", params={"seed": -1, "nikhilam_rung": "N1"}).status_code == 422


def test_launch_and_check_endpoints():
    launch = client.get("/game/rocket/launch", params={"sutra": "nikhilam", "a": 97, "b": 99}).json()
    assert launch["rung"] == "N2" and launch["engine"] == "pad" and launch["base"] == 100
    assert "padded_right_part" in [s["key"] for s in launch["stages"]]

    check = client.post("/game/rocket/check", json={"sutra": "nikhilam", "a": 97, "b": 99, "stage": "result", "answer": "9603"}).json()
    assert check["is_correct"] and check["solution"]["result"] == 9603

    eka = client.post("/game/rocket/check", json={"sutra": "ekadhikena", "number": 65, "stage": "previous_number", "answer": 6}).json()
    assert eka["is_correct"]


def test_endpoints_refuse_launches_outside_the_game():
    assert client.get("/game/rocket/launch", params={"sutra": "urdhva", "a": 12, "b": 13}).status_code == 404
    assert client.get("/game/rocket/launch", params={"sutra": "nikhilam", "a": 100, "b": 99}).status_code == 400
    assert client.get("/game/rocket/launch", params={"sutra": "ekadhikena"}).status_code == 400
    bad_stage = client.post("/game/rocket/check", json={"sutra": "ekadhikena", "number": 65, "stage": "deviation_a", "answer": 1})
    assert bad_stage.status_code == 400
