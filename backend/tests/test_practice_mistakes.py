"""Mistake tags: a wrong answer gets a tag only when it is exactly what a known
wrong procedure gives with this problem's numbers. Every expected value below
was worked out by hand from the engine's own steps."""

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def mistake(sutra, question, answer, **params):
    response = client.post(f"/sutras/{sutra}/check", json={"question": question, "answer": answer, **params})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "incorrect"
    return body["mistake"]


@pytest.mark.parametrize(
    "sutra, params, question, answer, tag",
    [
        # Nikhilam 98 x 93: deviations 2 and 7, left 91, right 14.
        ("nikhilam", {"a": 98, "b": 93}, "left_part", "105", "cross_added"),       # 98 + 7
        ("nikhilam", {"a": 98, "b": 93}, "left_part", "95", "cross_added"),        # 93 + 2
        ("nikhilam", {"a": 98, "b": 93}, "left_part", "96", "own_deviation"),      # 98 - 2
        ("nikhilam", {"a": 98, "b": 93}, "right_part", "9", "deviations_added"),   # 2 + 7
        ("nikhilam", {"a": 98, "b": 93}, "deviation_a", "-2", "sign"),             # sign still wins
        # Nikhilam 98 x 103: deviations 2 and -3, left 101, right -6, borrow to 100 | 94.
        ("nikhilam", {"a": 98, "b": 103}, "adjusted_left_part", "102", "adjust_wrong_direction"),
        ("nikhilam", {"a": 98, "b": 103}, "adjusted_left_part", "101", "skipped_adjustment"),
        ("nikhilam", {"a": 98, "b": 103}, "adjusted_right_part", "-6", "skipped_adjustment"),
        ("nikhilam", {"a": 98, "b": 103}, "result", "1016", "skipped_adjustment"),
        # Nikhilam 9998 x 9997 (advanced): 9995 | 0006.
        ("nikhilam", {"a": 9998, "b": 9997, "difficulty": "advanced"}, "result", "99956", "result_missing_padding"),
        # Urdhva 23 x 14: column 1 total 12 (write 2, carry 1); column 2 = 3 + 8 + 1 = 12.
        ("urdhva", {"a": 23, "b": 14}, "column_1_digit", "12", "wrote_whole_total"),
        ("urdhva", {"a": 23, "b": 14}, "column_1_carry", "2", "carry_digit_swapped"),
        ("urdhva", {"a": 23, "b": 14}, "column_1_carry", "12", "carried_whole_total"),
        ("urdhva", {"a": 23, "b": 14}, "column_2_total", "11", "forgot_carry_in"),
        # Ekadhikena 35: previous 3, next 4, left 12, result 1225.
        ("ekadhikena", {"number": 35}, "next_number", "2", "one_less_not_one_more"),
        ("ekadhikena", {"number": 35}, "next_number", "3", "forgot_one_more"),
        ("ekadhikena", {"number": 35}, "left_part", "9", "multiplied_by_itself"),
        ("ekadhikena", {"number": 35}, "left_part", "7", "added_not_multiplied"),
        ("ekadhikena", {"number": 35}, "result", "125", "wrote_5_not_25"),
        ("ekadhikena", {"number": 35}, "result", "925", "multiplied_by_itself"),
    ],
)
def test_known_wrong_procedures_are_tagged(sutra, params, question, answer, tag):
    assert mistake(sutra, question, answer, **params) == tag


@pytest.mark.parametrize(
    "sutra, params, question, answer",
    [
        ("nikhilam", {"a": 98, "b": 93}, "deviation_a", "5"),
        ("nikhilam", {"a": 98, "b": 93}, "left_part", "90"),
        ("urdhva", {"a": 23, "b": 14}, "column_1_total", "11"),   # no carry comes into column 1
        ("ekadhikena", {"number": 35}, "left_part", "13"),
    ],
)
def test_unexplained_wrong_answers_get_no_tag(sutra, params, question, answer):
    assert mistake(sutra, question, answer, **params) is None


def test_a_tag_never_matches_the_correct_answer():
    # 99 x 99: deviations 1 and 1, so a - d_a == a - d_b == the correct left part.
    body = client.post("/sutras/nikhilam/check", json={"question": "left_part", "answer": "98", "a": 99, "b": 99}).json()
    assert body["status"] == "correct"


def test_questions_endpoint_never_publishes_mistake_values():
    body = client.get("/sutras/nikhilam/questions", params={"a": 98, "b": 103}).json()
    for question in body["questions"]:
        assert "mistakes" not in question
        assert "expected" not in question
