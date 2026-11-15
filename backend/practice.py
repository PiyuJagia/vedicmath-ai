"""Practice questions and answer checking.

Each question asks the learner for one value that the Sutra's engine
calculates. The questions endpoint publishes only keys and answer formats.
The check endpoint compares an answer with the engine's value and returns
the same response shape for every Sutra and difficulty level; when the
answer is incorrect, the response includes the correct answer.
"""

from typing import Any, Dict, List, Optional, Tuple


INTEGER = "integer"
DIGITS = "digits"

MINUS_SIGNS = ("\u2212", "\u2013", "\u2014")

# Far longer than any answer in the app; also keeps int() within Python's digit limit.
MAX_ANSWER_LENGTH = 40


def _question(
    key: str,
    step_id: int,
    expected: Any,
    answer_type: str = INTEGER,
    mistakes: Optional[List[Tuple[int, str]]] = None,
) -> Dict[str, Any]:
    question = {
        "key": key,
        "step_id": step_id,
        "answer_type": answer_type,
        "expected": expected,
    }
    if answer_type == DIGITS:
        question["digits"] = len(expected)
    if mistakes:
        question["mistakes"] = _known_mistakes(expected, mistakes)
    return question


def _known_mistakes(expected: Any, candidates: List[Tuple[int, str]]) -> Dict[int, str]:
    """
    Map wrong answers that come from a known wrong procedure to a mistake tag.

    Each candidate is the exact value a learner gets by following that wrong
    procedure with this problem's numbers. A value that equals the correct
    answer, or that the sign check already explains, cannot be told apart from
    those cases and is dropped. When two procedures give the same value, the
    first one listed wins.
    """
    known: Dict[int, str] = {}
    for value, tag in candidates:
        if value == expected or (expected != 0 and value == -expected):
            continue
        known.setdefault(value, tag)
    return known


def _step_ids(calculation: Dict[str, Any]) -> Dict[str, int]:
    return {step["title"]: step["step"] for step in calculation["teaching_steps"]}


def _event(calculation: Dict[str, Any], action: str) -> Dict[str, Any]:
    for event in calculation["animation_steps"]:
        if event["action"] == action:
            return event
    raise KeyError(f"The calculation has no '{action}' event.")


def _needs_padding(text: str) -> bool:
    return len(str(int(text))) < len(text)


