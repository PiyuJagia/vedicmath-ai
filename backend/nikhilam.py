"""Nikhilam Navatashcaramam Dashatah: multiplying numbers near a base.

Deviations follow the base - number convention:

    deviation = base - number
    left part = a - deviation_b   (equal to b - deviation_a)
    right part = deviation_a * deviation_b

A number below the base has a positive deviation; a number above the
base has a negative one.

Animation events name each value by its role on the stage
(``number_a``, ``deviation_b``, ``left_part``, ...) instead of by its
numeric value, so equal operands such as 98 x 98 stay unambiguous.
"""

from typing import Any, Dict, List


SUPPORTED_BASES = (100, 1000, 10000)

DEVIATION_CONVENTION = "base - number"


def build_nikhilam_steps(a: int, b: int, base: int = 100) -> List[Dict[str, Any]]:
    """
    Build structured teaching steps for Nikhilam.

    Steps: base, deviations, cross_subtract, multiply_deviations,
    an optional adjust step (only when a borrow or carry is needed),
    and combine. The combine step is always last and holds the result.
    """
    if base not in SUPPORTED_BASES:
        raise ValueError("Base must be 100, 1000, or 10000.")

    right_digits = len(str(base)) - 1

    deviation_a = base - a
    deviation_b = base - b

    left_from_a = a - deviation_b
    left_from_b = b - deviation_a

    if left_from_a != left_from_b:
        raise ArithmeticError("Nikhilam cross-subtractions disagree.")

    left = left_from_a
    right = deviation_a * deviation_b

    # Normalize the two parts using carrying or borrowing.
    carry, normalized_right = divmod(right, base)
    normalized_left = left + carry

    adjustment = (
        "borrow" if carry < 0
        else "carry" if carry > 0
        else "none"
    )

    formatted_right = f"{normalized_right:0{right_digits}d}"
    padding_zeros = len(formatted_right) - len(str(normalized_right))
    result = normalized_left * base + normalized_right

    if result != a * b:
        raise ArithmeticError("Nikhilam calculation verification failed.")

    steps = [
        {
            "type": "base",
            "title": "Choose a base",
            "base": base,
            "numbers": [a, b],
            "right_digits": right_digits,
        },
        {
            "type": "deviations",
            "title": "Calculate deviations",
            "convention": DEVIATION_CONVENTION,
            "deviations": [deviation_a, deviation_b],
            "calculations": [
                {
                    "operand": "number_a",
                    "target": "deviation_a",
                    "base": base,
                    "number": a,
                    "deviation": deviation_a,
                },
                {
                    "operand": "number_b",
                    "target": "deviation_b",
                    "base": base,
                    "number": b,
                    "deviation": deviation_b,
                },
            ],
        },
        {
            "type": "cross_subtract",
            "title": "Cross-subtract",
            "left_part": left,
            "cross_calculations": [
                {
                    "operand": "number_a",
                    "deviation_operand": "deviation_b",
                    "number": a,
                    "deviation": deviation_b,
                    "value": left_from_a,
                },
                {
                    "operand": "number_b",
                    "deviation_operand": "deviation_a",
                    "number": b,
                    "deviation": deviation_a,
                    "value": left_from_b,
                },
            ],
        },
        {
            "type": "multiply_deviations",
            "title": "Multiply deviations",
            "deviations": [deviation_a, deviation_b],
            "right_part": right,
            # Kept for older consumers; padding is now taught in the combine step.
            "formatted_right": f"{right:0{right_digits}d}",
        },
    ]

    if adjustment != "none":
        amount = abs(carry)
        steps.append({
            "type": "adjust",
            "title": (
                "Borrow from the left part"
                if adjustment == "borrow"
                else "Carry into the left part"
            ),
            "adjustment": adjustment,
            "carry": carry,
            "amount": amount,
            "base": base,
            "left_before": left,
            "left_after": normalized_left,
            "right_before": right,
            "right_after": normalized_right,
            "right_change": normalized_right - right,
        })

    steps.append({
        "type": "combine",
        "title": "Combine the parts",
        "original_left": left,
        "original_right": right,
        "adjustment": adjustment,
        "carry": carry,
        "left_part": normalized_left,
        "right_part": normalized_right,
        "right_digits": right_digits,
        "padding_zeros": padding_zeros,
        "formatted_right": formatted_right,
        "result": result,
    })

    return [
        {"id": step_id, **step}
        for step_id, step in enumerate(steps, start=1)
    ]


