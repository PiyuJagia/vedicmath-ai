"""Contract tests for Nikhilam using the base - number deviation convention.

Run from the repository root:

    python -m pytest backend/tests
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.nikhilam import (
    build_nikhilam_animation_events,
    build_nikhilam_steps,
)


client = TestClient(app)

LEVELS = {
    "beginner": (100, 90, 109),
    "intermediate": (1000, 990, 1009),
    "advanced": (10000, 9990, 10009),
}

OPERAND_IDS = {"number_a", "number_b", "deviation_a", "deviation_b"}

KNOWN_ACTIONS = {
    "show_numbers",
    "show_base",
    "compare_with_base",
    "calculate_deviation",
    "cross_subtract",
    "show_left_part",
    "multiply_deviations",
    "show_right_part",
    "adjust_parts",
    "pad_right_part",
    "join_parts",
    "reveal_result",
}


def lesson(a, b, difficulty="beginner"):
    response = client.get(
        "/sutras/nikhilam/lesson",
        params={"a": a, "b": b, "difficulty": difficulty},
    )
    assert response.status_code == 200, response.text
    return response.json()


def step_of(body, step_type):
    matches = [s for s in body["teaching_steps"] if s["type"] == step_type]
    return matches[0] if matches else None


def events_of(body, action):
    return [
        event
        for step in body["animation_steps"]
        for event in step["events"]
        if event["action"] == action
    ]


# ---------- Reference cases ----------

REFERENCE_CASES = [
    # a, b, difficulty, base, deviations, left, raw right, adjustment, formatted right, result
    (98, 97, "beginner", 100, [2, 3], 95, 6, "none", "06", 9506),
    (103, 104, "beginner", 100, [-3, -4], 107, 12, "none", "12", 10712),
    (98, 103, "beginner", 100, [2, -3], 101, -6, "borrow", "94", 10094),
    (90, 90, "beginner", 100, [10, 10], 80, 100, "carry", "00", 8100),
    (998, 997, "intermediate", 1000, [2, 3], 995, 6, "none", "006", 995006),
    (9998, 9997, "advanced", 10000, [2, 3], 9995, 6, "none", "0006", 99950006),
]


@pytest.mark.parametrize(
    "a, b, difficulty, base, deviations, left, right, adjustment, formatted, result",
    REFERENCE_CASES,
)
def test_reference_cases(
    a, b, difficulty, base, deviations, left, right, adjustment, formatted, result
):
    body = lesson(a, b, difficulty)

    assert step_of(body, "base")["base"] == base
    assert step_of(body, "deviations")["deviations"] == deviations
    assert step_of(body, "deviations")["convention"] == "base - number"

    cross = step_of(body, "cross_subtract")
    assert cross["left_part"] == left
    assert [c["value"] for c in cross["cross_calculations"]] == [left, left]

    assert step_of(body, "multiply_deviations")["right_part"] == right

    combine = step_of(body, "combine")
    assert combine["adjustment"] == adjustment
    assert combine["formatted_right"] == formatted
    assert combine["result"] == result
    assert body["result"] == result


def test_reference_98_x_97_full_sequence():
    body = lesson(98, 97)

    assert [s["type"] for s in body["teaching_steps"]] == [
        "base",
        "deviations",
        "cross_subtract",
        "multiply_deviations",
        "combine",
    ]

    deviations = events_of(body, "calculate_deviation")
    assert [(e["operand"], e["base"], e["number"], e["deviation"]) for e in deviations] == [
        ("number_a", 100, 98, 2),
        ("number_b", 100, 97, 3),
    ]

    cross = events_of(body, "cross_subtract")
    assert [(e["operand"], e["deviation_operand"], e["number"], e["deviation"], e["value"]) for e in cross] == [
        ("number_a", "deviation_b", 98, 3, 95),
        ("number_b", "deviation_a", 97, 2, 95),
    ]

    multiply = events_of(body, "multiply_deviations")[0]
    assert multiply["operands"] == ["deviation_a", "deviation_b"]
    assert multiply["values"] == [2, 3]
    assert multiply["value"] == 6

    pad = events_of(body, "pad_right_part")[0]
    assert (pad["value"], pad["right_digits"], pad["padding_zeros"], pad["formatted"]) == (6, 2, 1, "06")

    assert events_of(body, "join_parts")[0] == {
        "action": "join_parts",
        "left_part": 95,
        "formatted_right": "06",
    }
    assert events_of(body, "reveal_result")[0]["value"] == 9506
    assert events_of(body, "adjust_parts") == []


# ---------- Borrow and carry ----------

def test_borrow_is_its_own_step():
    body = lesson(98, 103)
    adjust = step_of(body, "adjust")

    assert adjust["adjustment"] == "borrow"
    assert adjust["amount"] == 1
    assert (adjust["left_before"], adjust["left_after"]) == (101, 100)
    assert (adjust["right_before"], adjust["right_after"]) == (-6, 94)
    assert adjust["right_change"] == 100

    event = events_of(body, "adjust_parts")[0]
    assert (event["source"], event["destination"]) == ("left_part", "right_part")

    types = [s["type"] for s in body["teaching_steps"]]
    assert types.index("adjust") == types.index("multiply_deviations") + 1
    assert types[-1] == "combine"


def test_carry_is_its_own_step():
    body = lesson(90, 90)
    adjust = step_of(body, "adjust")

    assert adjust["adjustment"] == "carry"
    assert adjust["amount"] == 1
    assert (adjust["left_before"], adjust["left_after"]) == (80, 81)
    assert (adjust["right_before"], adjust["right_after"]) == (100, 0)
    assert adjust["right_change"] == -100

    event = events_of(body, "adjust_parts")[0]
    assert (event["source"], event["destination"]) == ("right_part", "left_part")

    pad = events_of(body, "pad_right_part")[0]
    assert (pad["value"], pad["padding_zeros"], pad["formatted"]) == (0, 1, "00")


def test_no_adjust_step_when_not_needed():
    assert step_of(lesson(103, 104), "adjust") is None
    assert events_of(lesson(103, 104), "pad_right_part") == []


# ---------- Equal operands ----------

def test_equal_operands_use_roles_not_values():
    body = lesson(98, 98)

    deviations = events_of(body, "calculate_deviation")
    assert [e["operand"] for e in deviations] == ["number_a", "number_b"]
    assert [e["target"] for e in deviations] == ["deviation_a", "deviation_b"]

    cross = events_of(body, "cross_subtract")
    assert [(e["operand"], e["deviation_operand"]) for e in cross] == [
        ("number_a", "deviation_b"),
        ("number_b", "deviation_a"),
    ]
    assert [e["value"] for e in cross] == [96, 96]
    assert body["result"] == 9604


# ---------- Every supported pair ----------

@pytest.mark.parametrize("difficulty", LEVELS)
def test_every_supported_pair(difficulty):
    base, low, high = LEVELS[difficulty]
    right_digits = len(str(base)) - 1

    for a in range(low, high + 1):
        for b in range(low, high + 1):
            steps = build_nikhilam_steps(a, b, base)
            by_type = {s["type"]: s for s in steps}

            assert by_type["deviations"]["deviations"] == [base - a, base - b]

            cross = by_type["cross_subtract"]["cross_calculations"]
            assert cross[0]["value"] == a - (base - b)
            assert cross[1]["value"] == b - (base - a)

            assert by_type["multiply_deviations"]["right_part"] == (base - a) * (base - b)

            combine = by_type["combine"]
            assert 0 <= combine["right_part"] < base
            assert len(combine["formatted_right"]) == right_digits
            assert int(combine["formatted_right"]) == combine["right_part"]
            assert combine["left_part"] * base + combine["right_part"] == a * b
            assert combine["result"] == a * b

            assert ("adjust" in by_type) == (combine["adjustment"] != "none")
            assert [s["id"] for s in steps] == list(range(1, len(steps) + 1))
            assert steps[-1]["type"] == "combine"


# ---------- Event contract ----------

@pytest.mark.parametrize("a, b, difficulty", [(98, 97, "beginner"), (98, 103, "beginner"), (90, 90, "beginner"), (9998, 9997, "advanced")])
def test_event_contract(a, b, difficulty):
    body = lesson(a, b, difficulty)

    assert [s["id"] for s in body["teaching_steps"]] == [s["step_id"] for s in body["animation_steps"]]

    for step in body["animation_steps"]:
        assert step["events"], f"step {step['type']} has no events"
        for event in step["events"]:
            assert event["action"] in KNOWN_ACTIONS
            for key in ("operand", "deviation_operand"):
                if key in event:
                    assert event[key] in OPERAND_IDS

    for legacy in ("show_deviation", "draw_cross_arrow", "highlight_deviations", "normalize_parts"):
        assert events_of(body, legacy) == []


def test_animation_endpoint_matches_lesson():
    animate = client.get("/animate/nikhilam", params={"a": 98, "b": 103}).json()
    body = lesson(98, 103)

    assert animate["animation_steps"] == body["animation_steps"]
    assert animate["animation_steps"] == build_nikhilam_animation_events(body["teaching_steps"])
    assert animate["result"] == 10094


def test_multiply_endpoint_uses_new_steps():
    body = client.get("/multiply/nikhilam", params={"a": 98, "b": 97}).json()

    assert body["result"] == 9506
    assert body["steps"][1]["deviations"] == [2, 3]


# ---------- Validation is unchanged ----------

@pytest.mark.parametrize(
    "params, detail",
    [
        ({"a": 50, "b": 97}, "beginner requires numbers between 90 and 109."),
        ({"a": 98, "b": 97, "difficulty": "expert"}, "Difficulty must be beginner, intermediate, or advanced."),
        ({"a": 998, "b": 97, "difficulty": "intermediate"}, "intermediate requires numbers between 990 and 1009."),
    ],
)
def test_validation_messages(params, detail):
    response = client.get("/sutras/nikhilam/lesson", params=params)
    assert response.status_code == 400
    assert response.json()["detail"] == detail


def test_unsupported_base_is_rejected():
    with pytest.raises(ValueError):
        build_nikhilam_steps(98, 97, 10)