def nikhilam_questions(steps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    by_type = {step["type"]: step for step in steps}
    deviations = by_type["deviations"]
    cross = by_type["cross_subtract"]
    multiply = by_type["multiply_deviations"]
    combine = by_type["combine"]

    a, b = by_type["base"]["numbers"]
    base = by_type["base"]["base"]
    dev_a, dev_b = deviations["deviations"]
    left, right = cross["left_part"], multiply["right_part"]

    questions = [
        _question("deviation_a", deviations["id"], dev_a),
        _question("deviation_b", deviations["id"], dev_b),
        _question("left_part", cross["id"], left, mistakes=[
            (a + dev_b, "cross_added"),
            (b + dev_a, "cross_added"),
            (a - dev_a, "own_deviation"),
            (b - dev_b, "own_deviation"),
        ]),
        _question("right_part", multiply["id"], right, mistakes=[
            (dev_a + dev_b, "deviations_added"),
        ]),
    ]

    adjust = by_type.get("adjust")
    if adjust:
        backwards = adjust["left_before"] - adjust["amount"] if adjust["adjustment"] == "carry" else adjust["left_before"] + adjust["amount"]
        questions.append(_question("adjusted_left_part", adjust["id"], adjust["left_after"], mistakes=[
            (backwards, "adjust_wrong_direction"),
            (adjust["left_before"], "skipped_adjustment"),
        ]))
        questions.append(_question("adjusted_right_part", adjust["id"], adjust["right_after"], mistakes=[
            (adjust["right_before"], "skipped_adjustment"),
        ]))

    if combine["padding_zeros"] > 0:
        questions.append(_question("padded_right_part", combine["id"], combine["formatted_right"], DIGITS))

    result_mistakes = []
    if adjust:
        result_mistakes.append((int(f"{left}{abs(right)}"), "skipped_adjustment"))
    if combine["padding_zeros"] > 0:
        result_mistakes.append((int(f"{combine['left_part']}{int(combine['formatted_right'])}"), "result_missing_padding"))
    questions.append(_question("result", combine["id"], combine["result"], mistakes=result_mistakes))
    return questions


def urdhva_questions(steps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    questions = []
    column_number = 0

    for step in steps:
        if step["type"] == "multiplication_column":
            column_number += 1
            prefix = f"column_{column_number}"
            total, digit, carry_in = step["total"], step["write_digit"], step["incoming_carry"]
            two_digit_total = total >= 10
            questions.append(_question(f"{prefix}_total", step["id"], total, mistakes=(
                [(total - carry_in, "forgot_carry_in")] if carry_in else []
            )))
            questions.append(_question(f"{prefix}_digit", step["id"], digit, mistakes=(
                [(total, "wrote_whole_total")] if two_digit_total else []
            )))
            questions.append(_question(f"{prefix}_carry", step["id"], step["outgoing_carry"], mistakes=(
                [(digit, "carry_digit_swapped")] + ([(total, "carried_whole_total")] if two_digit_total else [])
            )))

        elif step["type"] == "final_carry":
            column_number += 1
            questions.append(_question(f"column_{column_number}_digit", step["id"], step["write_digit"]))

        elif step["type"] == "combine":
            questions.append(_question("result", step["id"], step["result"]))

    return questions


def ekadhikena_questions(calculation: Dict[str, Any]) -> List[Dict[str, Any]]:
    steps = _step_ids(calculation)
    previous, following, left = calculation["previous"], calculation["next_number"], calculation["left_part"]
    return [
        _question("next_number", steps["Add one to the preceding part"], following, mistakes=[
            (previous - 1, "one_less_not_one_more"),
            (previous, "forgot_one_more"),
        ]),
        _question("left_part", steps["Multiply the two numbers"], left, mistakes=[
            (previous * previous, "multiplied_by_itself"),
            (previous + following, "added_not_multiplied"),
        ]),
        _question("right_part", steps["Append 25"], calculation["right_part"]),
        _question("result", steps["Final answer"], calculation["result"], mistakes=[
            (left * 10 + 5, "wrote_5_not_25"),
            (previous * previous * 100 + 25, "multiplied_by_itself"),
        ]),
    ]


def yavadunam_questions(calculation: Dict[str, Any]) -> List[Dict[str, Any]]:
    steps = _step_ids(calculation)
    normalize = _event(calculation, "normalize_parts")
    right_text = normalize["right_part"]

    questions = [
        _question("deviation", steps["Find the deviation"], _event(calculation, "show_deviation")["deviation"]),
        _question("left_part", steps["Calculate the left part"], _event(calculation, "calculate_left")["value"]),
        _question("right_part", steps["Square the deviation"], _event(calculation, "square_deviation")["value"]),
    ]
    if normalize["carry"] != 0:
        questions.append(_question("adjusted_left_part", steps["Normalize the right part"], normalize["left_part"]))
        questions.append(_question("adjusted_right_part", steps["Normalize the right part"], int(right_text)))
    if _needs_padding(right_text):
        questions.append(_question("padded_right_part", steps["Normalize the right part"], right_text, DIGITS))
    questions.append(_question("result", steps["Combine the parts"], calculation["result"]))
    return questions


def ekanyunena_questions(calculation: Dict[str, Any]) -> List[Dict[str, Any]]:
    steps = _step_ids(calculation)
    right_text = _event(calculation, "format_right_part")["value"]

    questions = [
        _question("left_part", steps["Find one less than the number"], _event(calculation, "subtract_one")["value"]),
        _question("right_part", steps["Find the complement"], _event(calculation, "calculate_complement")["value"]),
    ]
    if _needs_padding(right_text):
        questions.append(_question("padded_right_part", steps["Format the right part"], right_text, DIGITS))
    questions.append(_question("result", steps["Combine the parts"], calculation["result"]))
    return questions


def public_questions(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [
        {key: value for key, value in question.items() if key not in ("expected", "mistakes")}
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


def _is_number_text(text: str) -> bool:
    # isdecimal accepts only true decimal digits (including other scripts), never "²".
    return 0 < len(text) <= MAX_ANSWER_LENGTH and text.isdecimal()


def _parse_integer(text: str) -> Optional[int]:
    body = text[1:] if text.startswith("-") else text
    if not _is_number_text(body):
        return None
    return int(text)


def check_answer(question: Dict[str, Any], raw_answer: str) -> Dict[str, Any]:
    """
    Compare a learner's answer with the engine's value.

    Every response has the same fields. `correct_answer` is filled in only
    when the answer is incorrect; it stays empty for correct answers and
    for input that is not a number at all.
    """
    expected = question["expected"]
    response = {
        "question": question["key"],
        "step_id": question["step_id"],
        "answer_type": question["answer_type"],
        "submitted_answer": raw_answer,
        "status": "incorrect",
        "is_correct": False,
        "correct_answer": None,
        "mistake": None,
        "message": None,
    }

    def mark_correct():
        response["status"] = "correct"
        response["is_correct"] = True
        return response

    def mark_incorrect(mistake: Optional[str] = None):
        response["correct_answer"] = str(expected)
        response["mistake"] = mistake
        return response

    text = _normalize(raw_answer)

    if question["answer_type"] == DIGITS:
        if not _is_number_text(text):
            response["status"] = "invalid"
            response["message"] = f"Enter {question['digits']} digits, for example {'0' * (question['digits'] - 1)}1."
            return response
        if text == expected:
            return mark_correct()
        return mark_incorrect("missing_padding" if int(text) == int(expected) else None)

    answer = _parse_integer(text)
    if answer is None:
        response["status"] = "invalid"
        response["message"] = "Enter a whole number, such as 95 or -3."
        return response

    if answer == expected:
        return mark_correct()
    if expected != 0 and answer == -expected:
        return mark_incorrect("sign")
    return mark_incorrect(question.get("mistakes", {}).get(answer))
