
def build_nikhilam_steps(a: int, b: int, base: int = 100):
    if base not in (100, 1000, 10000):
        raise ValueError("Base must be 100, 1000, or 10000.")

    digits = len(str(base)) - 1

    deviation_a = a - base
    deviation_b = b - base

    left = a + deviation_b
    right = deviation_a * deviation_b


    # Normalize the two parts using carrying or borrowing.
    carry, normalized_right = divmod(right, base)
    normalized_left = left + carry

    adjustment = (
        "borrow" if carry < 0
        else "carry" if carry > 0
        else "none"
    )


    return [
        {
            "id": 1,
            "type": "base",
            "title": "Choose a base",
            "base": base,
            "numbers": [a, b],
        },
        {
            "id": 2,
            "type": "deviations",
            "title": "Calculate deviations",
            "deviations": [deviation_a, deviation_b],
        },
        {
            "id": 3,
            "type": "cross_subtract",
            "title": "Cross-subtract",
            "left_part": left,
        },
        {
            "id": 4,
            "type": "multiply_deviations",
            "title": "Multiply deviations",
            "right_part": right,
            "formatted_right": f"{right:0{digits}d}",
        },
        
{
    "id": 5,
    "type": "combine",
    "title": "Combine the parts",
    "original_left": left,
    "original_right": right,
    "adjustment": adjustment,
    "carry": carry,
    "left_part": normalized_left,
    "right_part": normalized_right,
    "formatted_right": f"{normalized_right:0{digits}d}",
    "result": normalized_left * base + normalized_right,
},

    ]

def build_nikhilam_animation_events(steps: list) -> list:
    """
    Convert Nikhilam teaching steps into animation steps.
    """
    animation_steps = []

    base_step = steps[0]
    a, b = base_step["numbers"]
    base = base_step["base"]

    deviations = steps[1]["deviations"]
    deviation_a, deviation_b = deviations

    for step in steps:
        events = []

        if step["type"] == "base":
            events = [
                {
                    "action": "show_numbers",
                    "number1": a,
                    "number2": b,
                },
                {
                    "action": "show_base",
                    "value": base,
                },
            ]

        elif step["type"] == "deviations":
            events = [
                {
                    "action": "show_deviation",
                    "number": a,
                    "deviation": deviation_a,
                    "position": 0,
                },
                {
                    "action": "show_deviation",
                    "number": b,
                    "deviation": deviation_b,
                    "position": 1,
                },
            ]

        elif step["type"] == "cross_subtract":
            events = [
                {
                    "action": "draw_cross_arrow",
                    "from_number": a,
                    "to_deviation": deviation_b,
                },
                {
                    "action": "show_left_part",
                    "value": step["left_part"],
                },
            ]

        elif step["type"] == "multiply_deviations":
            events = [
                {
                    "action": "highlight_deviations",
                    "values": deviations,
                },
                {
                    "action": "show_right_part",
                    "value": step["right_part"],
                    "formatted": step["formatted_right"],
                },
            ]

        elif step["type"] == "combine":
            events = [
                {
                    "action": "normalize_parts",
                    "adjustment": step["adjustment"],
                    "carry": step["carry"],
                    "left_part": step["left_part"],
                    "right_part": step["right_part"],
                    "formatted_right": step["formatted_right"],
                },
                {
                    "action": "reveal_result",
                    "value": step["result"],
                },
            ]

        animation_steps.append({
            "step_id": step["id"],
            "title": step["title"],
            "type": step["type"],
            "events": events,
        })

    return animation_steps
