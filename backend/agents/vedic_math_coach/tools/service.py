"""Call the same engine helpers FastAPI uses, without HTTP."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException

from backend.main import (
    PRACTICE_SUTRAS,
    build_nikhilam_animation_events,
    build_nikhilam_steps,
    build_urdhva_animation,
    get_ekadhikena_calculation,
    get_ekanyunena_calculation,
    get_nikhilam_settings,
    get_practice_questions,
    get_urdhva_calculation,
    get_yavadunam_calculation,
)
from backend.practice import check_answer, find_question, public_questions

SUTRAS = PRACTICE_SUTRAS
TWO_OPERAND = frozenset({"nikhilam", "urdhva"})
ONE_OPERAND = frozenset({"ekadhikena", "yavadunam", "ekanyunena"})


def animation_format(animation_steps: list) -> str:
    if not animation_steps:
        return "empty"
    first = animation_steps[0]
    if isinstance(first, dict) and "events" in first:
        return "grouped"
    return "flat"


def _http_to_message(error: HTTPException) -> str:
    detail = error.detail
    if isinstance(detail, str):
        return detail
    return str(detail)


def build_lesson(
    sutra: str,
    difficulty: str,
    *,
    a: Optional[int] = None,
    b: Optional[int] = None,
    number: Optional[int] = None,
) -> dict[str, Any]:
    """Return the same lesson payload shape as GET /sutras/{sutra}/lesson."""
    sutra = sutra.lower().strip()
    difficulty = (difficulty or "beginner").lower().strip()

    if sutra not in SUTRAS:
        raise ValueError(f"Unsupported sutra '{sutra}'.")

    try:
        if sutra in ONE_OPERAND:
            if number is None:
                raise ValueError("Provide the number parameter.")
            if sutra == "ekadhikena":
                calculation = get_ekadhikena_calculation(number, difficulty)
                numbers = [number, number]
                operation = "square"
            elif sutra == "yavadunam":
                calculation = get_yavadunam_calculation(number, difficulty)
                numbers = [number, number]
                operation = "square"
            else:
                calculation = get_ekanyunena_calculation(number, difficulty)
                numbers = [calculation["number1"], calculation["number2"]]
                operation = "multiply"
            return {
                "schema_version": calculation.get("schema_version", "1.0"),
                "sutra_id": sutra,
                "sutra": calculation["method"],
                "numbers": numbers,
                "difficulty": calculation["difficulty"],
                "operands": calculation.get(
                    "operands",
                    {"number": number, "operation": operation},
                ),
                "teaching_steps": calculation["teaching_steps"],
                "animation_steps": calculation["animation_steps"],
                "result": calculation["result"],
                "animation_format": animation_format(calculation["animation_steps"]),
                "problem": {"sutra": sutra, "difficulty": calculation["difficulty"], "a": None, "b": None, "number": number},
            }

        if a is None or b is None:
            raise ValueError("Provide both a and b for this sutra.")

        if sutra == "nikhilam":
            difficulty, base = get_nikhilam_settings(a, b, difficulty)
            steps = build_nikhilam_steps(a, b, base)
            animation_steps = build_nikhilam_animation_events(steps)
            result = steps[-1]["result"]
        else:
            difficulty, steps, calculation = get_urdhva_calculation(a, b, difficulty)
            animation_steps = build_urdhva_animation(a, b, steps)
            result = calculation["result"]

        if result != a * b:
            raise RuntimeError("Calculation verification failed.")

        return {
            "schema_version": "1.0",
            "sutra_id": sutra,
            "sutra": sutra,
            "numbers": [a, b],
            "difficulty": difficulty,
            "operands": {
                "number1": {"value": a, "role": "multiplicand"},
                "number2": {"value": b, "role": "multiplier"},
                "operation": "multiply",
            },
            "teaching_steps": steps,
            "animation_steps": animation_steps,
            "result": result,
            "animation_format": animation_format(animation_steps),
            "problem": {"sutra": sutra, "difficulty": difficulty, "a": a, "b": b, "number": None},
        }
    except HTTPException as error:
        raise ValueError(_http_to_message(error)) from error


def build_practice_check(
    sutra: str,
    difficulty: str,
    question_key: str,
    answer: str,
    *,
    a: Optional[int] = None,
    b: Optional[int] = None,
    number: Optional[int] = None,
) -> dict[str, Any]:
    try:
        sutra_name, numbers, difficulty, questions = get_practice_questions(
            sutra, a, b, number, difficulty
        )
    except HTTPException as error:
        raise ValueError(_http_to_message(error)) from error

    question = find_question(questions, question_key)
    if question is None:
        raise ValueError(f"Unknown question key '{question_key}'.")

    checked = check_answer(question, answer)
    return {
        "sutra": sutra_name,
        "numbers": numbers,
        "difficulty": difficulty,
        "questions": public_questions(questions),
        **checked,
    }
