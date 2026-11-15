"""VedicMath AI FastAPI backend — five Vedic mathematics methods.

Compatible with Python 3.9+.
"""

import os
from typing import Dict, Optional, Union

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.vendor.vedicpy.multiply import multiply_base_near_powerof10
from backend import rocket
from backend.nikhilam import (
    build_nikhilam_steps,
    build_nikhilam_animation_events,
)
from backend.urdhva import calculate_urdhva, build_urdhva_steps
from backend.ekadhikena import calculate_ekadhikena
from backend.yavadunam import calculate_yavadunam
from backend.ekanyunena import calculate_ekanyunena
from backend.practice import (
    check_answer,
    ekadhikena_questions,
    ekanyunena_questions,
    find_question,
    nikhilam_questions,
    public_questions,
    urdhva_questions,
    yavadunam_questions,
)


app = FastAPI(
    title="VedicMath AI",
    description="Interactive Vedic Mathematics Learning API",
    version="0.5.0",
)

# Browser origins allowed to call the API, comma-separated.
# On Render, set ALLOWED_ORIGINS to the frontend static site's URL.
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
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
        "schema_version": "1.0",
        "sutra": "Nikhilam Navatashcaramam Dashatah",
        "numbers": [a, b],
        "difficulty": difficulty,
        "base": base,
        "operands": {
            "number1": {
                "value": a,
                "role": "multiplicand"
            },
            "number2": {
                "value": b,
                "role": "multiplier"
            },
            "operation": "multiply"
        },
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
def animate_ekadhikena(
    number: int,
    difficulty: str = "beginner",
):
    calculation = get_ekadhikena_calculation(number, difficulty)

    return {
        "schema_version": calculation.get("schema_version", "1.0"),
        "sutra": calculation["method"],
        "number": number,
        "numbers": [number, number],
        "difficulty": calculation["difficulty"],
        "operands": calculation.get("operands", {
            "number": number,
            "operation": "square"
        }),
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
            operation = "square"
        elif sutra_name == "yavadunam":
            calculation = get_yavadunam_calculation(number, difficulty)
            numbers = [number, number]
            operation = "square"
        else:
            calculation = get_ekanyunena_calculation(number, difficulty)
            numbers = [calculation["number1"], calculation["number2"]]
            operation = "multiply"

        operands = calculation.get("operands", {
            "number": number,
            "operation": operation,
        })
        if sutra_name == "ekanyunena":
            operands = {
                "number1": {"value": numbers[0], "role": "multiplicand"},
                "number2": {"value": numbers[1], "role": "multiplier"},
                "operation": "multiply",
            }

        return {
            "schema_version": calculation.get("schema_version", "1.0"),
            "sutra": calculation["method"],
            "numbers": numbers,
            "difficulty": calculation["difficulty"],
            "operands": operands,
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
        "schema_version": "1.0",
        "sutra": sutra_name,
        "numbers": [a, b],
        "difficulty": difficulty,
        "operands": {
            "number1": {
                "value": a,
                "role": "multiplicand"
            },
            "number2": {
                "value": b,
                "role": "multiplier"
            },
            "operation": "multiply"
        },
        "teaching_steps": steps,
        "animation_steps": animation_steps,
        "result": result,
    }


# ---------- Practice: questions and answer checking ----------
# Every Sutra and difficulty level returns the same response shapes.

PRACTICE_SUTRAS = ("nikhilam", "urdhva", "ekadhikena", "yavadunam", "ekanyunena")


def get_practice_questions(
    sutra_name: str,
    a: Optional[int],
    b: Optional[int],
    number: Optional[int],
    difficulty: str,
):
    sutra_name = sutra_name.lower().strip()

    if sutra_name not in PRACTICE_SUTRAS:
        raise HTTPException(
            status_code=404,
            detail="Practice checking is not available for this sutra yet.",
        )

    if sutra_name in ("ekadhikena", "yavadunam", "ekanyunena"):
        if number is None:
            raise HTTPException(status_code=400, detail="Provide the number parameter.")
        if sutra_name == "ekadhikena":
            calculation = get_ekadhikena_calculation(number, difficulty)
            return sutra_name, [number, number], calculation["difficulty"], ekadhikena_questions(calculation)
        if sutra_name == "yavadunam":
            calculation = get_yavadunam_calculation(number, difficulty)
            return sutra_name, [number, number], calculation["difficulty"], yavadunam_questions(calculation)
        calculation = get_ekanyunena_calculation(number, difficulty)
        numbers = [calculation["number1"], calculation["number2"]]
        return sutra_name, numbers, calculation["difficulty"], ekanyunena_questions(calculation)

    if a is None or b is None:
        raise HTTPException(status_code=400, detail="Provide both a and b for this sutra.")

    if sutra_name == "nikhilam":
        difficulty, base = get_nikhilam_settings(a, b, difficulty)
        questions = nikhilam_questions(build_nikhilam_steps(a, b, base))
    else:
        difficulty, steps, _ = get_urdhva_calculation(a, b, difficulty)
        questions = urdhva_questions(steps)

    return sutra_name, [a, b], difficulty, questions


@app.get("/sutras/{sutra_name}/questions")
def get_sutra_questions(
    sutra_name: str,
    a: Optional[int] = None,
    b: Optional[int] = None,
    difficulty: str = "beginner",
    number: Optional[int] = None,
):
    sutra_name, numbers, difficulty, questions = get_practice_questions(
        sutra_name, a, b, number, difficulty
    )
    return {
        "sutra": sutra_name,
        "numbers": numbers,
        "difficulty": difficulty,
        "questions": public_questions(questions),
    }


class AnswerCheck(BaseModel):
    question: str
    # Typed answers arrive as text; selected answers may arrive as numbers.
    answer: Union[str, int]
    difficulty: str = "beginner"
    a: Optional[int] = None
    b: Optional[int] = None
    number: Optional[int] = None


class AnswerSheet(BaseModel):
    answers: Dict[str, Union[str, int]]
    difficulty: str = "beginner"
    a: Optional[int] = None
    b: Optional[int] = None
    number: Optional[int] = None


def find_or_reject(questions, key: str):
    question = find_question(questions, key)
    if question is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown question '{key}' for this problem.",
        )
    return question


