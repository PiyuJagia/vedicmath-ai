"""QA audit of Nikhilam against an independent oracle.

The oracle below is written from the definition of the method and never calls
production code. Every API value is compared with it and with Python's own
integer multiplication.

Run from the repository root:

    python -m pytest backend/tests/test_qa_nikhilam_oracle.py
"""

import random

import pytest
from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)

LEVELS = {
    "beginner": (100, 90, 109),
    "intermediate": (1000, 990, 1009),
    "advanced": (10000, 9990, 10009),
}

RANDOM_CASES_PER_LEVEL = 1000


def oracle(a: int, b: int, base: int) -> dict:
    """Nikhilam from first principles: deviation = base - number."""
    zeros = len(str(base)) - 1
    dev_a = base - a
    dev_b = base - b
    left = a - dev_b
    right = dev_a * dev_b

    # Normalise by moving whole bases between the parts, one at a time.
    left_after, right_after, moves = left, right, 0
    while right_after < 0:
        right_after += base
        left_after -= 1
        moves -= 1
    while right_after >= base:
        right_after -= base
        left_after += 1
        moves += 1

    padded = str(right_after).rjust(zeros, "0")
    return {
        "dev_a": dev_a,
        "dev_b": dev_b,
        "left": left,
        "right": right,
        "adjustment": "borrow" if moves < 0 else "carry" if moves > 0 else "none",
        "moves": moves,
        "left_after": left_after,
        "right_after": right_after,
        "padded": padded,
        "padding_zeros": len(padded) - len(str(right_after)),
        "result": int(str(left_after) + padded),
    }


def lesson(a, b, difficulty):
    response = client.get("/sutras/nikhilam/lesson", params={"a": a, "b": b, "difficulty": difficulty})
    assert response.status_code == 200, response.text
    return response.json()


def assert_lesson_matches_oracle(a, b, difficulty):
    base = LEVELS[difficulty][0]
    expected = oracle(a, b, base)
    assert expected["result"] == a * b, "the oracle itself must agree with Python"

    body = lesson(a, b, difficulty)
    steps = {step["type"]: step for step in body["teaching_steps"]}

    assert body["numbers"] == [a, b]
    assert body["result"] == a * b
    assert steps["base"]["base"] == base
    assert steps["base"]["right_digits"] == len(str(base)) - 1

    deviations = steps["deviations"]
    assert deviations["convention"] == "base - number"
    assert deviations["deviations"] == [expected["dev_a"], expected["dev_b"]]
    roles = {c["operand"]: c for c in deviations["calculations"]}
    assert roles["number_a"]["number"] == a and roles["number_a"]["deviation"] == base - a
    assert roles["number_b"]["number"] == b and roles["number_b"]["deviation"] == base - b

    cross = steps["cross_subtract"]
    assert cross["left_part"] == expected["left"]
    pairs = {c["operand"]: c for c in cross["cross_calculations"]}
    assert pairs["number_a"]["value"] == a - (base - b)
    assert pairs["number_b"]["value"] == b - (base - a)
    assert pairs["number_a"]["value"] == pairs["number_b"]["value"]

    assert steps["multiply_deviations"]["right_part"] == expected["dev_a"] * expected["dev_b"]

    if expected["adjustment"] == "none":
        assert "adjust" not in steps
    else:
        adjust = steps["adjust"]
        assert adjust["adjustment"] == expected["adjustment"]
        assert adjust["amount"] == abs(expected["moves"])
        assert (adjust["left_before"], adjust["left_after"]) == (expected["left"], expected["left_after"])
        assert (adjust["right_before"], adjust["right_after"]) == (expected["right"], expected["right_after"])
        assert adjust["right_after"] - adjust["right_before"] == adjust["right_change"]

    combine = steps["combine"]
    assert combine["left_part"] == expected["left_after"]
    assert combine["right_part"] == expected["right_after"]
    assert combine["formatted_right"] == expected["padded"]
    assert combine["padding_zeros"] == expected["padding_zeros"]
    assert combine["result"] == a * b
    assert body["teaching_steps"][-1]["type"] == "combine"

    events = [event for step in body["animation_steps"] for event in step["events"]]
    by_action = {}
    for event in events:
        by_action.setdefault(event["action"], []).append(event)
    assert [(e["operand"], e["deviation"]) for e in by_action["calculate_deviation"]] == [
        ("number_a", base - a),
        ("number_b", base - b),
    ]
    assert [e["value"] for e in by_action["cross_subtract"]] == [expected["left"], expected["left"]]
    assert by_action["multiply_deviations"][0]["value"] == expected["right"]
    assert ("adjust_parts" in by_action) == (expected["adjustment"] != "none")
    assert ("pad_right_part" in by_action) == (expected["padding_zeros"] > 0)
    assert by_action["join_parts"][0]["formatted_right"] == expected["padded"]
    assert by_action["reveal_result"][0]["value"] == a * b
    return body


# ---------- Required examples ----------

