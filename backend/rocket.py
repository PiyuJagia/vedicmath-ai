"""Number Rocket: the deterministic game layer.

Everything the game shows as maths comes from here and from the Sutra
engines: which numbers a launch uses, the prompt for each stage, Rabbit's
hints, feedback on a wrong answer and the worked values the coach talks
about after a win. Nothing here guesses or uses a language model.

Skill rungs (beginner level only for now):

    N1  Earth orbit     both numbers below 100
    N2  Space station   small deviations, the right part needs a zero
    N3  Moon            both numbers above 100
    N4  Mars            one above and one below 100 (borrow)
    E1  Booster I       squares ending in 5, tens digit 1 to 6
    E2  Booster II      squares ending in 5, tens digit 7 to 9

A mission is six launches drawn from the learner's current rungs plus one
review launch. Missions are reproducible from their seed.
"""

import random
import re
from typing import Any, Dict, List, Optional, Tuple

from backend.ekadhikena import calculate_ekadhikena
from backend.nikhilam import build_nikhilam_steps
from backend.practice import (
    DIGITS,
    INTEGER,
    _question,
    check_answer,
    ekadhikena_questions,
    nikhilam_questions,
)


BASE = 100
LEVEL = "beginner"
MISSION_LENGTH = 6
HINTS_PER_STAGE = 3

ENGINES = {"nikhilam": "pad", "ekadhikena": "booster"}

RUNGS: List[Dict[str, Any]] = [
    {"id": "N1", "sutra": "nikhilam", "name": "Earth orbit", "skill": "Both numbers below 100", "example": "97 × 96"},
    {"id": "N2", "sutra": "nikhilam", "name": "Space station", "skill": "Small deviations, a zero in the right part", "example": "97 × 99"},
    {"id": "N3", "sutra": "nikhilam", "name": "Moon", "skill": "Both numbers above 100", "example": "103 × 104"},
    {"id": "N4", "sutra": "nikhilam", "name": "Mars", "skill": "One above and one below 100 (borrow)", "example": "98 × 103"},
    {"id": "E1", "sutra": "ekadhikena", "name": "Booster I", "skill": "Squares ending in 5, tens digit 1 to 6", "example": "35²"},
    {"id": "E2", "sutra": "ekadhikena", "name": "Booster II", "skill": "Squares ending in 5, tens digit 7 to 9", "example": "85²"},
]
RUNG_IDS = [rung["id"] for rung in RUNGS]


class RocketError(ValueError):
    """A request the game cannot serve. The message is safe to show learners."""


# ---------- Problems for each rung ----------


def _nikhilam_pairs(rung_id: str) -> List[Tuple[int, int]]:
    below = range(90, 100)
    above = range(101, 110)
    pairs: List[Tuple[int, int]] = []
    if rung_id == "N1":
        pairs = [(a, b) for a in below for b in below if 10 <= (BASE - a) * (BASE - b) < 100]
    elif rung_id == "N2":
        pairs = [(a, b) for a in below for b in below if (BASE - a) * (BASE - b) < 10]
    elif rung_id == "N3":
        pairs = [(a, b) for a in above for b in above if (BASE - a) * (BASE - b) >= 10]
    elif rung_id == "N4":
        pairs = [(a, b) for a in below for b in above] + [(a, b) for a in above for b in below]
    return pairs


def _ekadhikena_numbers(rung_id: str) -> List[int]:
    if rung_id == "E1":
        return [tens * 10 + 5 for tens in range(1, 7)]
    if rung_id == "E2":
        return [tens * 10 + 5 for tens in range(7, 10)]
    return []


def rung_problems(rung_id: str) -> List[Dict[str, Any]]:
    """Every problem a rung can produce, in a fixed order."""
    rung = rung_info(rung_id)
    if rung["sutra"] == "nikhilam":
        return [{"sutra": "nikhilam", "a": a, "b": b} for a, b in _nikhilam_pairs(rung_id)]
    return [{"sutra": "ekadhikena", "number": n} for n in _ekadhikena_numbers(rung_id)]


def rung_info(rung_id: str) -> Dict[str, Any]:
    for rung in RUNGS:
        if rung["id"] == rung_id:
            return rung
    raise RocketError(f"Unknown rung '{rung_id}'.")


