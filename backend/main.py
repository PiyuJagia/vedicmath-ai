
from fastapi import FastAPI

app = FastAPI(
    title="VedicMath AI",
    description="Interactive Vedic Mathematics Learning API",
    version="0.1.0"
)

@app.get("/")
def home():
    return {
        "message": "Welcome to VedicMath AI",
        "status": "running"
    }


from pathlib import Path
import sys
from fastapi import HTTPException

# Locate the existing vedicpy library
LIBRARY_PATH = Path(__file__).resolve().parent.parent / "external" / "vedicpy"
sys.path.insert(0, str(LIBRARY_PATH))

from vedicpy.multiply import multiply_base_near_powerof10

from backend.nikhilam import build_nikhilam_steps



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

