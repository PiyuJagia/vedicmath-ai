"""Check intermediate mathematical claims against engine teaching steps."""

from __future__ import annotations

import re
from typing import Any


def extract_claimed_equations(text: str) -> list[str]:
    """Pull simple arithmetic claims like '100 - 98 = 8' or '2 × 3 = 5'."""
    patterns = [
        r"(\d+)\s*[−\-]\s*(\d+)\s*=\s*([−\-]?\d+)",
        r"(\d+)\s*[×x\*]\s*(\d+)\s*=\s*([−\-]?\d+)",
        r"(\d+)\s*\+\s*(\d+)\s*=\s*([−\-]?\d+)",
    ]
    found: list[str] = []
    for pattern in patterns:
        for match in re.finditer(pattern, text or ""):
            found.append(match.group(0))
    return found


def verify_equation_string(claim: str) -> bool | None:
    """Return True/False if claim is checkable; None if not parseable."""
    claim = claim.replace("−", "-").replace("×", "*").replace("x", "*").replace(" ", "")
    match = re.fullmatch(r"(\d+)([+\-*])(\d+)=(-?\d+)", claim)
    if not match:
        return None
    left, op, right, result = match.groups()
    a, b, c = int(left), int(right), int(result)
    if op == "+":
        return a + b == c
    if op == "-":
        return a - b == c
    if op == "*":
        return a * b == c
    return None


def score_intermediate_claims(text: str) -> dict[str, Any]:
    claims = extract_claimed_equations(text)
    if not claims:
        return {
            "claims": [],
            "correct": [],
            "incorrect": [],
            "score": None,
            "passed": None,
            "notes": ["no machine-checkable equations found"],
        }
    correct: list[str] = []
    incorrect: list[str] = []
    for claim in claims:
        ok = verify_equation_string(claim)
        if ok is True:
            correct.append(claim)
        elif ok is False:
            incorrect.append(claim)
    if incorrect:
        score = 0
    elif correct:
        score = 4
    else:
        score = None
    return {
        "claims": claims,
        "correct": correct,
        "incorrect": incorrect,
        "score": score,
        "passed": (len(incorrect) == 0 and len(correct) > 0) if score is not None else None,
        "notes": [f"{len(correct)} correct, {len(incorrect)} incorrect equation(s)"],
    }


def nikhilam_deviation_is_correct(base: int, number: int, claimed: int) -> bool:
    """Preserve signed base - number convention used by the engine."""
    return (base - number) == claimed
