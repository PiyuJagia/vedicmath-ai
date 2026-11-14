"""QA audit of /sutras/{sutra}/lesson for all five Sutras.

Every lesson must describe its own problem: the two numbers multiply to the
result, and teaching and animation steps line up one to one.

Run from the repository root:

    python -m pytest backend/tests/test_qa_lesson_contract.py
"""

import pytest
from fastapi.testclient import TestClient

from backend.ekanyunena import LEVELS as EKANYUNENA_LEVELS
from backend.main import app
from backend.yavadunam import LEVELS as YAVADUNAM_LEVELS


client = TestClient(app)

DIGITS = {"beginner": 2, "intermediate": 3, "advanced": 4}


def lesson(sutra, difficulty, **params):
    response = client.get(f"/sutras/{sutra}/lesson", params={"difficulty": difficulty, **params})
    assert response.status_code == 200, response.text
    return response.json()


def assert_describes_itself(body, first, second, operation):
    assert body["numbers"] == [first, second]
    assert body["result"] == first * second
    assert body["operands"]["operation"] == operation


@pytest.mark.parametrize("difficulty", list(DIGITS))
def test_ekadhikena_every_valid_number(difficulty):
    digits = DIGITS[difficulty]
    for number in range(10 ** (digits - 1) + 5, 10 ** digits, 10):
        body = lesson("ekadhikena", difficulty, number=number)
        assert body["numbers"] == [number, number]
        assert body["result"] == number * number

        teaching_ids = [step["id"] for step in body["teaching_steps"]]
        assert teaching_ids == [step["step_id"] for step in body["animation_steps"]]

        events = {event["action"]: event for step in body["animation_steps"] for event in step["events"]}
        previous = number // 10
        assert events["highlight_last_digit"]["previous"] == previous
        assert events["show_next_number"]["next_number"] == previous + 1
        assert events["multiply_previous"]["value"] == previous * (previous + 1)
        assert events["append_25"]["right_part"] == "25"
        assert events["reveal_result"]["result"] == number * number


@pytest.mark.parametrize("difficulty", list(YAVADUNAM_LEVELS))
def test_yavadunam_every_valid_number(difficulty):
    _, low, high = YAVADUNAM_LEVELS[difficulty]
    for number in range(low, high + 1):
        assert_describes_itself(lesson("yavadunam", difficulty, number=number), number, number, "square")


@pytest.mark.parametrize("difficulty", list(EKANYUNENA_LEVELS))
def test_ekanyunena_numbers_are_the_number_and_the_nines(difficulty):
    # Regression: the lesson reported [7, 7] and "square" for 7 x 99.
    settings = EKANYUNENA_LEVELS[difficulty]
    base, nines = settings["base"], settings["multiplier"]
    for number in sorted({1, 7, base // 2, base - 1}):
        assert_describes_itself(lesson("ekanyunena", difficulty, number=number), number, nines, "multiply")


@pytest.mark.parametrize(
    "sutra, a, b, difficulty",
    [("nikhilam", 98, 97, "beginner"), ("nikhilam", 9998, 9997, "advanced"), ("urdhva", 23, 14, "beginner"), ("urdhva", 1234, 5678, "advanced")],
)
def test_two_number_sutras_describe_themselves(sutra, a, b, difficulty):
    body = lesson(sutra, difficulty, a=a, b=b)
    assert_describes_itself(body, a, b, "multiply")
    assert [step["id"] for step in body["teaching_steps"]] == [step["step_id"] for step in body["animation_steps"]]
