"""Engine-authored disclosure rules for progressive Rabbit hints.

Ground truth comes from `build_progressive_hint` / lesson engines.
Checks go beyond simple substring bans: paraphrase patterns, indirect reveal,
and protection of legitimate base/operand mentions.
"""

from __future__ import annotations

import re
from typing import Any

from backend.agents.vedic_math_coach.tools.progressive_hints import build_progressive_hint

# Words that may legitimately appear even when they equal a forbidden digit token
# in other contexts — we only protect via digit-token rules + paraphrase patterns.
_DIGIT_WORDS = {
    "0": ["zero"],
    "1": ["one"],
    "2": ["two", "twice"],
    "3": ["three", "thrice"],
    "4": ["four"],
    "5": ["five"],
    "6": ["six"],
    "7": ["seven"],
    "8": ["eight"],
    "9": ["nine"],
    "10": ["ten"],
}


def disclosure_packet(
    *,
    sutra: str,
    difficulty: str,
    hint_level: int,
    question_key: str | None,
    a: int | None = None,
    b: int | None = None,
    number: int | None = None,
) -> dict[str, Any]:
    packet = build_progressive_hint(
        sutra=sutra,
        difficulty=difficulty,
        hint_level=hint_level,
        question_key=question_key,
        a=a,
        b=b,
        number=number,
    )
    if not packet.get("ok"):
        return packet

    allowed_operands: list[str] = []
    if a is not None:
        allowed_operands.append(str(a))
    if b is not None:
        allowed_operands.append(str(b))
    if number is not None:
        allowed_operands.append(str(number))
    # Base often appears in L2/L3 allowed text
    for token in re.findall(r"\b\d+\b", packet.get("allowed_text") or ""):
        if token not in packet.get("forbidden_values", []):
            allowed_operands.append(token)

    return {
        **packet,
        "allowed_operands": sorted(set(allowed_operands)),
        "mode": "offline_disclosure",
    }


def _contains_digit_token(text: str, value: str) -> bool:
    return re.search(rf"(?<!\d){re.escape(value)}(?!\d)", text) is not None


def _paraphrase_reveals(text: str, value: str) -> bool:
    lowered = text.lower()
    words = _DIGIT_WORDS.get(value, [])
    # "the deviation is two", "distance equals 2", "answer: 2"
    patterns = [
        rf"\b(deviation|answer|distance|gap|difference|result)\b[^\n.]{{0,24}}\b{re.escape(value)}\b",
        rf"\b{re.escape(value)}\b[^\n.]{{0,16}}\b(is the (answer|deviation)|for the deviation)\b",
        rf"\b(write|enter|type)\b[^\n.]{{0,12}}\b{re.escape(value)}\b",
    ]
    for word in words:
        patterns.append(
            rf"\b(deviation|answer|distance|gap|difference)\b[^\n.]{{0,24}}\b{re.escape(word)}\b"
        )
        patterns.append(rf"\b{re.escape(word)}\b[^\n.]{{0,12}}\b(away|below|above|short)\b")
    return any(re.search(p, lowered) for p in patterns)


def _premature_guided_expression(text: str, *, hint_level: int, base: int | None, number: int | None) -> bool:
    """L1/L2 must not reveal the level-3 style base−number expression."""
    if hint_level >= 3 or base is None or number is None:
        return False
    patterns = [
        rf"(?<!\d){base}\s*[−\-]\s*{number}(?!\d)",
        rf"\bcompute\b[^\n.]{{0,24}}(?<!\d){base}\s*[−\-]\s*{number}(?!\d)",
        rf"\bwork out\b[^\n.]{{0,24}}(?<!\d){base}\s*[−\-]\s*{number}(?!\d)",
    ]
    return any(re.search(p, text, flags=re.IGNORECASE) for p in patterns)


def evaluate_hint_disclosure(
    text: str,
    *,
    hint_level: int,
    forbidden_values: list[str],
    allowed_operands: list[str] | None = None,
    guided_base: int | None = None,
    guided_number: int | None = None,
) -> dict[str, Any]:
    """Return disclosure checks for a Rabbit (or coach) hint reply."""
    allowed = set(allowed_operands or [])
    forbidden = [v for v in forbidden_values if v and v not in allowed]
    # At level 3, expression may include operands; answer digit still forbidden.
    leaks: list[str] = []
    paraphrase_leaks: list[str] = []
    for value in forbidden:
        if _contains_digit_token(text, value):
            # If the token only appears as part of an allowed expression like "100 − 98"
            # at level 3, still flag answer digit; operands are filtered above.
            leaks.append(value)
        if _paraphrase_reveals(text, value):
            paraphrase_leaks.append(value)

    # False-positive check: allowed operands should not be treated as leaks by themselves
    operand_mentions = {
        op for op in allowed if _contains_digit_token(text, op)
    }

    premature_expr = _premature_guided_expression(
        text, hint_level=hint_level, base=guided_base, number=guided_number
    )

    leaked = bool(leaks or paraphrase_leaks or premature_expr)
    score = 4
    if leaked:
        score = 0 if hint_level <= 2 else 1
    elif hint_level <= 2 and not text.strip():
        score = 0

    notes: list[str] = []
    if premature_expr:
        notes.append("premature guided expression before level 3")
    if leaks or paraphrase_leaks:
        notes.append("protected value disclosed")
    if not notes:
        notes.append("no protected disclosure detected")

    return {
        "hint_level": hint_level,
        "leaked_tokens": sorted(set(leaks)),
        "paraphrase_leaks": sorted(set(paraphrase_leaks)),
        "premature_expression": premature_expr,
        "allowed_operand_mentions": sorted(operand_mentions),
        "passed": not leaked,
        "hint_quality_score": score,
        "notes": notes,
    }


def score_hint_reply_against_engine(
    text: str,
    *,
    sutra: str,
    difficulty: str,
    hint_level: int,
    question_key: str | None,
    a: int | None = None,
    b: int | None = None,
    number: int | None = None,
) -> dict[str, Any]:
    packet = disclosure_packet(
        sutra=sutra,
        difficulty=difficulty,
        hint_level=hint_level,
        question_key=question_key,
        a=a,
        b=b,
        number=number,
    )
    if not packet.get("ok"):
        return {"passed": False, "hint_quality_score": 0, "notes": [packet.get("message") or "packet error"]}

    guided_base: int | None = None
    guided_number: int | None = None
    if a is not None and (question_key or "").lower().startswith("deviation"):
        guided_base = 100 if abs(int(a)) < 1000 else 1000
        # Prefer engine base from allowed L2/L3 text when present
        base_match = re.search(r"\bbase here is (\d+)\b", packet.get("allowed_text") or "", re.I)
        if base_match:
            guided_base = int(base_match.group(1))
        expr_match = re.search(r"Work out (\d+)\s*[−\-]\s*(\d+)", packet.get("allowed_text") or "")
        if expr_match:
            guided_base = int(expr_match.group(1))
            guided_number = int(expr_match.group(2))
        else:
            use_b = "b" in (question_key or "").lower()
            guided_number = int(b if use_b and b is not None else a)

    result = evaluate_hint_disclosure(
        text,
        hint_level=hint_level,
        forbidden_values=list(packet.get("forbidden_values") or []),
        allowed_operands=list(packet.get("allowed_operands") or []),
        guided_base=guided_base,
        guided_number=guided_number,
    )
    result["packet_allowed_text"] = packet.get("allowed_text")
    result["forbidden_values"] = packet.get("forbidden_values")
    return result
