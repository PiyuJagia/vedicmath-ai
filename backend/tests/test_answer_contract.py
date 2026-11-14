"""One answer-checking contract for every Sutra and every difficulty level.

Run from the repository root:

    python -m pytest backend/tests
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)

CHECK_FIELDS = {
    "sutra",
    "numbers",
    "difficulty",
    "question",
    "step_id",
    "answer_type",
    "submitted_answer",
    "status",
    "is_correct",
    "correct_answer",
    "mistake",
    "message",
}

QUESTION_FIELDS = {"key", "step_id", "answer_type"}

# (sutra, difficulty, operands, expected final result)
PROBLEMS = [
    ("nikhilam", "beginner", {"a": 98, "b": 97}, 98 * 97),
    ("nikhilam", "beginner", {"a": 98, "b": 103}, 98 * 103),
    ("nikhilam", "beginner", {"a": 90, "b": 90}, 90 * 90),
    ("nikhilam", "intermediate", {"a": 998, "b": 997}, 998 * 997),
    ("nikhilam", "intermediate", {"a": 997, "b": 1002}, 997 * 1002),
    ("nikhilam", "advanced", {"a": 9998, "b": 9997}, 9998 * 9997),
    ("nikhilam", "advanced", {"a": 9997, "b": 10002}, 9997 * 10002),
    ("urdhva", "beginner", {"a": 23, "b": 14}, 23 * 14),
    ("urdhva", "beginner", {"a": 99, "b": 99}, 99 * 99),
    ("urdhva", "beginner", {"a": 7, "b": 45}, 7 * 45),
    ("urdhva", "intermediate", {"a": 123, "b": 214}, 123 * 214),
    ("urdhva", "intermediate", {"a": 87, "b": 877}, 87 * 877),
    ("urdhva", "advanced", {"a": 1234, "b": 5678}, 1234 * 5678),
    ("urdhva", "advanced", {"a": 9999, "b": 9999}, 9999 * 9999),
    ("ekadhikena", "beginner", {"number": 35}, 35 * 35),
    ("ekadhikena", "intermediate", {"number": 115}, 115 * 115),
    ("ekadhikena", "advanced", {"number": 9995}, 9995 * 9995),
    ("yavadunam", "beginner", {"number": 97}, 97 * 97),
    ("yavadunam", "beginner", {"number": 103}, 103 * 103),
    ("yavadunam", "beginner", {"number": 90}, 90 * 90),
    ("yavadunam", "intermediate", {"number": 996}, 996 * 996),
    ("yavadunam", "advanced", {"number": 10004}, 10004 * 10004),
    ("ekanyunena", "beginner", {"number": 47}, 47 * 99),
    ("ekanyunena", "beginner", {"number": 5}, 5 * 99),
    ("ekanyunena", "beginner", {"number": 100}, 100 * 99),
    ("ekanyunena", "intermediate", {"number": 473}, 473 * 999),
    ("ekanyunena", "advanced", {"number": 1}, 1 * 9999),
]

IDS = [f"{sutra}-{level}-{'x'.join(str(v) for v in operands.values())}" for sutra, level, operands, _ in PROBLEMS]


def get_questions(sutra, difficulty, operands):
    response = client.get(f"/sutras/{sutra}/questions", params={"difficulty": difficulty, **operands})
    assert response.status_code == 200, response.text
    body = response.json()
    assert set(body) == {"sutra", "numbers", "difficulty", "questions"}
    return body["questions"]


def post_check(sutra, difficulty, operands, question, answer):
    response = client.post(
        f"/sutras/{sutra}/check",
        json={"question": question, "answer": answer, "difficulty": difficulty, **operands},
    )
    assert response.status_code == 200, response.text
    return response.json()


def wrong_answer(question):
    if question["answer_type"] == "digits":
        return "1" * question["digits"]
    return "123456789"


@pytest.mark.parametrize("sutra, difficulty, operands, product", PROBLEMS, ids=IDS)
def test_every_question_follows_the_same_contract(sutra, difficulty, operands, product):
    questions = get_questions(sutra, difficulty, operands)
    assert questions, "every problem has questions"
    assert questions[-1]["key"] == "result"

    for question in questions:
        assert QUESTION_FIELDS <= set(question)
        assert "expected" not in question

        wrong = post_check(sutra, difficulty, operands, question["key"], wrong_answer(question))
        if wrong["is_correct"]:
            wrong = post_check(sutra, difficulty, operands, question["key"], "2" * question.get("digits", 9))

        assert set(wrong) == CHECK_FIELDS
        assert wrong["sutra"] == sutra
        assert wrong["difficulty"] == difficulty
        assert wrong["status"] == "incorrect"
        assert wrong["is_correct"] is False
        assert isinstance(wrong["correct_answer"], str) and wrong["correct_answer"] != ""

        right = post_check(sutra, difficulty, operands, question["key"], wrong["correct_answer"])
        assert set(right) == CHECK_FIELDS
        assert right["status"] == "correct"
        assert right["is_correct"] is True
        assert right["correct_answer"] is None

    final = post_check(sutra, difficulty, operands, "result", "0")
    assert final["correct_answer"] == str(product)


@pytest.mark.parametrize("sutra, difficulty, operands, product", PROBLEMS, ids=IDS)
def test_check_all_returns_one_result_per_answer(sutra, difficulty, operands, product):
    questions = get_questions(sutra, difficulty, operands)
    answers = {question["key"]: wrong_answer(question) for question in questions}
    answers["result"] = str(product)

    response = client.post(f"/sutras/{sutra}/check-all", json={"answers": answers, "difficulty": difficulty, **operands})
    assert response.status_code == 200, response.text
    body = response.json()

    assert set(body) == {"sutra", "numbers", "difficulty", "total_questions", "answered", "correct", "all_correct", "results"}
    assert body["total_questions"] == len(questions)
    assert body["answered"] == len(questions)
    assert [result["question"] for result in body["results"]] == [question["key"] for question in questions]
    for result in body["results"]:
        assert set(result) == CHECK_FIELDS
        assert (result["correct_answer"] is None) == result["is_correct"]
    assert body["results"][-1]["is_correct"] is True


def test_check_all_with_every_answer_right():
    params = {"a": 23, "b": 14, "difficulty": "beginner"}
    questions = get_questions("urdhva", "beginner", {"a": 23, "b": 14})
    answers = {}
    for question in questions:
        answers[question["key"]] = post_check("urdhva", "beginner", {"a": 23, "b": 14}, question["key"], "999")["correct_answer"]

    body = client.post("/sutras/urdhva/check-all", json={"answers": answers, **params}).json()
    assert body["correct"] == len(questions)
    assert body["all_correct"] is True


def test_check_all_skips_unanswered_questions():
    body = client.post(
        "/sutras/nikhilam/check-all",
        json={"answers": {"result": "9506"}, "a": 98, "b": 97},
    ).json()
    assert body["answered"] == 1
    assert body["all_correct"] is False


def test_check_all_rejects_unknown_questions():
    response = client.post("/sutras/nikhilam/check-all", json={"answers": {"base": "100"}, "a": 98, "b": 97})
    assert response.status_code == 400


@pytest.mark.parametrize(
    "sutra, params",
    [
        ("yavadunam", {"number": 50}),
        ("ekanyunena", {"number": 150}),
        ("ekadhikena", {"number": 36}),
    ],
)
def test_unsupported_inputs_use_the_engine_messages(sutra, params):
    response = client.get(f"/sutras/{sutra}/questions", params=params)
    assert response.status_code == 400
    assert isinstance(response.json()["detail"], str)