REQUIRED = [
    (98, 97, "beginner", 9506),
    (103, 104, "beginner", 10712),
    (103, 97, "beginner", 9991),
    (97, 103, "beginner", 9991),
    (998, 997, "intermediate", 995006),
    (1002, 1003, "intermediate", 1005006),
    (9998, 9997, "advanced", 99950006),
]


@pytest.mark.parametrize("a, b, difficulty, product", REQUIRED)
def test_required_examples(a, b, difficulty, product):
    assert a * b == product
    body = assert_lesson_matches_oracle(a, b, difficulty)
    assert body["result"] == product


def test_named_sign_examples():
    steps = {s["type"]: s for s in lesson(98, 97, "beginner")["teaching_steps"]}
    assert steps["deviations"]["deviations"] == [2, 3]
    steps = {s["type"]: s for s in lesson(103, 97, "beginner")["teaching_steps"]}
    assert steps["deviations"]["deviations"] == [-3, 3]
    assert steps["adjust"]["adjustment"] == "borrow"
    assert steps["combine"]["formatted_right"] == "91"


# ---------- Exhaustive and randomised coverage ----------

@pytest.mark.parametrize("difficulty", LEVELS)
def test_every_valid_pair(difficulty):
    _, low, high = LEVELS[difficulty]
    for a in range(low, high + 1):
        for b in range(low, high + 1):
            assert_lesson_matches_oracle(a, b, difficulty)


@pytest.mark.parametrize("difficulty", LEVELS)
def test_randomised_cases(difficulty):
    _, low, high = LEVELS[difficulty]
    rng = random.Random(f"vedicmath-qa-{difficulty}")
    seen_adjustments = set()
    for _ in range(RANDOM_CASES_PER_LEVEL):
        a, b = rng.randint(low, high), rng.randint(low, high)
        body = assert_lesson_matches_oracle(a, b, difficulty)
        seen_adjustments.add(body["teaching_steps"][-1]["adjustment"])
    assert "borrow" in seen_adjustments and "none" in seen_adjustments


def test_carry_only_occurs_where_mathematically_possible():
    carries = {
        difficulty: sum(
            1
            for a in range(low, high + 1)
            for b in range(low, high + 1)
            if oracle(a, b, base)["adjustment"] == "carry"
        )
        for difficulty, (base, low, high) in LEVELS.items()
    }
    assert carries == {"beginner": 1, "intermediate": 0, "advanced": 0}
    assert {s["type"] for s in lesson(90, 90, "beginner")["teaching_steps"]} >= {"adjust"}


@pytest.mark.parametrize("difficulty", LEVELS)
def test_other_nikhilam_endpoints_agree(difficulty):
    base, low, high = LEVELS[difficulty]
    for a, b in [(low, high), (high, low), (base, base), (base - 1, base + 1), (low, low), (high, high)]:
        multiply = client.get("/multiply/nikhilam", params={"a": a, "b": b, "difficulty": difficulty}).json()
        animate = client.get("/animate/nikhilam", params={"a": a, "b": b, "difficulty": difficulty}).json()
        assert multiply["result"] == a * b
        assert animate["result"] == a * b
        assert animate["animation_steps"] == lesson(a, b, difficulty)["animation_steps"]


# ---------- Boundaries and validation ----------

@pytest.mark.parametrize("difficulty", LEVELS)
def test_range_boundaries(difficulty):
    base, low, high = LEVELS[difficulty]
    assert_lesson_matches_oracle(low, high, difficulty)
    for a, b in [(low - 1, base), (base, high + 1), (low - 1, high + 1)]:
        response = client.get("/sutras/nikhilam/lesson", params={"a": a, "b": b, "difficulty": difficulty})
        assert response.status_code == 400
        assert response.json()["detail"] == f"{difficulty} requires numbers between {low} and {high}."


@pytest.mark.parametrize(
    "a, b, difficulty",
    [
        (98, 97, "intermediate"),
        (998, 997, "beginner"),
        (98, 1002, "beginner"),
        (9998, 98, "advanced"),
        (-98, 97, "beginner"),
        (0, 0, "beginner"),
    ],
)
def test_numbers_outside_the_level_are_rejected(a, b, difficulty):
    response = client.get("/sutras/nikhilam/lesson", params={"a": a, "b": b, "difficulty": difficulty})
    assert response.status_code == 400


@pytest.mark.parametrize(
    "params, status",
    [
        ({"a": 98, "b": 97, "difficulty": "expert"}, 400),
        ({"a": "abc", "b": 97}, 422),
        ({"a": 98.5, "b": 97}, 422),
        ({"a": 98}, 400),
        ({}, 400),
    ],
)
def test_invalid_requests(params, status):
    assert client.get("/sutras/nikhilam/lesson", params=params).status_code == status


def test_difficulty_names_are_forgiving():
    for difficulty in ("BEGINNER", " beginner ", "Beginner"):
        response = client.get("/sutras/nikhilam/lesson", params={"a": 98, "b": 97, "difficulty": difficulty})
        assert response.status_code == 200
        assert response.json()["difficulty"] == "beginner"
