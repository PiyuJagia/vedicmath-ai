"""Unified lessons describe the same calculation as their animation endpoint."""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.ekadhikena import calculate_ekadhikena


client = TestClient(app)


@pytest.mark.parametrize(
    "number,difficulty,multiplier",
    [
        (23, "beginner", 99),
        (1, "beginner", 99),
        (100, "beginner", 99),
        (473, "intermediate", 999),
        (1234, "advanced", 9999),
    ],
)
def test_ekanyunena_lesson_metadata(number, difficulty, multiplier):
    params = {"number": number, "difficulty": difficulty}
    response = client.get("/sutras/ekanyunena/lesson", params=params)
    animation_response = client.get("/animate/ekanyunena", params=params)
    assert response.status_code == animation_response.status_code == 200
    lesson = response.json()
    animation = animation_response.json()

    assert lesson["numbers"] == animation["numbers"] == [number, multiplier]
    assert lesson["operands"] == {
        "number1": {"value": number, "role": "multiplicand"},
        "number2": {"value": multiplier, "role": "multiplier"},
        "operation": "multiply",
    }
    assert lesson["result"] == animation["result"] == number * multiplier
    assert lesson["animation_steps"] == animation["animation_steps"]
    assert lesson["animation_steps"][0] == {
        "action": "show_numbers", "number1": number, "number2": multiplier,
    }
    assert lesson["teaching_steps"][-1]["result"] == lesson["result"]
    assert set(lesson) == {
        "schema_version", "sutra", "numbers", "difficulty", "operands",
        "teaching_steps", "animation_steps", "result",
    }


@pytest.mark.parametrize("sutra,number", [("ekadhikena", 35), ("yavadunam", 98)])
def test_square_lesson_metadata_is_preserved(sutra, number):
    response = client.get(f"/sutras/{sutra}/lesson", params={"number": number})
    assert response.status_code == 200
    lesson = response.json()
    assert lesson["numbers"] == [number, number]
    expected_operands = (
        calculate_ekadhikena(number)["operands"]
        if sutra == "ekadhikena"
        else {"number": number, "operation": "square"}
    )
    assert lesson["operands"] == expected_operands
    assert lesson["result"] == number * number