@app.post("/sutras/{sutra_name}/check")
def check_sutra_answer(sutra_name: str, body: AnswerCheck):
    sutra_name, numbers, difficulty, questions = get_practice_questions(
        sutra_name, body.a, body.b, body.number, body.difficulty
    )
    question = find_or_reject(questions, body.question)

    return {
        "sutra": sutra_name,
        "numbers": numbers,
        "difficulty": difficulty,
        **check_answer(question, str(body.answer)),
    }


@app.post("/sutras/{sutra_name}/check-all")
def check_sutra_answers(sutra_name: str, body: AnswerSheet):
    sutra_name, numbers, difficulty, questions = get_practice_questions(
        sutra_name, body.a, body.b, body.number, body.difficulty
    )
    for key in body.answers:
        find_or_reject(questions, key)

    # Results follow the teaching order; unanswered questions are skipped.
    results = [
        {
            "sutra": sutra_name,
            "numbers": numbers,
            "difficulty": difficulty,
            **check_answer(question, str(body.answers[question["key"]])),
        }
        for question in questions
        if question["key"] in body.answers
    ]

    return {
        "sutra": sutra_name,
        "numbers": numbers,
        "difficulty": difficulty,
        "total_questions": len(questions),
        "answered": len(results),
        "correct": sum(1 for result in results if result["is_correct"]),
        "all_correct": len(results) == len(questions) and all(result["is_correct"] for result in results),
        "results": results,
    }


# ---------- Number Rocket (game) ----------
# Every number, prompt, hint and check comes from backend/rocket.py and the
# Sutra engines. The game never fills Practice level rings.


def _rocket_problem(sutra: str, a: Optional[int], b: Optional[int], number: Optional[int]) -> Dict:
    sutra = sutra.lower().strip()
    if sutra == "nikhilam":
        if a is None or b is None:
            raise HTTPException(status_code=400, detail="Provide both a and b for this launch.")
        problem = {"sutra": "nikhilam", "a": a, "b": b}
    elif sutra == "ekadhikena":
        if number is None:
            raise HTTPException(status_code=400, detail="Provide the number for this launch.")
        problem = {"sutra": "ekadhikena", "number": number}
    else:
        raise HTTPException(status_code=404, detail="Number Rocket flies Nikhilam and Ekadhikena launches only.")
    try:
        problem["rung"] = rocket.rung_of(problem)
    except rocket.RocketError as error:
        raise HTTPException(status_code=400, detail=str(error))
    return problem


@app.get("/game/rocket/rungs")
def rocket_rungs():
    return {"level": rocket.LEVEL, "base": rocket.BASE, "rungs": rocket.RUNGS}


@app.get("/game/rocket/mission")
def rocket_mission(
    seed: int = Query(..., ge=0, le=2**31 - 1),
    nikhilam_rung: Optional[str] = None,
    ekadhikena_rung: Optional[str] = None,
):
    try:
        launches = rocket.build_mission(seed, nikhilam_rung, ekadhikena_rung)
    except rocket.RocketError as error:
        raise HTTPException(status_code=400, detail=str(error))
    return {"seed": seed, "level": rocket.LEVEL, "launches": launches}


@app.get("/game/rocket/launch")
def rocket_launch(
    sutra: str,
    a: Optional[int] = None,
    b: Optional[int] = None,
    number: Optional[int] = None,
):
    problem = _rocket_problem(sutra, a, b, number)
    return {
        **problem,
        "level": rocket.LEVEL,
        "base": rocket.BASE if problem["sutra"] == "nikhilam" else None,
        "engine": rocket.ENGINES[problem["sutra"]],
        "label": rocket.problem_label(problem),
        "stages": rocket.launch_stages(problem),
    }


class RocketCheck(BaseModel):
    sutra: str
    stage: str
    answer: Union[str, int]
    a: Optional[int] = None
    b: Optional[int] = None
    number: Optional[int] = None


@app.post("/game/rocket/check")
def rocket_check(body: RocketCheck):
    problem = _rocket_problem(body.sutra, body.a, body.b, body.number)
    try:
        return rocket.check_stage(problem, body.stage, str(body.answer))
    except rocket.RocketError as error:
        raise HTTPException(status_code=400, detail=str(error))


# Coach animation handoff — typed actions separate from chat prose.
# Import after engine helpers exist. Includes /coach/chat for live Rishi.
from backend.agents.vedic_math_coach.handoff.api import router as coach_router  # noqa: E402

app.include_router(coach_router)
