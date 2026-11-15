"""Level-gated practice hints from verified teaching steps (not LLM invention)."""

from __future__ import annotations

from typing import Any, Optional

from .errors import tool_error, tool_ok
from .service import ONE_OPERAND, SUTRAS, TWO_OPERAND, build_lesson


def _clip_level(level: int | None) -> int:
    if level is None or level < 1:
        return 1
    return min(3, int(level))


def _nikhilam_deviation_hints(base: int, number: int, level: int) -> tuple[str, list[str]]:
    answer = str(base - number)
    forbidden = [answer, str(abs(base - number))]
    if level <= 1:
        return (
            f"Look at how far {number} sits from the base on the number line. "
            "What kind of gap do you see—does the number sit below or above the base?",
            forbidden,
        )
    if level == 2:
        return (
            f"Use the relationship base − number. The base here is {base}. "
            "Find the distance from that base to the number tile—without rushing to a final product.",
            forbidden,
        )
    # Level 3 may show the expression; still forbid stating the evaluated answer digit.
    return (
        f"Work out {base} − {number}. That expression is your guided step; finish the arithmetic yourself.",
        forbidden,
    )


def _generic_step_hints(title: str, level: int, forbidden: list[str]) -> tuple[str, list[str]]:
    if level <= 1:
        return (
            f"Focus on the idea of this step: “{title}”. What is this step trying to find?",
            forbidden,
        )
    if level == 2:
        return (
            f"Name the operation or visual for “{title}” (for example a subtraction from a base, "
            "a crosswise product, or a carry). Do not state the final digit yet.",
            forbidden,
        )
    return (
        f"Walk one guided sub-step of “{title}” using the stage. Still avoid blurting a boxed final answer "
        "unless the learner asks to reveal it.",
        forbidden,
    )


def build_progressive_hint(
    *,
    sutra: str,
    difficulty: str = "beginner",
    hint_level: int = 1,
    question_key: str | None = None,
    a: Optional[int] = None,
    b: Optional[int] = None,
    number: Optional[int] = None,
) -> dict[str, Any]:
    """Return allowed hint prose and forbidden reveal values for this level."""
    name = (sutra or "").lower().strip()
    if name not in SUTRAS:
        return tool_error(
            "unsupported_sutra",
            f"Unsupported sutra '{sutra}'. Choose one of: {', '.join(SUTRAS)}.",
        )
    if name in TWO_OPERAND and (a is None or b is None):
        return tool_error("invalid_operands", "Provide both a and b for this sutra.")
    if name in ONE_OPERAND and number is None:
        return tool_error("invalid_operands", "Provide the number parameter.")

    level = _clip_level(hint_level)
    try:
        lesson = build_lesson(name, difficulty, a=a, b=b, number=number)
    except Exception as error:  # noqa: BLE001
        return tool_error("engine_error", str(error) or "Could not build lesson for hints.")

    steps = lesson.get("teaching_steps") or []
    result = lesson.get("result")
    forbidden: list[str] = []
    if result is not None:
        forbidden.append(str(result))

    key = (question_key or "").lower()
    allowed = ""

    if name == "nikhilam" and steps:
        base_step = next((s for s in steps if s.get("type") == "base"), None) or steps[0]
        base = int(base_step.get("base") or 100)
        nums = list(base_step.get("numbers") or [])
        if a is not None and b is not None:
            nums = [a, b]
        if "deviation" in key or key in {"deviation_a", "deviation_b", "dev_a", "dev_b"}:
            use_b = "b" in key or key.endswith("_b")
            if use_b:
                target = b if b is not None else (nums[1] if len(nums) > 1 else nums[0])
            else:
                target = a if a is not None else nums[0]
            allowed, more = _nikhilam_deviation_hints(base, int(target), level)
            forbidden.extend(more)
        else:
            title = str(steps[min(level, len(steps)) - 1].get("title") or "this step")
            for step in steps:
                for field in ("left_part", "right_part", "adjusted_left", "adjusted_right", "carry"):
                    if field in step and step[field] is not None:
                        forbidden.append(str(step[field]))
            allowed, more = _generic_step_hints(title, level, forbidden)
            forbidden.extend(more)
    else:
        title = "this step"
        if steps:
            idx = min(max(level - 1, 0), len(steps) - 1)
            title = str(steps[idx].get("title") or steps[idx].get("explanation") or title)[:80]
            if level >= 3 and isinstance(steps[idx].get("explanation"), str):
                # Level 3 may use engine explanation text but still forbid final result wording.
                allowed = str(steps[idx]["explanation"])
                if result is not None:
                    allowed = allowed.replace(str(result), "the verified result (work it out on the stage)")
            else:
                allowed, _ = _generic_step_hints(title, level, forbidden)
        else:
            allowed, _ = _generic_step_hints(title, level, forbidden)

    # Deduplicate forbidden tokens; drop empties.
    clean_forbidden = sorted({t.strip() for t in forbidden if t and t.strip() and t.strip() != "0"})

    return tool_ok(
        sutra=name,
        difficulty=difficulty,
        hint_level=level,
        question_key=question_key,
        allowed_text=allowed.strip(),
        forbidden_values=clean_forbidden,
        speak_as="rabbit",
        guidance=(
            "Paraphrase allowed_text only. Never tell the learner any forbidden_values "
            "at this hint level."
            if level < 3
            else "You may guide the worked expression; still avoid blurting a boxed final answer "
            "unless the learner explicitly asks to reveal it."
        ),
    )


def get_progressive_hint(
    sutra: str,
    hint_level: int = 1,
    difficulty: str = "beginner",
    question_key: Optional[str] = None,
    a: Optional[int] = None,
    b: Optional[int] = None,
    number: Optional[int] = None,
) -> dict[str, Any]:
    """ADK tool: return a level-gated hint grounded in verified lesson data."""
    return build_progressive_hint(
        sutra=sutra,
        difficulty=difficulty,
        hint_level=hint_level,
        question_key=question_key,
        a=a,
        b=b,
        number=number,
    )


def redact_forbidden_values(text: str, forbidden: list[str]) -> tuple[str, bool]:
    """Remove whole-token forbidden numbers from a Rabbit reply. Returns (text, changed)."""
    import re

    out = text or ""
    changed = False
    for value in sorted({v for v in forbidden if v}, key=len, reverse=True):
        # Match the number as its own numeric token (punctuation around it is fine).
        pattern = re.compile(rf"(?<!\d){re.escape(value)}(?!\d)")
        if pattern.search(out):
            out = pattern.sub("…", out)
            changed = True
    if changed:
        out = (
            out.rstrip()
            + "\n\n(I hid a number you should discover — try the stage or ask for the next hint level.)"
        )
    return out, changed
