"""VedicMath AI FastAPI backend — five Vedic mathematics methods.

Compatible with Python 3.9+.
"""

from typing import Optional

from fastapi import FastAPI, HTTPException, Query

from backend.vendor.vedicpy.multiply import multiply_base_near_powerof10
from backend.nikhilam import (
    build_nikhilam_steps,
    build_nikhilam_animation_events,
)
from backend.urdhva import calculate_urdhva, build_urdhva_steps
from backend.ekadhikena import calculate_ekadhikena
from backend.yavadunam import calculate_yavadunam
from backend.ekanyunena import calculate_ekanyunena


app = FastAPI(
    title="VedicMath AI",
    description="Interactive Vedic Mathematics Learning API",
    version="0.4.0",
)


@app.get("/")
def home():
    return {"message": "Welcome to VedicMath AI", "status": "running"}


# ---------- Shared helpers ----------

NIKHILAM_LEVELS = {
    "beginner": (100, 90, 109),
    "intermediate": (1000, 990, 1009),
    "advanced": (10000, 9990, 10009),
}


def get_nikhilam_settings(a: int, b: int, difficulty: str):
    difficulty = difficulty.lower().strip()
    if difficulty not in NIKHILAM_LEVELS:
        raise HTTPException(
            status_code=400,
            detail="Difficulty must be beginner, intermediate, or advanced.",
        )
    base, minimum, maximum = NIKHILAM_LEVELS[difficulty]
    if not (minimum <= a <= maximum and minimum <= b <= maximum):
        raise HTTPException(
            status_code=400,
            detail=f"{difficulty} requires numbers between {minimum} and {maximum}.",
        )
    return difficulty, base


def get_urdhva_calculation(a: int, b: int, difficulty: str):
    difficulty = difficulty.lower().strip()
    try:
        steps = build_urdhva_steps(a, b, difficulty)
        calculation = calculate_urdhva(a, b)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    if calculation["result"] != a * b:
        raise HTTPException(status_code=500, detail="Calculation verification failed.")
    return difficulty, steps, calculation


def build_urdhva_animation(a: int, b: int, steps: list):
    animation_steps = []
    for step in steps:
        if step["type"] == "introduction":
            events = [
                {"action": "show_numbers", "number1": a, "number2": b},
                {
                    "action": "show_instruction",
                    "text": "Multiply vertically and crosswise, moving from right to left.",
                },
            ]
        elif step["type"] == "combine":
            events = [{"action": "reveal_result", "value": step["result"]}]
        else:
            events = step.get("animation_events", [])
        animation_steps.append(
            {
                "step_id": step["id"],
                "title": step["title"],
                "type": step["type"],
                "events": events,
            }
        )
    return animation_steps


def get_ekadhikena_calculation(number: int, difficulty: str):
    try:
        calculation = calculate_ekadhikena(number, difficulty)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    if calculation["result"] != number * number:
        raise HTTPException(status_code=500, detail="Calculation verification failed.")
    return calculation


def get_yavadunam_calculation(number: int, difficulty: str):
    try:
        calculation = calculate_yavadunam(number, difficulty)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    if calculation["result"] != number * number:
        raise HTTPException(status_code=500, detail="Calculation verification failed.")
    return calculation


def get_ekanyunena_calculation(number: int, difficulty: str):
    try:
        calculation = calculate_ekanyunena(number, difficulty)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    if calculation["result"] != number * calculation["number2"]:
        raise HTTPException(status_code=500, detail="Calculation verification failed.")
    return calculation


# ---------- Nikhilam ----------

@app.get("/multiply/nikhilam")
def nikhilam_multiply(a: int, b: int, difficulty: str = "beginner"):
    difficulty, base = get_nikhilam_settings(a, b, difficulty)
    result = multiply_base_near_powerof10(a, b)
    if result != a * b:
        raise HTTPException(status_code=500, detail="Calculation verification failed.")
    return {
        "method": "Nikhilam",
        "number1": a,
        "number2": b,
        "base": base,
        "steps": build_nikhilam_steps(a, b, base),
        "difficulty": difficulty,
        "result": result,
    }


@app.get("/animate/nikhilam")
def animate_nikhilam(a: int, b: int, difficulty: str = "beginner"):
    difficulty, base = get_nikhilam_settings(a, b, difficulty)
    steps = build_nikhilam_steps(a, b, base)
    animation_steps = build_nikhilam_animation_events(steps)
    result = steps[-1]["result"]
    if result != a * b:
        raise HTTPException(status_code=500, detail="Calculation verification failed.")
    return {
        "sutra": "Nikhilam Navatashcaramam Dashatah",
        "numbers": [a, b],
        "difficulty": difficulty,
        "base": base,
        "animation_steps": animation_steps,
        "result": result,
    }


# ---------- Urdhva Tiryagbhyam ----------

@app.get("/multiply/urdhva")
def urdhva_multiply(a: int, b: int, difficulty: str = "beginner"):
    difficulty, steps, calculation = get_urdhva_calculation(a, b, difficulty)
    return {
        "method": "Urdhva Tiryagbhyam",
        "number1": a,
        "number2": b,
        "difficulty": difficulty,
        "steps": steps,
        "result": calculation["result"],
    }


@app.get("/animate/urdhva")
def animate_urdhva(a: int, b: int, difficulty: str = "beginner"):
    difficulty, steps, calculation = get_urdhva_calculation(a, b, difficulty)
    return {
        "sutra": "Urdhva Tiryagbhyam",
        "numbers": [a, b],
        "difficulty": difficulty,
        "animation_steps": build_urdhva_animation(a, b, steps),
        "result": calculation["result"],
    }