def rung_of(problem: Dict[str, Any]) -> str:
    """The rung a problem belongs to (problems outside every rung are rejected)."""
    for rung in RUNGS:
        if rung["sutra"] != problem["sutra"]:
            continue
        if problem["sutra"] == "nikhilam":
            if (problem["a"], problem["b"]) in _nikhilam_pairs(rung["id"]):
                return rung["id"]
        elif problem["number"] in _ekadhikena_numbers(rung["id"]):
            return rung["id"]
    raise RocketError("That launch is not part of Number Rocket yet.")


def problem_label(problem: Dict[str, Any]) -> str:
    if problem["sutra"] == "nikhilam":
        return f"{problem['a']} × {problem['b']}"
    return f"{problem['number']}²"


def _key(problem: Dict[str, Any]) -> str:
    """Two launches with the same numbers in either order count as the same launch."""
    if problem["sutra"] == "nikhilam":
        return "x".join(str(n) for n in sorted((problem["a"], problem["b"])))
    return str(problem["number"])


def build_mission(
    seed: int,
    nikhilam_rung: Optional[str] = None,
    ekadhikena_rung: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Six launches for the learner's current rungs, with one review launch.

    With both Sutras: four Nikhilam launches, one Ekadhikena launch and one
    review from the rung before the current one. With one Sutra, all six come
    from it. The same seed always gives the same mission.
    """
    current = [r for r in (nikhilam_rung, ekadhikena_rung) if r]
    if not current:
        raise RocketError("Open at least one Sutra to fly a mission.")
    for rung_id in current:
        rung_info(rung_id)
    if nikhilam_rung and rung_info(nikhilam_rung)["sutra"] != "nikhilam":
        raise RocketError("The Nikhilam rung must be one of N1 to N4.")
    if ekadhikena_rung and rung_info(ekadhikena_rung)["sutra"] != "ekadhikena":
        raise RocketError("The Ekadhikena rung must be E1 or E2.")

    main = nikhilam_rung or ekadhikena_rung
    review = _previous_rung(main) or main
    if nikhilam_rung and ekadhikena_rung:
        plan = [nikhilam_rung, nikhilam_rung, ekadhikena_rung, nikhilam_rung, review, nikhilam_rung]
    else:
        plan = [main, main, main, main, review, main]
    review_slot = 4 if review != main else -1

    rng = random.Random(seed)
    used = set()
    launches = []
    for slot, rung_id in enumerate(plan):
        # A small rung (E2 has three numbers) borrows fresh launches from the
        # rungs before it rather than repeating one.
        planned = rung_id
        problem = None
        for source in [planned] + _earlier_rungs(planned):
            options = [p for p in rung_problems(source) if _key(p) not in used]
            if options:
                problem = options[rng.randrange(len(options))]
                rung_id = source
                break
        if problem is None:
            options = rung_problems(planned)
            problem = options[rng.randrange(len(options))]
        used.add(_key(problem))
        launches.append(
            {
                **problem,
                "rung": rung_id,
                "review": slot == review_slot or rung_id != planned,
                "engine": ENGINES[problem["sutra"]],
                "label": problem_label(problem),
            }
        )
    return launches


def _earlier_rungs(rung_id: str) -> List[str]:
    """Rungs of the same Sutra before this one, nearest first."""
    sutra = rung_info(rung_id)["sutra"]
    same = [r["id"] for r in RUNGS if r["sutra"] == sutra]
    return list(reversed(same[: same.index(rung_id)]))


def _previous_rung(rung_id: str) -> Optional[str]:
    earlier = _earlier_rungs(rung_id)
    return earlier[0] if earlier else None


# ---------- Stages, prompts and hints ----------


def _side(number: int) -> str:
    return "below" if number < BASE else "above"


def _nikhilam_context(a: int, b: int) -> Dict[str, Any]:
    steps = {step["type"]: step for step in build_nikhilam_steps(a, b, BASE)}
    da, db = steps["deviations"]["deviations"]
    combine = steps["combine"]
    adjust = steps.get("adjust")
    return {
        "a": a,
        "b": b,
        "base": BASE,
        "deviations": [da, db],
        "cross": steps["cross_subtract"]["left_part"],
        "product": steps["multiply_deviations"]["right_part"],
        "adjustment": adjust["adjustment"] if adjust else "none",
        "left_part": combine["left_part"],
        "right_part": combine["right_part"],
        "formatted_right": combine["formatted_right"],
        "result": combine["result"],
        "questions": nikhilam_questions(list(steps.values())),
    }


def _num(value: int) -> str:
    """A number as children see it, with a real minus sign."""
    return f"\u2212{-value}" if value < 0 else str(value)


def _signed(value: int) -> str:
    return f"({_num(value)})" if value < 0 else str(value)


def _nikhilam_stage(key: str, c: Dict[str, Any]) -> Tuple[str, List[str]]:
    a, b, base = c["a"], c["b"], c["base"]
    da, db = c["deviations"]
    cross, product = c["cross"], c["product"]
    if key in ("deviation_a", "deviation_b"):
        n = a if key == "deviation_a" else b
        side = _side(n)
        prompt = (
            f"{n} is {side} the pad. Deviation = pad − number = ?"
            if key == "deviation_a"
            else f"And {n}? Deviation = {base} − {n} = ?"
        )
        sign = (
            "Below the pad means the deviation is above zero."
            if side == "below"
            else "Above the pad means the deviation is below zero. Use the − key."
        )
        return prompt, [f"Is {n} above or below the launch pad at {base}?", sign, f"Work out {base} − {n}."]
    if key == "left_part":
        prompt = f"Cross stage: {a} − {_signed(db)} = ?"
        if db < 0:
            return prompt, [
                "Taking away a number below zero makes the answer bigger.",
                f"{a} − {_signed(db)} is the same as {a} + {-db}.",
                f"Add {-db} to {a}.",
            ]
        return prompt, [
            "Cross stage: start from one number and take away the other one's deviation.",
            f"Start at {a} and count back {db}.",
            f"Work out {a} − {db}.",
        ]
    if key == "right_part":
        prompt = f"Multiply the deviations: {_signed(da)} × {_signed(db)} = ?"
        if da < 0 and db < 0:
            sign = "Below zero × below zero gives above zero."
        elif da < 0 or db < 0:
            sign = "One deviation is below zero, so the answer is below zero. Use the − key."
        else:
            sign = "Both deviations are above zero, so the answer is above zero."
        if 1 in (abs(da), abs(db)):
            last = "Multiplying by one keeps a number the same. Then think about the sign."
        else:
            last = f"Multiply {abs(da)} by {abs(db)}, then think about the sign."
        return prompt, ["Multiply the two deviations together.", sign, last]
    if key == "adjusted_left_part":
        if c["adjustment"] == "borrow":
            return f"The right part is below zero, so borrow 1 hundred. The left part {cross} becomes?", [
                "A right part below zero cannot be written down, so borrow from the left part.",
                "Borrowing takes 1 away from the left part.",
                f"Work out {cross} − 1.",
            ]
        return f"The right part is too big, so carry 1 hundred. The left part {cross} becomes?", [
            "With a pad of 100 the right part can only have two digits.",
            "Carrying adds 1 to the left part.",
            f"Work out {cross} + 1.",
        ]
    if key == "adjusted_right_part":
        if c["adjustment"] == "borrow":
            return f"The borrowed hundred joins the right part: {_num(product)} + 100 = ?", [
                "The 1 you borrowed is worth 100 on the right.",
                "Add 100 to the right part.",
                f"Start at {_num(product)} and count up 100.",
            ]
        return f"The carried hundred leaves the right part: {product} − 100 = ?", [
            "The 1 you carried took 100 away from the right part.",
            "Take 100 away from the right part.",
            f"Start at {product} and count back 100.",
        ]
    if key == "padded_right_part":
        return f"The right part needs two digits. Write {c['right_part']} with two digits.", [
            "With a pad of 100 the right part always fills two places.",
            "Put a zero in front when it has only one digit.",
            f"Type 0 first, then {c['right_part']}.",
        ]
    if key == "result":
        return "Join the parts. Answer?", [
            "Left part first, then the right part.",
            "The right part fills the last two places.",
            f"Write {c['left_part']}, then {c['formatted_right']}.",
        ]
    raise RocketError(f"Unknown stage '{key}'.")


def _ekadhikena_context(number: int) -> Dict[str, Any]:
    calc = calculate_ekadhikena(number, LEVEL)
    questions = ekadhikena_questions(calc)
    # A game-only first stage: cover the 5 and read what is left.
    first = _question("previous_number", questions[0]["step_id"], calc["previous"])
    return {
        "number": number,
        "previous": calc["previous"],
        "next": calc["next_number"],
        "left_part": calc["left_part"],
        "right_part": calc["right_part"],
        "formatted_right": calc["formatted_right"],
        "result": calc["result"],
        "questions": [first] + questions,
    }


def _ekadhikena_stage(key: str, c: Dict[str, Any]) -> Tuple[str, List[str]]:
    n, p, q = c["number"], c["previous"], c["next"]
    if key == "previous_number":
        return f"Cover the last digit of {n}. What is left?", [
            "Hide the last digit with your finger.",
            "Which digit comes before the last one?",
            f"Read {n} without its last digit.",
        ]
    if key == "next_number":
        return f"One more than {p}?", ['Ekadhikena means "by one more".', f"Count up one from {p}.", f"Add 1 to {p}."]
    if key == "left_part":
        return f"{p} × {q} = ?", [
            "Multiply the number you covered by one more than it.",
            f"Multiplying {p} by one more than {p} is the same as {p} × {p} plus one more {p}.",
            f"Work out {p * p} + {p}.",
        ]
    if key == "right_part":
        return "5 × 5 = ?", ["It is the same on every booster launch.", "Five groups of five.", "Count by fives, five times."]
    if key == "result":
        return "Join them. Answer?", [
            "Left part first, then the right part.",
            f"Write {c['left_part']}, then {c['formatted_right']} after it.",
            f"The answer has {len(str(c['result']))} digits.",
        ]
    raise RocketError(f"Unknown stage '{key}'.")


def _context(problem: Dict[str, Any]) -> Dict[str, Any]:
    rung_of(problem)
    if problem["sutra"] == "nikhilam":
        return _nikhilam_context(problem["a"], problem["b"])
    return _ekadhikena_context(problem["number"])


def _stage(problem: Dict[str, Any], key: str, c: Dict[str, Any]) -> Tuple[str, List[str]]:
    if problem["sutra"] == "nikhilam":
        return _nikhilam_stage(key, c)
    return _ekadhikena_stage(key, c)


def launch_stages(problem: Dict[str, Any]) -> List[Dict[str, Any]]:
    """The stages of one launch in teaching order. Answers are never included."""
    c = _context(problem)
    stages = []
    for question in c["questions"]:
        prompt, hints = _stage(problem, question["key"], c)
        stage = {"key": question["key"], "answer_type": question["answer_type"], "prompt": prompt, "hints": hints}
        if question["answer_type"] == DIGITS:
            stage["digits"] = question["digits"]
        stages.append(stage)
    return stages


def solution_facts(problem: Dict[str, Any]) -> Dict[str, Any]:
    """The worked values of a finished launch, for the coach and the flight log."""
    c = _context(problem)
    facts = {k: v for k, v in c.items() if k != "questions"}
    facts["sutra"] = problem["sutra"]
    facts["rung"] = rung_of(problem)
    facts["label"] = problem_label(problem)
    return facts


def _feedback(problem: Dict[str, Any], key: str, c: Dict[str, Any], answer: Optional[int], mistake: Optional[str]) -> str:
    if mistake == "missing_padding":
        return "Right value! Write it with two digits: a zero goes in front."
    if problem["sutra"] == "nikhilam":
        if mistake == "sign" and key in ("deviation_a", "deviation_b"):
            n = c["a"] if key == "deviation_a" else c["b"]
            return f"So close! Check the sign: {n} is {_side(n)} the pad."
        if mistake == "sign":
            return "So close! Check the sign."
    else:
        p = c["previous"]
        if key == "left_part" and answer == p * p:
            return f"That is {p} × {p}. The booster uses one more: {p} × {c['next']}."
        if key == "result" and answer == c["left_part"] * 10 + 5:
            return "The answer ends in 25, not just 5."
        if key == "next_number" and answer == p - 1:
            return "That is one less. Ekadhikena means one more."
    return "Not yet. Try again."


def check_stage(problem: Dict[str, Any], key: str, raw_answer: str) -> Dict[str, Any]:
    """Check one stage. The correct answer is never returned, so the child can try again."""
    c = _context(problem)
    question = next((q for q in c["questions"] if q["key"] == key), None)
    if question is None:
        raise RocketError(f"Unknown stage '{key}' for this launch.")
    result = check_answer(question, str(raw_answer))
    response = {
        "stage": key,
        "status": result["status"],
        "is_correct": result["is_correct"],
        "mistake": result["mistake"],
        "message": result["message"],
        "feedback": None,
        "solution": None,
    }
    if result["status"] == "incorrect":
        answer = None
        if question["answer_type"] == INTEGER:
            text = result["submitted_answer"].strip().replace("−", "-")
            answer = int(text) if re.fullmatch(r"-?\d{1,12}", text) else None
        response["feedback"] = _feedback(problem, key, c, answer, result["mistake"])
    if result["is_correct"] and key == "result":
        response["solution"] = solution_facts(problem)
    return response
