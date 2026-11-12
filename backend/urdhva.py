
def calculate_urdhva(a: int, b: int) -> dict:
    """
    Calculate multiplication using the Urdhva Tiryagbhyam
    (Vertically and Crosswise) method.

    Supports positive integers of equal digit length.
    """

    if not isinstance(a, int) or not isinstance(b, int):
        raise ValueError("Both inputs must be integers.")

    if a <= 0 or b <= 0:
        raise ValueError("Both numbers must be positive.")

    if len(str(a)) != len(str(b)):
        raise ValueError("Both numbers must have equal digit lengths.")

    digits_a = [int(d) for d in str(a)[::-1]]
    digits_b = [int(d) for d in str(b)[::-1]]

    n = len(digits_a)
    carry = 0
    result_digits = []
    columns = []

    for column in range(2 * n - 1):
        products = []

        for i in range(n):
            j = column - i

         
            if 0 <= j < n:
                products.append({
                    "digit_a": digits_a[i],
                    "digit_b": digits_b[j],
                    "position_a": n - 1 - i,
                    "position_b": n - 1 - j,
                    "product": digits_a[i] * digits_b[j]
                })
   


        subtotal = sum(p["product"] for p in products)
        total = subtotal + carry

        digit = total % 10
        next_carry = total // 10

        columns.append({
            "column": column + 1,
            "products": products,
            "subtotal": subtotal,
            "incoming_carry": carry,
            "total": total,
            "write_digit": digit,
            "outgoing_carry": next_carry
        })

        result_digits.append(digit)
        carry = next_carry

    while carry > 0:
        result_digits.append(carry % 10)
        carry //= 10

    result = int("".join(str(d) for d in result_digits[::-1]))

    return {
        "number1": a,
        "number2": b,
        "columns": columns,
        "result": result
    }

def build_urdhva_steps(a: int, b: int, difficulty: str = "beginner") -> list:
    """
    Build structured teaching steps for Urdhva Tiryagbhyam.
    """

    levels = {
        "beginner": 2,
        "intermediate": 3,
        "advanced": 4,
    }

    difficulty = difficulty.lower()

    if difficulty not in levels:
        raise ValueError("Invalid difficulty level.")

    required_digits = levels[difficulty]

    if not (
        10 ** (required_digits - 1) <= a < 10 ** required_digits
        and 10 ** (required_digits - 1) <= b < 10 ** required_digits
    ):
        raise ValueError(
            f"{difficulty} requires two {required_digits}-digit numbers."
        )

    calculation = calculate_urdhva(a, b)

    steps = [
        {
            "id": 1,
            "type": "introduction",
            "title": "Understand Vertically and Crosswise",
            "numbers": [a, b],
            "difficulty": difficulty,
        }
    ]

    for column in calculation["columns"]:
        animation_events = build_urdhva_animation_events(column)
        steps.append({ 
            "id": len(steps) + 1,
            "type": "multiplication_column",
            "title": f"Calculate column {column['column']}",
            "products": column["products"],
            "subtotal": column["subtotal"],
            "incoming_carry": column["incoming_carry"],
            "total": column["total"],
            "write_digit": column["write_digit"],
            "outgoing_carry": column["outgoing_carry"],
            "animation_events": animation_events,
        })

    steps.append({
        "id": len(steps) + 1,
        "type": "combine",
        "title": "Combine the digits",
        "result": calculation["result"],
    })

    return steps

def build_urdhva_animation_events(column: dict) -> list:
    """
    Build ordered animation events for one multiplication column.
    """
    events = []

    for product in column["products"]:
        events.append({
            "action": "highlight_and_connect",
            "position_a": product["position_a"],
            "position_b": product["position_b"],
            "digit_a": product["digit_a"],
            "digit_b": product["digit_b"],
            "product": product["product"],
        })

    events.append({
        "action": "show_subtotal",
        "value": column["subtotal"],
    })

    if column["incoming_carry"] > 0:
        events.append({
            "action": "add_carry",
            "value": column["incoming_carry"],
            "total": column["total"],
        })

    events.append({
        "action": "write_digit",
        "digit": column["write_digit"],
        "column": column["column"],
    })

    if column["outgoing_carry"] > 0:
        events.append({
            "action": "move_carry",
            "value": column["outgoing_carry"],
        })

    return events
