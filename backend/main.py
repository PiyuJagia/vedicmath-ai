
from fastapi import FastAPI

app = FastAPI(
    title="VedicMath AI",
    description="Interactive Vedic Mathematics Learning API",
    version="0.2.0"
)

@app.get("/")
def home():
    return {
        "message": "Welcome to VedicMath AI",
        "status": "running"
    }



from fastapi import HTTPException
from backend.vendor.vedicpy.multiply import multiply_base_near_powerof10


from backend.nikhilam import build_nikhilam_steps
from backend.urdhva import calculate_urdhva, build_urdhva_steps
from backend.nikhilam import build_nikhilam_animation_events



@app.get("/multiply/nikhilam")

def nikhilam_multiply(
    a: int,
    b: int,
    difficulty: str = "beginner"
):

    
    
    levels = {
        "beginner": {
            "base": 100,
            "minimum": 90,
            "maximum": 109
        },
        "intermediate": {
            "base": 1000,
            "minimum": 990,
            "maximum": 1009
        },
        "advanced": {
            "base": 10000,
            "minimum": 9990,
            "maximum": 10009
        },
    }


    difficulty = difficulty.lower()

    if difficulty not in levels:
        raise HTTPException(
            status_code=400,
            detail="Difficulty must be beginner, intermediate, or advanced."
        )

    settings = levels[difficulty]
    base = settings["base"]

    if not (
        settings["minimum"] <= a <= settings["maximum"]
        and settings["minimum"] <= b <= settings["maximum"]
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Numbers must be between {settings['minimum']} "
                   f"and {settings['maximum']} for {difficulty}."
        )

        

    
    deviation_a = a - base
    deviation_b = b - base

    left = a + deviation_b
    right = deviation_a * deviation_b

    result = multiply_base_near_powerof10(a, b)

    if result != a * b:
        raise HTTPException(
            status_code=500,
            detail="Calculation verification failed."
        )


    return {
        "method": "Nikhilam",
        "number1": a,
        "number2": b,
        "base": base,
        "steps": build_nikhilam_steps(a, b, base),
        "difficulty": difficulty,
        "result": result
    }


@app.get("/multiply/urdhva")
def urdhva_multiply(
    a: int,
    b: int,
    difficulty: str = "beginner"
):
    try:
        steps = build_urdhva_steps(a, b, difficulty)
        calculation = calculate_urdhva(a, b)

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    result = calculation["result"]

    if result != a * b:
        raise HTTPException(
            status_code=500,
            detail="Calculation verification failed."
        )

    return {
        "method": "Urdhva Tiryagbhyam",
        "number1": a,
        "number2": b,
        "difficulty": difficulty.lower(),
        "steps": steps,
        "result": result
    }

@app.get("/animate/urdhva")
def animate_urdhva(
    a: int,
    b: int,
    difficulty: str = "beginner"
):
    try:
        steps = build_urdhva_steps(a, b, difficulty)
        calculation = calculate_urdhva(a, b)

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    if calculation["result"] != a * b:
        raise HTTPException(
            status_code=500,
            detail="Calculation verification failed."
        )

    
    animation_steps = []

    for step in steps:
        if step["type"] == "introduction":
            events = [
                {
                    "action": "show_numbers",
                    "number1": a,
                    "number2": b,
                },
                {
                    "action": "show_instruction",
                    "text": "Multiply vertically and crosswise, moving from right to left.",
                },
            ]

        elif step["type"] == "combine":
            events = [
                {
                    "action": "reveal_result",
                    "value": calculation["result"],
                }
            ]

        else:
            events = step.get("animation_events", [])

        animation_steps.append({
            "step_id": step["id"],
            "title": step["title"],
            "type": step["type"],
            "events": events,
        })


    return {
        "sutra": "Urdhva Tiryagbhyam",
        "numbers": [a, b],
        "difficulty": difficulty.lower(),
        "animation_steps": animation_steps,
        "result": calculation["result"],
    }

@app.get("/animate/nikhilam")
def animate_nikhilam(
    a: int,
    b: int,
    difficulty: str = "beginner"
):
    levels = {
        "beginner": (100, 90, 109),
        "intermediate": (1000, 990, 1009),
        "advanced": (10000, 9990, 10009),
    }

    difficulty = difficulty.lower()

    if difficulty not in levels:
        raise HTTPException(
            status_code=400,
            detail="Invalid difficulty level."
        )

    base, minimum, maximum = levels[difficulty]

    if not (minimum <= a <= maximum and minimum <= b <= maximum):
        raise HTTPException(
            status_code=400,
            detail=f"{difficulty} requires numbers between {minimum} and {maximum}."
        )

    steps = build_nikhilam_steps(a, b, base)
    animation_steps = build_nikhilam_animation_events(steps)
    result = steps[-1]["result"]

    if result != a * b:
        raise HTTPException(
            status_code=500,
            detail="Calculation verification failed."
        )

    return {
        "sutra": "Nikhilam Navatashcaramam Dashatah",
        "numbers": [a, b],
        "difficulty": difficulty,
        "base": base,
        "animation_steps": animation_steps,
        "result": result,
    }

@app.get("/sutras/{sutra_name}/lesson")
def get_sutra_lesson(
    sutra_name: str,
    a: int,
    b: int,
    difficulty: str = "beginner"
):
    sutra_name = sutra_name.lower()
    difficulty = difficulty.lower()

    if sutra_name == "nikhilam":
        levels = {
            "beginner": (100, 90, 109),
            "intermediate": (1000, 990, 1009),
            "advanced": (10000, 9990, 10009),
        }

        if difficulty not in levels:
            raise HTTPException(400, "Invalid difficulty level.")

        base, minimum, maximum = levels[difficulty]

        if not (minimum <= a <= maximum and minimum <= b <= maximum):
            raise HTTPException(
                400,
                f"{difficulty} requires numbers between {minimum} and {maximum}."
            )

        steps = build_nikhilam_steps(a, b, base)
        animation_steps = build_nikhilam_animation_events(steps)

    elif sutra_name == "urdhva":
        try:
            steps = build_urdhva_steps(a, b, difficulty)
        except ValueError as error:
            raise HTTPException(400, str(error))

   
        animation_steps = []

        for step in steps:
            if step["type"] == "introduction":
                events = [
                    {
                        "action": "show_numbers",
                        "number1": a,
                        "number2": b,
                    },
                    {
                        "action": "show_instruction",
                        "text": "Multiply vertically and crosswise, moving from right to left.",
                    },
                ]

            elif step["type"] == "combine":
                events = [
                    {
                        "action": "reveal_result",
                        "value": step["result"],
                    }
                ]

            else:
                events = step.get("animation_events", [])

            animation_steps.append({
                "step_id": step["id"],
                "title": step["title"],
                "type": step["type"],
                "events": events,
            })
  

    else:
        raise HTTPException(404, "Sutra not found.")

    result = steps[-1]["result"]

    if result != a * b:
        raise HTTPException(500, "Calculation verification failed.")

    return {
        "sutra": sutra_name,
        "numbers": [a, b],
        "difficulty": difficulty,
        "teaching_steps": steps,
        "animation_steps": animation_steps,
        "result": result,
    }