# ---------- Ekadhikena Purvena ----------

@app.get("/multiply/ekadhikena")
def ekadhikena_multiply(number: int, difficulty: str = "beginner"):
    calculation = get_ekadhikena_calculation(number, difficulty)
    return {
        "method": calculation["method"],
        "number": number,
        "difficulty": calculation["difficulty"],
        "steps": calculation["teaching_steps"],
        "result": calculation["result"],
    }


@app.get("/animate/ekadhikena")
def animate_ekadhikena(number: int, difficulty: str = "beginner"):
    calculation = get_ekadhikena_calculation(number, difficulty)
    return {
        "sutra": calculation["method"],
        "number": number,
        "difficulty": calculation["difficulty"],
        "animation_steps": calculation["animation_steps"],
        "result": calculation["result"],
    }


# ---------- Yavadunam ----------

@app.get("/multiply/yavadunam")
def yavadunam_multiply(number: int, difficulty: str = "beginner"):
    calculation = get_yavadunam_calculation(number, difficulty)
    return {
        "method": calculation["method"],
        "number": number,
        "difficulty": calculation["difficulty"],
        "base": calculation["base"],
        "steps": calculation["teaching_steps"],
        "result": calculation["result"],
    }


@app.get("/animate/yavadunam")
def animate_yavadunam(number: int, difficulty: str = "beginner"):
    calculation = get_yavadunam_calculation(number, difficulty)
    return {
        "sutra": calculation["method"],
        "number": number,
        "difficulty": calculation["difficulty"],
        "base": calculation["base"],
        "animation_steps": calculation["animation_steps"],
        "result": calculation["result"],
    }


# ---------- Ekanyunena Purvena ----------

@app.get("/multiply/ekanyunena")
def ekanyunena_multiply(
    number: int,
    difficulty: str = "beginner",
    multiplier: Optional[int] = Query(
        None,
        description=(
            "Optional multiplier. Leave blank for automatic selection. "
            "Beginner = 99, Intermediate = 999, Advanced = 9999."
        ),
    ),
):
    difficulty = difficulty.lower().strip()

    multipliers = {
        "beginner": 99,
        "intermediate": 999,
        "advanced": 9999,
    }

    if difficulty not in multipliers:
        raise HTTPException(
            status_code=400,
            detail="Invalid difficulty level."
        )

    expected_multiplier = multipliers[difficulty]

    if multiplier is not None and multiplier != expected_multiplier:
        raise HTTPException(
            status_code=400,
            detail=(
                f"For {difficulty}, the multiplier must be "
                f"{expected_multiplier}."
            ),
        )

    calculation = get_ekanyunena_calculation(number, difficulty)

    return {
        "method": calculation["method"],
        "number1": number,
        "number2": expected_multiplier,
        "difficulty": difficulty,
        "steps": calculation["teaching_steps"],
        "result": calculation["result"],
    }


@app.get("/animate/ekanyunena")
def animate_ekanyunena(number: int, difficulty: str = "beginner"):
    calculation = get_ekanyunena_calculation(number, difficulty)
    return {
        "sutra": calculation["method"],
        "numbers": [calculation["number1"], calculation["number2"]],
        "difficulty": calculation["difficulty"],
        "base": calculation["base"],
        "animation_steps": calculation["animation_steps"],
        "result": calculation["result"],
    }


# ---------- Unified lessons: all five sutras ----------

@app.get("/sutras/{sutra_name}/lesson")
def get_sutra_lesson(
    sutra_name: str,
    a: Optional[int] = None,
    b: Optional[int] = None,
    difficulty: str = "beginner",
    number: Optional[int] = None,
):
    sutra_name = sutra_name.lower().strip()
    difficulty = difficulty.lower().strip()

    if sutra_name in ("ekadhikena", "yavadunam", "ekanyunena"):
        if number is None:
            raise HTTPException(status_code=400, detail="Provide the number parameter.")

        if sutra_name == "ekadhikena":
            calculation = get_ekadhikena_calculation(number, difficulty)
            numbers = [number, number]
        elif sutra_name == "yavadunam":
            calculation = get_yavadunam_calculation(number, difficulty)
            numbers = [number, number]
        else:
            calculation = get_ekanyunena_calculation(number, difficulty)
            numbers = [calculation["number1"], calculation["number2"]]

        return {
            "sutra": calculation["method"],
            "numbers": numbers,
            "difficulty": calculation["difficulty"],
            "teaching_steps": calculation["teaching_steps"],
            "animation_steps": calculation["animation_steps"],
            "result": calculation["result"],
        }

    if sutra_name not in ("nikhilam", "urdhva"):
        raise HTTPException(status_code=404, detail="Sutra not found.")

    if a is None or b is None:
        raise HTTPException(
            status_code=400,
            detail="Provide both a and b for this sutra.",
        )

    if sutra_name == "nikhilam":
        difficulty, base = get_nikhilam_settings(a, b, difficulty)
        steps = build_nikhilam_steps(a, b, base)
        animation_steps = build_nikhilam_animation_events(steps)
        result = steps[-1]["result"]
    else:
        difficulty, steps, calculation = get_urdhva_calculation(a, b, difficulty)
        animation_steps = build_urdhva_animation(a, b, steps)
        result = calculation["result"]

    if result != a * b:
        raise HTTPException(status_code=500, detail="Calculation verification failed.")

    return {
        "sutra": sutra_name,
        "numbers": [a, b],
        "difficulty": difficulty,
        "teaching_steps": steps,
        "animation_steps": animation_steps,
        "result": result,
    }