def build_nikhilam_animation_events(steps: list) -> list:
    """
    Convert Nikhilam teaching steps into animation steps.

    Every value comes from the teaching steps; nothing is recalculated here.
    """
    animation_steps = []

    for step in steps:
        events = []

        if step["type"] == "base":
            a, b = step["numbers"]
            events = [
                {
                    "action": "show_numbers",
                    "number1": a,
                    "number2": b,
                    "operands": [
                        {"id": "number_a", "value": a},
                        {"id": "number_b", "value": b},
                    ],
                },
                {
                    "action": "show_base",
                    "target": "base",
                    "value": step["base"],
                    "right_digits": step["right_digits"],
                },
                {
                    "action": "compare_with_base",
                    "base": "base",
                    "operands": ["number_a", "number_b"],
                },
            ]

        elif step["type"] == "deviations":
            events = [
                {
                    "action": "calculate_deviation",
                    "convention": step["convention"],
                    "operand": calculation["operand"],
                    "target": calculation["target"],
                    "base": calculation["base"],
                    "number": calculation["number"],
                    "deviation": calculation["deviation"],
                }
                for calculation in step["calculations"]
            ]

        elif step["type"] == "cross_subtract":
            events = [
                {
                    "action": "cross_subtract",
                    "operand": calculation["operand"],
                    "deviation_operand": calculation["deviation_operand"],
                    "number": calculation["number"],
                    "deviation": calculation["deviation"],
                    "value": calculation["value"],
                }
                for calculation in step["cross_calculations"]
            ]
            events.append({
                "action": "show_left_part",
                "target": "left_part",
                "value": step["left_part"],
                "sources": ["number_a", "number_b"],
            })

        elif step["type"] == "multiply_deviations":
            events = [
                {
                    "action": "multiply_deviations",
                    "operands": ["deviation_a", "deviation_b"],
                    "values": step["deviations"],
                    "value": step["right_part"],
                },
                {
                    "action": "show_right_part",
                    "target": "right_part",
                    "value": step["right_part"],
                },
            ]

        elif step["type"] == "adjust":
            borrowing = step["adjustment"] == "borrow"
            events = [
                {
                    "action": "adjust_parts",
                    "adjustment": step["adjustment"],
                    "source": "left_part" if borrowing else "right_part",
                    "destination": "right_part" if borrowing else "left_part",
                    "amount": step["amount"],
                    "base": step["base"],
                    "left_before": step["left_before"],
                    "left_after": step["left_after"],
                    "right_before": step["right_before"],
                    "right_after": step["right_after"],
                    "right_change": step["right_change"],
                },
            ]

        elif step["type"] == "combine":
            if step["padding_zeros"] > 0:
                events.append({
                    "action": "pad_right_part",
                    "target": "right_part",
                    "value": step["right_part"],
                    "right_digits": step["right_digits"],
                    "padding_zeros": step["padding_zeros"],
                    "formatted": step["formatted_right"],
                })
            events.append({
                "action": "join_parts",
                "left_part": step["left_part"],
                "formatted_right": step["formatted_right"],
            })
            events.append({
                "action": "reveal_result",
                "target": "result",
                "value": step["result"],
            })

        animation_steps.append({
            "step_id": step["id"],
            "title": step["title"],
            "type": step["type"],
            "events": events,
        })

    return animation_steps
