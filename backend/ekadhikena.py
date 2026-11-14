
"""Ekadhikena Purvena: squaring positive integers ending in 5."""

from typing import Any


def calculate_ekadhikena(
    number: int, difficulty: str = "beginner"
) -> dict[str, Any]:
    difficulty = difficulty.lower().strip()

    digit_ranges = {
        "beginner": (2, 2),
        "intermediate": (3, 3),
        "advanced": (4, 4),
    }

    if difficulty not in digit_ranges:
        raise ValueError(
            "Difficulty must be beginner, intermediate, or advanced."
        )

    if isinstance(number, bool) or not isinstance(number, int):
        raise ValueError("Number must be an integer.")

    if number <= 0 or number % 10 != 5:
        raise ValueError("Enter a positive integer ending in 5.")

    minimum, maximum = digit_ranges[difficulty]
    digit_count = len(str(number))

    if not minimum <= digit_count <= maximum:
        raise ValueError(
            f"{difficulty.title()} requires a number "
            f"with {minimum} digit(s)."
        )

    previous = number // 10
    next_number = previous + 1
    left_part = previous * next_number
    right_part = 25
    result = left_part * 100 + right_part

    teaching_steps = [
        {
            "step": 1,
            "title": "Identify the number",
            "explanation": f"We want to calculate {number} squared.",
        },
        {
            "step": 2,
            "title": "Separate the last digit",
            "explanation": (
                f"{number} ends in 5. "
                f"The preceding part is {previous}."
            ),
        },
        {
            "step": 3,
            "title": "Add one to the preceding part",
            "explanation": (
                f"{previous} + 1 = {next_number}."
            ),
        },
        {
            "step": 4,
            "title": "Multiply the two numbers",
            "explanation": (
                f"{previous} × {next_number} = {left_part}."
            ),
        },
        {
            "step": 5,
            "title": "Append 25",
            "explanation": (
                f"Append 25 to {left_part}, giving {result}."
            ),
        },
        {
            "step": 6,
            "title": "Final answer",
            "explanation": f"{number}² = {result}.",
        },
    ]

    animation_steps = [
        {"action": "show_number", "number": number},
        {
            "action": "highlight_last_digit",
            "digit": 5,
            "previous": previous,
        },
        {
            "action": "show_next_number",
            "previous": previous,
            "next_number": next_number,
        },
        {
            "action": "multiply_previous",
            "a": previous,
            "b": next_number,
            "value": left_part,
        },
        {
            "action": "append_25",
            "left_part": left_part,
            "right_part": "25",
        },
        {"action": "reveal_result", "result": result},
    ]

    return {
        "method": "Ekadhikena Purvena",
        "sutra": "By one more than the previous one",
        "number": number,
        "difficulty": difficulty,
        "previous": previous,
        "next_number": next_number,
        "left_part": left_part,
        "right_part": right_part,
        "result": result,
        "teaching_steps": teaching_steps,
        "animation_steps": animation_steps,
    }

"""Ekadhikena Purvena: squaring positive integers ending in 5."""

from typing import Any


def calculate_ekadhikena(
    number: int, difficulty: str = "beginner"
) -> dict[str, Any]:
    difficulty = difficulty.lower().strip()

    digit_ranges = {
        "beginner": (2, 2),
        "intermediate": (3, 3),
        "advanced": (4, 4),
    }

    if difficulty not in digit_ranges:
        raise ValueError(
            "Difficulty must be beginner, intermediate, or advanced."
        )

    if isinstance(number, bool) or not isinstance(number, int):
        raise ValueError("Number must be an integer.")

    if number <= 0 or number % 10 != 5:
        raise ValueError("Enter a positive integer ending in 5.")

    minimum, maximum = digit_ranges[difficulty]
    digit_count = len(str(number))

    if not minimum <= digit_count <= maximum:
        raise ValueError(
            f"{difficulty.title()} requires a number "
            f"with {minimum} digit(s)."
        )

    previous = number // 10
    next_number = previous + 1
    left_part = previous * next_number
    right_part = 25
    result = left_part * 100 + right_part

    teaching_steps = [
        {
            "step": 1,
            "title": "Identify the number",
            "explanation": f"We want to calculate {number} squared.",
        },
        {
            "step": 2,
            "title": "Separate the last digit",
            "explanation": (
                f"{number} ends in 5. "
                f"The preceding part is {previous}."
            ),
        },
        {
            "step": 3,
            "title": "Add one to the preceding part",
            "explanation": (
                f"{previous} + 1 = {next_number}."
            ),
        },
        {
            "step": 4,
            "title": "Multiply the two numbers",
            "explanation": (
                f"{previous} × {next_number} = {left_part}."
            ),
        },
        {
            "step": 5,
            "title": "Append 25",
            "explanation": (
                f"Append 25 to {left_part}, giving {result}."
            ),
        },
        {
            "step": 6,
            "title": "Final answer",
            "explanation": f"{number}² = {result}.",
        },
    ]

    animation_steps = [
        {"action": "show_number", "number": number},
        {
            "action": "highlight_last_digit",
            "digit": 5,
            "previous": previous,
        },
        {
            "action": "show_next_number",
            "previous": previous,
            "next_number": next_number,
        },
        {
            "action": "multiply_previous",
            "a": previous,
            "b": next_number,
            "value": left_part,
        },
        {
            "action": "append_25",
            "left_part": left_part,
            "right_part": "25",
        },
        {"action": "reveal_result", "result": result},
    ]

    return {
        "method": "Ekadhikena Purvena",
        "sutra": "By one more than the previous one",
        "number": number,
        "difficulty": difficulty,
        "previous": previous,
        "next_number": next_number,
        "left_part": left_part,
        "right_part": right_part,
        "result": result,
        "teaching_steps": teaching_steps,
        "animation_steps": animation_steps,
    }
