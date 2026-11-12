
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
