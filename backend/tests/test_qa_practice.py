"""QA audit of Practice answer checking: inputs, retries, duplicates and scoring.

Run from the repository root:

    python -m pytest backend/tests/test_qa_practice.py
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app, raise_server_exceptions=False)

PROBLEM = {"a": 98, "b": 97, "difficulty": "beginner"}


def check(question, answer, problem=PROBLEM, sutra="nikhilam"):
    response = client.post(f"/sutras/{sutra}/check", json={"question": question, "answer": answer, **problem})
    assert response.status_code == 200, f"{answer!r}: HTTP {response.status_code} {response.text[:200]}"
    return response.json()


@pytest.mark.parametrize("answer", ["", "   ", "abc", "9.5", "1e2", "0x5F", "--2", "2-", "9 5 0 6x"])
def test_unusable_input_is_invalid_and_reveals_nothing(answer):
    body = check("result", answer)
    assert body["status"] == "invalid"
    assert body["is_correct"] is False
    assert body["correct_answer"] is None
    assert body["message"]


@pytest.mark.parametrize(
    "question, answer",
    [
        ("result", "\u00b2"),
        ("result", "\u00b2\u00b3"),
        ("padded_right_part", "\u00b2\u00b2"),
        ("result", "9" * 5000),
        ("padded_right_part", "0" * 5000),
        ("result", "-" + "9" * 5000),
    ],
)
def test_digit_lookalikes_and_huge_numbers_never_crash(question, answer):
    # Regression: "²" and 5000-digit answers used to return HTTP 500.
    body = check(question, answer)
    assert body["status"] == "invalid"
    assert body["correct_answer"] is None


def test_other_digit_scripts_are_read_as_numbers():
    assert check("result", "\u0669\u0665\u0660\u0666")["is_correct"] is True
    assert check("deviation_a", "\uff12")["is_correct"] is True


@pytest.mark.parametrize("answer", ["2", "+2", " 2 ", "02"])
def test_equivalent_spellings_of_a_correct_answer(answer):
    assert check("deviation_a", answer)["is_correct"] is True


def test_negative_answers_where_the_value_is_negative():
    above = {"a": 103, "b": 104, "difficulty": "beginner"}
    assert check("deviation_a", "-3", above)["is_correct"] is True
    assert check("deviation_a", "\u22123", above)["is_correct"] is True
    flipped = check("deviation_a", "3", above)
    assert flipped["mistake"] == "sign"
    assert flipped["correct_answer"] == "-3"


def test_duplicate_submissions_give_identical_results():
    first = check("left_part", "96")
    second = check("left_part", "96")
    assert first == second
    assert first["correct_answer"] == "95"


def test_retrying_after_a_wrong_answer():
    wrong = check("left_part", "96")
    assert wrong["status"] == "incorrect"
    right = check("left_part", wrong["correct_answer"])
    assert right["status"] == "correct"


def test_score_from_check_all():
    questions = client.get("/sutras/nikhilam/questions", params=PROBLEM).json()["questions"]
    answers = {q["key"]: "0" for q in questions}
    answers["deviation_a"] = "2"
    answers["deviation_b"] = "3"
    body = client.post("/sutras/nikhilam/check-all", json={"answers": answers, **PROBLEM}).json()
    assert body["total_questions"] == len(questions)
    assert body["answered"] == len(questions)
    assert body["correct"] == 2
    assert body["all_correct"] is False
    assert sum(1 for r in body["results"] if r["is_correct"]) == body["correct"]


def test_questions_follow_the_teaching_order():
    questions = client.get("/sutras/nikhilam/questions", params={"a": 98, "b": 103, "difficulty": "beginner"}).json()["questions"]
    assert [q["key"] for q in questions] == [
        "deviation_a",
        "deviation_b",
        "left_part",
        "right_part",
        "adjusted_left_part",
        "adjusted_right_part",
        "result",
    ]
    step_ids = [q["step_id"] for q in questions]
    assert step_ids == sorted(step_ids)


def test_question_must_match_the_level():
    response = client.post("/sutras/nikhilam/check", json={"question": "result", "answer": "9506", "a": 98, "b": 97, "difficulty": "advanced"})
    assert response.status_code == 400
