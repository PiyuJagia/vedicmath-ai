"""Practice questions and answer checking.

Each question asks the learner for one value from a backend-calculated
lesson. The expected value never leaves this module: the questions
endpoint publishes only keys and answer formats, and the check endpoint
returns whether an answer is correct plus a mistake category.
"""

from typing import Any, Dict, List, Optional


INTEGER = "integer"
DIGITS = "digits"

MINUS_SIGNS = ("\u2212", "\u2013", "\u2014")


def _question(key: str, step_id: int, expected: Any, answer_type: str = INTEGER) -> Dict[str, Any]:
    question = {
        "key": key,
        "step_id": step_id,
        "answer_type": answer_type,
        "expected": expected,
    }
    if answer_type == DIGITS:
        question["digits"] = len(expected)
    return question


def nikhilam_questions(steps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    by_type = {step["type"]: step for step in steps}
    deviations = by_type["deviations"]
    cross = by_type["cross_subtract"]
    multiply = by_type["multiply_deviations"]
    combine = by_type["combine"]

    questions = [
        _question("deviation_a", deviations["id"], deviations["deviations"][0]),
        _question("deviation_b", deviations["id"], deviations["deviations"][1]),
        _question("left_part", cross["id"], cross["left_part"]),
        _question("right_part", multiply["id"], multiply["right_part"]),
    ]

    adjust = by_type.get("adjust")
    if adjust:
        questions.append(_question("adjusted_left_part", adjust["id"], adjust["left_after"]))
        questions.append(_question("adjusted_right_part", adjust["id"], adjust["right_after"]))

    if combine["padding_zeros"] > 0:
        questions.append(_question("padded_right_part", combine["id"], combine["formatted_right"], DIGITS))

    questions.append(_question("result", combine["id"], combine["result"]))
    return questions


def urdhva_questions(steps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    questions = []
    column_number = 0

    for step in steps:
        if step["type"] == "multiplication_column":
            column_number += 1
            prefix = f"column_{column_number}"
            questions.append(_question(f"{prefix}_total", step["id"], step["total"]))
            questions.append(_question(f"{prefix}_digit", step["id"], step["write_digit"]))
            questions.append(_question(f"{prefix}_carry", step["id"], step["outgoing_carry"]))

        elif step["type"] == "final_carry":
            column_number += 1
            questions.append(_question(f"column_{column_number}_digit", step["id"], step["write_digit"]))

        elif step["type"] == "combine":
            questions.append(_question("result", step["id"], step["result"]))

    return questions


def ekadhikena_questions(calculation: Dict[str, Any]) -> List[Dict[str, Any]]:
    steps = {step["title"]: step["step"] for step in calculation["teaching_steps"]}
    return [
        _question("next_number", steps["Add one to the preceding part"], calculation["next_number"]),
        _question("left_part", steps["Multiply the two numbers"], calculation["left_part"]),
        _question("right_part", steps["Append 25"], calculation["right_part"]),
        _question("result", steps["Final answer"], calculation["result"]),
    ]


def public_questions(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [
        {key: value for key, value in question.items() if key != "expected"}
        for question in questions
    ]


def find_question(questions: List[Dict[str, Any]], key: str) -> Optional[Dict[str, Any]]:
    for question in questions:
        if question["key"] == key:
            return question
    return None


def _normalize(raw: str) -> str:
    text = raw.strip().replace(" ", "")
    for sign in MINUS_SIGNS:
        text = text.replace(sign, "-")
    if text.startswith("+"):
        text = text[1:]
    return text


def _parse_integer(text: str) -> Optional[int]:
    body = text[1:] if text.startswith("-") else text
    if not body.isdigit():
        return None
    return int(text)


def check_answer(question: Dict[str, Any], raw_answer: str) -> Dict[str, Any]:
    """Compare a learner's answer with the expected value."""
    response = {
        "question": question["key"],
        "step_id": question["step_id"],
        "status": "incorrect",
        "mistake": None,
        "message": None,
    }

    text = _normalize(raw_answer)

    if question["answer_type"] == DIGITS:
        if not text.isdigit():
            response["status"] = "invalid"
            response["message"] = f"Enter {question['digits']} digits, for example {'0' * (question['digits'] - 1)}1."
            return response

        expected = question["expected"]
        if text == expected:
            response["status"] = "correct"
        elif int(text) == int(expected):
            response["mistake"] = "missing_padding"
        return response

    answer = _parse_integer(text)
    if answer is None:
        response["status"] = "invalid"
        response["message"] = "Enter a whole number, such as 95 or -3."
        return response

    expected = question["expected"]
    if answer == expected:
        response["status"] = "correct"
    elif expected != 0 and answer == -expected:
        response["mistake"] = "sign"
    return response
