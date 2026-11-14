"""Tests for the Practice questions and answer-checking endpoints.

Run from the repository root:

    python -m pytest backend/tests
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def questions(sutra, **params):
    response = client.get(f"/sutras/{sutra}/questions", params=params)
    assert response.status_code == 200, response.text
    return response.json()["questions"]


def check(sutra, question, answer, **params):
    response = client.post(
        f"/sutras/{sutra}/check",
        json={"question": question, "answer": answer, **params},
    )
    assert response.status_code == 200, response.text
    return response.json()


# ---------- Question lists ----------

def test_nikhilam_questions_follow_the_lesson():
    listed = questions("nikhilam", a=98, b=97)
    assert [q["key"] for q in listed] == [
        "deviation_a",
        "deviation_b",
        "left_part",
        "right_part",
        "padded_right_part",
        "result",
    ]
    assert [q["step_id"] for q in listed] == [2, 2, 3, 4, 5, 5]
    assert listed[4]["answer_type"] == "digits"
    assert listed[4]["digits"] == 2


def test_nikhilam_borrow_adds_adjustment_questions():
    keys = [q["key"] for q in questions("nikhilam", a=98, b=103)]
    assert "adjusted_left_part" in keys
    assert "adjusted_right_part" in keys
    assert "padded_right_part" not in keys


def test_urdhva_questions_cover_every_column():
    keys = [q["key"] for q in questions("urdhva", a=99, b=99)]
    assert keys == [
        "column_1_total", "column_1_digit", "column_1_carry",
        "column_2_total", "column_2_digit", "column_2_carry",
        "column_3_total", "column_3_digit", "column_3_carry",
        "column_4_digit",
        "result",
    ]


def test_ekadhikena_questions():
    keys = [q["key"] for q in questions("ekadhikena", number=35)]
    assert keys == ["next_number", "left_part", "right_part", "result"]


@pytest.mark.parametrize(
    "sutra, params",
    [
        ("nikhilam", {"a": 98, "b": 103}),
        ("urdhva", {"a": 1234, "b": 5678, "difficulty": "advanced"}),
        ("ekadhikena", {"number": 115, "difficulty": "intermediate"}),
    ],
)
def test_questions_never_include_answers(sutra, params):
    for question in questions(sutra, **params):
        assert "expected" not in question


# ---------- Checking answers ----------

NIKHILAM_98_97 = {"a": 98, "b": 97}


@pytest.mark.parametrize(
    "question, answer",
    [
        ("deviation_a", "2"),
        ("deviation_a", "+2"),
        ("deviation_b", " 3 "),
        ("left_part", "95"),
        ("right_part", "6"),
        ("padded_right_part", "06"),
        ("result", "9506"),
    ],
)
def test_nikhilam_correct_answers(question, answer):
    assert check("nikhilam", question, answer, **NIKHILAM_98_97)["status"] == "correct"


def test_old_sign_convention_is_flagged():
    body = check("nikhilam", "deviation_a", "-2", **NIKHILAM_98_97)
    assert body["status"] == "incorrect"
    assert body["mistake"] == "sign"


def test_unicode_minus_is_accepted():
    body = check("nikhilam", "deviation_a", "\u22123", a=103, b=104)
    assert body["status"] == "correct"


def test_missing_padding_is_flagged():
    body = check("nikhilam", "padded_right_part", "6", **NIKHILAM_98_97)
    assert body["status"] == "incorrect"
    assert body["mistake"] == "missing_padding"


def test_wrong_answer_has_no_mistake_category():
    body = check("nikhilam", "left_part", "96", **NIKHILAM_98_97)
    assert body == {
        "sutra": "nikhilam",
        "numbers": [98, 97],
        "difficulty": "beginner",
        "question": "left_part",
        "step_id": 3,
        "status": "incorrect",
        "mistake": None,
        "message": None,
    }


def test_nikhilam_borrow_answers():
    params = {"a": 98, "b": 103}
    assert check("nikhilam", "right_part", "-6", **params)["status"] == "correct"
    assert check("nikhilam", "adjusted_left_part", "100", **params)["status"] == "correct"
    assert check("nikhilam", "adjusted_right_part", "94", **params)["status"] == "correct"
    assert check("nikhilam", "result", "10094", **params)["status"] == "correct"


def test_urdhva_answers_with_carries():
    params = {"a": 23, "b": 14}
    assert check("urdhva", "column_2_total", "12", **params)["status"] == "correct"
    assert check("urdhva", "column_2_digit", "2", **params)["status"] == "correct"
    assert check("urdhva", "column_2_carry", "1", **params)["status"] == "correct"
    assert check("urdhva", "column_3_carry", "0", **params)["status"] == "correct"
    assert check("urdhva", "result", "322", **params)["status"] == "correct"
    assert check("urdhva", "column_1_digit", "12", **params)["status"] == "incorrect"


def test_urdhva_large_carry():
    params = {"a": 99, "b": 99}
    assert check("urdhva", "column_2_carry", "17", **params)["status"] == "correct"


def test_ekadhikena_answers():
    params = {"number": 35}
    assert check("ekadhikena", "next_number", "4", **params)["status"] == "correct"
    assert check("ekadhikena", "left_part", "12", **params)["status"] == "correct"
    assert check("ekadhikena", "right_part", "25", **params)["status"] == "correct"
    assert check("ekadhikena", "result", "1225", **params)["status"] == "correct"


@pytest.mark.parametrize("answer", ["", "abc", "9.5", "--3", "12a"])
def test_non_numbers_are_invalid(answer):
    body = check("nikhilam", "left_part", answer, **NIKHILAM_98_97)
    assert body["status"] == "invalid"
    assert body["message"]


def test_non_digits_for_padded_answer_are_invalid():
    body = check("nikhilam", "padded_right_part", "-6", **NIKHILAM_98_97)
    assert body["status"] == "invalid"


# ---------- Errors ----------

def test_unknown_question():
    response = client.post(
        "/sutras/nikhilam/check",
        json={"question": "base", "answer": "100", **NIKHILAM_98_97},
    )
    assert response.status_code == 400


def test_padding_question_absent_when_not_needed():
    response = client.post(
        "/sutras/nikhilam/check",
        json={"question": "padded_right_part", "answer": "12", "a": 103, "b": 104},
    )
    assert response.status_code == 400


def test_out_of_range_numbers_use_lesson_validation():
    response = client.post(
        "/sutras/nikhilam/check",
        json={"question": "result", "answer": "4850", "a": 50, "b": 97},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "beginner requires numbers between 90 and 109."


@pytest.mark.parametrize("sutra", ["yavadunam", "unknown"])
def test_unsupported_sutras(sutra):
    assert client.get(f"/sutras/{sutra}/questions", params={"number": 97}).status_code == 404


def test_missing_operands():
    assert client.get("/sutras/nikhilam/questions", params={"a": 98}).status_code == 400
    assert client.get("/sutras/ekadhikena/questions").status_code == 400
