"""Ekadhikena Purvena: teach squaring positive integers ending in 5.

Python 3.9 compatible. Animation format follows Nikhilam's step/events pattern.
"""

from typing import Any, Dict, List

SCHEMA_VERSION = "1.0"
DIGITS_BY_DIFFICULTY = {"beginner": 2, "intermediate": 3, "advanced": 4}


def calculate_ekadhikena(number: int, difficulty: str = "beginner") -> Dict[str, Any]:
    """Calculate n² for a positive 2/3/4-digit integer ending in 5.

    Retains the existing API keys teaching_steps and animation_steps.
    """
    if not isinstance(difficulty, str):
        raise ValueError("Difficulty must be a string.")
    difficulty = difficulty.lower().strip()
    if difficulty not in DIGITS_BY_DIFFICULTY:
        raise ValueError("Difficulty must be beginner, intermediate, or advanced.")
    if isinstance(number, bool) or not isinstance(number, int):
        raise ValueError("Number must be an integer.")
    if number <= 0 or number % 10 != 5:
        raise ValueError("Enter a positive integer ending in 5.")
    required_digits = DIGITS_BY_DIFFICULTY[difficulty]
    if len(str(number)) != required_digits:
        raise ValueError(
            f"{difficulty.title()} requires a number with {required_digits} digits."
        )

    previous = number // 10
    next_number = previous + 1
    left_part = previous * next_number
    last_digit = number % 10
    right_part = last_digit * last_digit
    formatted_right = str(right_part).zfill(2)
    result = left_part * 100 + right_part
    if result != number * number:
        raise ArithmeticError("Ekadhikena calculation verification failed.")

    # Every visual element has a stable identifier that the frontend can target.
    operands = {
        "number": {"role": "input", "value": number, "element_id": "input_number"},
        "previous": {"role": "preceding_part", "value": previous, "element_id": "previous_part"},
        "last_digit": {"role": "last_digit", "value": last_digit, "element_id": "last_digit"},
        "next_number": {"role": "successor", "value": next_number, "element_id": "next_number"},
        "left_part": {"role": "left_result", "value": left_part, "element_id": "left_part"},
        "right_part": {"role": "right_result", "value": right_part, "formatted": formatted_right, "element_id": "right_part"},
    }

    teaching_steps: List[Dict[str, Any]] = [
        {"step": 1, "id": 1, "type": "introduction", "title": "Identify the number",
         "explanation": f"We want to calculate {number} squared."},
        {"step": 2, "id": 2, "type": "split_number", "title": "Separate the last digit",
         "explanation": f"{number} ends in 5. The preceding part is {previous}."},
        {"step": 3, "id": 3, "type": "add_one", "title": "Add one to the preceding part",
         "explanation": f"{previous} + 1 = {next_number}."},
        {"step": 4, "id": 4, "type": "multiply_previous", "title": "Multiply the two numbers",
         "explanation": f"{previous} × {next_number} = {left_part}."},
        {"step": 5, "id": 5, "type": "append_25", "title": "Calculate and append 25",
         "explanation": f"The final digit gives {last_digit} × {last_digit} = {right_part}. Append {formatted_right} to {left_part}, giving {result}."},
        {"step": 6, "id": 6, "type": "combine", "title": "Final answer",
         "explanation": f"{number}² = {result}.", "result": result},
    ]

    # All mathematical values are computed here. React only renders and animates.
    event_groups: List[List[Dict[str, Any]]] = [
        [
            {"action": "show_number", "number": number, "value": number,
             "target": "input_number", "role": "input"},
            {"action": "show_instruction", "text": f"Square {number} using Ekadhikena Purvena."},
        ],
        [
            {"action": "highlight_last_digit", "digit": last_digit, "previous": previous,
             "target": "last_digit", "role": "last_digit"},
            {"action": "split_number", "source": "input_number",
             "destinations": ["previous_part", "last_digit"],
             "previous": previous, "last_digit": last_digit,
             "movement": {"from": "input_number", "to": ["previous_part", "last_digit"], "kind": "split"}},
        ],
        [
            {"action": "show_next_number", "previous": previous,
             "next_number": next_number, "value": next_number,
             "source": "previous_part", "target": "next_number",
             "operation": {"operator": "+", "operands": [previous, 1], "result": next_number}},
        ],
        [
            {"action": "multiply_previous", "a": previous, "b": next_number,
             "value": left_part, "sources": ["previous_part", "next_number"],
             "target": "left_part", "operand_roles": ["preceding_part", "successor"],
             "operation": {"operator": "*", "operands": [previous, next_number], "result": left_part}},
        ],
        [
            {"action": "calculate_25", "a": last_digit, "b": last_digit,
             "value": right_part, "formatted": formatted_right,
             "source": "last_digit", "target": "right_part",
             "operation": {"operator": "*", "operands": [last_digit, last_digit], "result": right_part}},
            {"action": "append_25", "left_part": left_part, "right_part": formatted_right,
             "value": result, "sources": ["left_part", "right_part"],
             "target": "combined_result",
             "movement": {"from": ["left_part", "right_part"], "to": "combined_result", "kind": "join"}},
        ],
        [
            {"action": "reveal_result", "result": result, "value": result,
             "target": "final_result"},
        ],
    ]

    animation_steps = [
        {"step_id": step["id"], "title": step["title"], "type": step["type"],
         "events": events}
        for step, events in zip(teaching_steps, event_groups)
    ]

    return {
        "schema_version": SCHEMA_VERSION,
        "method": "Ekadhikena Purvena",
        "sutra": "By one more than the previous one",
        "number": number,
        "difficulty": difficulty,
        "previous": previous,
        "next_number": next_number,
        "left_part": left_part,
        "right_part": right_part,
        "formatted_right": formatted_right,
        "result": result,
        "operands": operands,
        "teaching_steps": teaching_steps,
        "animation_steps": animation_steps,
    }
