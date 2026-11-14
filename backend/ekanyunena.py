
"""Ekanyunena Purvena: multiplication by strings of 9s."""

from typing import Any, Dict


LEVELS = {
    "beginner": {
        "base": 100,
        "multiplier": 99,
    },
    "intermediate": {
        "base": 1000,
        "multiplier": 999,
    },
    "advanced": {
        "base": 10000,
        "multiplier": 9999,
    },
}


def calculate_ekanyunena(
    number: int,
    difficulty: str = "beginner"
) -> Dict[str, Any]:

    if not isinstance(difficulty, str):
        raise ValueError("Difficulty must be a string.")

    difficulty = difficulty.lower().strip()

    if difficulty not in LEVELS:
        raise ValueError(
            "Difficulty must be beginner, intermediate, or advanced."
        )

    if isinstance(number, bool) or not isinstance(number, int):
        raise ValueError("Number must be an integer.")

    settings = LEVELS[difficulty]

    base = settings["base"]
    multiplier = settings["multiplier"]

    if not 1 <= number <= base:
        raise ValueError(
            f"{difficulty.title()} requires the first number "
            f"to be between 1 and {base}."
        )

    left_part = number - 1
    right_part = base - number

    right_width = len(str(base)) - 1
    right_text = str(right_part).zfill(right_width)

    result = left_part * base + right_part

    if result != number * multiplier:
        raise ArithmeticError(
            "Ekanyunena calculation verification failed."
        )

    teaching_steps = [
        {
            "step": 1,
            "title": "Identify the multiplier",
            "explanation": (
                f"We want to calculate "
                f"{number} x {multiplier}."
            ),
        },
        {
            "step": 2,
            "title": "Identify the base",
            "explanation": (
                f"The multiplier {multiplier} "
                f"is one less than {base}."
            ),
        },
        {
            "step": 3,
            "title": "Find one less than the number",
            "explanation": (
                f"{number} - 1 = {left_part}. "
                f"This forms the left part."
            ),
        },
        {
            "step": 4,
            "title": "Find the complement",
            "explanation": (
                f"{base} - {number} = {right_part}. "
                f"This forms the right part."
            ),
        },
        {
            "step": 5,
            "title": "Format the right part",
            "explanation": (
                f"The right part must have "
                f"{right_width} digits. "
                f"Write it as {right_text}."
            ),
        },
        {
            "step": 6,
            "title": "Combine the parts",
            "explanation": (
                f"{left_part} | {right_text} = {result}."
            ),
            "result": result,
        },
    ]

    animation_steps = [
        {
            "action": "show_numbers",
            "number1": number,
            "number2": multiplier,
        },
        {
            "action": "show_base",
            "base": base,
        },
        {
            "action": "subtract_one",
            "number": number,
            "value": left_part,
        },
        {
            "action": "calculate_complement",
            "base": base,
            "number": number,
            "value": right_part,
        },
        {
            "action": "format_right_part",
            "value": right_text,
            "width": right_width,
        },
        {
            "action": "combine_parts",
            "left_part": left_part,
            "right_part": right_text,
        },
        {
            "action": "reveal_result",
            "result": result,
        },
    ]

    return {
        "method": "Ekanyunena Purvena",
        "sutra": "By one less than the previous one",
        "number1": number,
        "number2": multiplier,
        "difficulty": difficulty,
        "base": base,
        "left_part": left_part,
        "right_part": right_text,
        "result": result,
        "teaching_steps": teaching_steps,
        "animation_steps": animation_steps,
    }
