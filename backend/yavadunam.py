
"""Yavadunam: squaring numbers near powers of 10."""

from typing import Any, Dict


LEVELS = {
    "beginner": (100, 90, 109),
    "intermediate": (1000, 990, 1009),
    "advanced": (10000, 9990, 10009),
}


def calculate_yavadunam(
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

    base, minimum, maximum = LEVELS[difficulty]

    if not minimum <= number <= maximum:
        raise ValueError(
            f"{difficulty.title()} requires a number "
            f"between {minimum} and {maximum}."
        )

    deviation = number - base
    raw_left = number + deviation
    deviation_square = deviation * deviation

    # Normalize the right-hand part to the base width.
    carry, right_part = divmod(deviation_square, base)
    left_part = raw_left + carry

    right_width = len(str(base)) - 1
    right_text = str(right_part).zfill(right_width)

    result = left_part * base + right_part

    if result != number * number:
        raise ArithmeticError(
            "Yavadunam calculation verification failed."
        )

    teaching_steps = [
        {
            "step": 1,
            "title": "Identify the base",
            "explanation": (
                f"We want to square {number}. "
                f"Choose base {base}."
            ),
        },
        {
            "step": 2,
            "title": "Find the deviation",
            "explanation": (
                f"{number} - {base} = {deviation}."
            ),
        },
        {
            "step": 3,
            "title": "Calculate the left part",
            "explanation": (
                f"{number} + ({deviation}) = {raw_left}."
            ),
        },
        {
            "step": 4,
            "title": "Square the deviation",
            "explanation": (
                f"({deviation}) squared = {deviation_square}."
            ),
        },
        {
            "step": 5,
            "title": "Normalize the right part",
            "explanation": (
                f"Keep {right_width} digits on the right. "
                f"Carry {carry} to the left. "
                f"Left = {left_part}, right = {right_text}."
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
            "action": "show_number",
            "number": number,
        },
        {
            "action": "show_base",
            "base": base,
        },
        {
            "action": "show_deviation",
            "number": number,
            "base": base,
            "deviation": deviation,
        },
        {
            "action": "calculate_left",
            "number": number,
            "deviation": deviation,
            "value": raw_left,
        },
        {
            "action": "square_deviation",
            "deviation": deviation,
            "value": deviation_square,
        },
        {
            "action": "normalize_parts",
            "carry": carry,
            "left_part": left_part,
            "right_part": right_text,
        },
        {
            "action": "reveal_result",
            "result": result,
        },
    ]

    return {
        "method": "Yavadunam",
        "sutra": "Whatever the deficiency",
        "number": number,
        "difficulty": difficulty,
        "base": base,
        "deviation": deviation,
        "left_part": left_part,
        "right_part": right_text,
        "result": result,
        "teaching_steps": teaching_steps,
        "animation_steps": animation_steps,
    }
