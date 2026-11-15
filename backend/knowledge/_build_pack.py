"""One-shot builder for Phase 7C curated knowledge JSON (original text + engine-verified examples).

Run: python -m backend.knowledge._build_pack
Does not redistribute textbook prose; stores page references only.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from backend.ekadhikena import calculate_ekadhikena
from backend.ekanyunena import calculate_ekanyunena
from backend.knowledge.schemas import CONTENT_VERSION
from backend.nikhilam import DEVIATION_CONVENTION, build_nikhilam_steps
from backend.urdhva import calculate_urdhva
from backend.yavadunam import calculate_yavadunam

ROOT = Path(__file__).resolve().parent


def _src(doc: str, section: str, pdf_index: int | None, note: str = "") -> dict[str, Any]:
    docs = {
        "vedamu": {
            "document_id": "vedamu_methods",
            "title": "Vedic Mathematics - Methods",
            "url": "https://www.vedamu.org/veda/1795%24vedic_mathematics_methods.pdf",
            "author_publisher": "Compiled PDF (author metadata: sandeep.kattekola / Word Preface)",
        },
        "scert": {
            "document_id": "scert_fundamentals_2014",
            "title": "Fundamentals & Applications of Vedic Mathematics (2014)",
            "url": "https://navavani.org.in/wp/wp-content/uploads/2017/07/FUNDAMENTALANDVEDICMATHEMATICS.pdf",
            "author_publisher": "SCERT New Delhi",
        },
        "app": {
            "document_id": "vedicmath_ai_engines",
            "title": "VedicMath AI deterministic engines",
            "url": "local://backend/",
            "author_publisher": "Project engines (authoritative for calculations)",
        },
        "research": {
            "document_id": "internal_sutras_math_notes",
            "title": "Internal research notes: sutras-math.md",
            "url": "local://research_notes/Vedic maths teaching foundations/sutras-math.md",
            "author_publisher": "Project research notes",
        },
    }
    base = dict(docs[doc])
    base.update(
        {
            "section": section,
            "pdf_page_index": pdf_index,
            "printed_page_note": (
                f"PDF page index {pdf_index} (0-based); printed page may differ"
                if pdf_index is not None
                else "n/a"
            ),
            "verification_status": "independently_checked" if doc in {"app", "research"} else "mapped",
            "note": note,
        }
    )
    return base


def _entry(
    *,
    concept_id: str,
    title: str,
    concept_type: str,
    explanation: dict[str, Any],
    sutra_id: str | None = None,
    difficulty_levels: list[str] | None = None,
    prerequisites: list[str] | None = None,
    misconceptions: list[dict[str, Any]] | None = None,
    examples: list[dict[str, Any]] | None = None,
    source_references: list[dict[str, Any]] | None = None,
    aliases: list[str] | None = None,
    keywords: list[str] | None = None,
    app_supported: bool = True,
    review_status: str = "approved_for_agent",
    related_concepts: list[str] | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "concept_id": concept_id,
        "sutra_id": sutra_id,
        "title": title,
        "concept_type": concept_type,
        "difficulty_levels": difficulty_levels or ["beginner", "intermediate", "advanced"],
        "prerequisites": prerequisites or [],
        "explanation": explanation,
        "misconceptions": misconceptions or [],
        "examples": examples or [],
        "source_references": source_references or [],
        "aliases": aliases or [],
        "keywords": keywords or [],
        "related_concepts": related_concepts or [],
        "app_supported": app_supported,
        "review_status": review_status,
        "content_version": CONTENT_VERSION,
        "history_vs_math_note": (
            "Mathematical claims here are independently checkable algebra/place-value. "
            "Traditional origin claims about the Vedas are not asserted as established fact."
        ),
    }
    if extra:
        payload.update(extra)
    return payload


def _verify_product(a: int, b: int) -> int:
    return a * b


def build_references() -> dict[str, Any]:
    return {
        "content_version": CONTENT_VERSION,
        "documents": [
            {
                "document_id": "vedamu_methods",
                "title": "Vedic Mathematics - Methods",
                "url": "https://www.vedamu.org/veda/1795%24vedic_mathematics_methods.pdf",
                "accessed": "2026-11-15",
                "pages": 160,
                "copyright_note": "Research reference only; do not redistribute wholesale.",
                "key_pdf_indexes": {
                    "ekadhikena": [8, 10, 16],
                    "nikhilam": [19, 21, 24, 26, 30],
                    "urdhva": [32, 39, 41, 42],
                    "ekanyunena": [70, 72, 75, 76],
                    "yavadunam": [87, 90, 91, 93],
                },
            },
            {
                "document_id": "scert_fundamentals_2014",
                "title": "Fundamentals & Applications of Vedic Mathematics",
                "publisher": "SCERT New Delhi",
                "year": 2014,
                "url": "https://navavani.org.in/wp/wp-content/uploads/2017/07/FUNDAMENTALANDVEDICMATHEMATICS.pdf",
                "accessed": "2026-11-15",
                "pages": 65,
                "copyright_note": "Research reference only; do not redistribute wholesale.",
                "key_pdf_indexes": {
                    "contents": [5],
                    "sixteen_sutras_list": [8, 9],
                    "special_multiplication_base": [32, 33, 34, 35],
                    "vertical_crosswise": [32, 33, 49, 50],
                    "squaring_near_base": [53, 54, 55],
                    "all_from_9": [18, 19, 20],
                },
                "caveat": (
                    "Preface asserts Vedic/Atharvaveda origin; historians dispute that claim. "
                    "Use arithmetic techniques; do not teach disputed history as fact."
                ),
            },
        ],
        "app_conventions": {
            "nikhilam_deviation": DEVIATION_CONVENTION,
            "yavadunam_deviation": "number - base",
            "note": "Do not conflate Nikhilam and Yavadunam deviation sign conventions.",
        },
    }


def build_foundation_concepts() -> list[dict[str, Any]]:
    return [
        _entry(
            concept_id="foundation.place_value",
            title="Place value and powers of ten",
            concept_type="foundation",
            aliases=["place value", "powers of 10", "base 10"],
            keywords=["place value", "tens", "hundreds", "powers of ten", "base"],
            explanation={
                "default": (
                    "Our number system groups digits by powers of ten. A base such as 100 or 1000 "
                    "is just a clean power of ten that makes mental regrouping easier."
                ),
                "beginner": "100 means 1 hundred. Numbers near 100 are easier to compare to that landmark.",
                "intermediate": "Bases 100, 1000, and 10000 are powers of ten used as convenient landmarks.",
                "advanced": "Working relative to 10^n is the same algebra as expanding (10^n ± d).",
            },
            source_references=[
                _src("scert", "Introduction / place-value arithmetic context", 7),
                _src("app", "Lesson bases in Nikhilam/Yavadunam levels", None),
            ],
        ),
        _entry(
            concept_id="foundation.complements",
            title="Complements from a power-of-ten base",
            concept_type="foundation",
            aliases=["complement", "all from 9", "deficiency"],
            keywords=["complement", "all from 9", "last from 10", "deficiency", "distance from base"],
            explanation={
                "default": (
                    "A complement tells how far a number sits from a chosen base. "
                    "In this app's Nikhilam engine the signed gap is computed as base − number."
                ),
                "beginner": "From 100 down to 97, the gap is 3. That gap is the complement idea.",
                "intermediate": "Complements turn a hard product into a small product of gaps plus a simple left part.",
                "advanced": "Algebraically, complements are the ±d terms in (B ± d).",
            },
            source_references=[
                _src("vedamu", "Complement / Nikhilam related sections", 14, "PDF indexes ~14–17, 30–31"),
                _src("scert", "All from 9 / base subtraction devices", 18),
                _src("app", f"Nikhilam convention {DEVIATION_CONVENTION}", None),
            ],
            related_concepts=["sutra.nikhilam.principle"],
        ),
        _entry(
            concept_id="foundation.carrying",
            title="Carrying in place-value multiplication",
            concept_type="foundation",
            aliases=["carry", "carrying"],
            keywords=["carry", "carrying", "place value", "overflow", "column"],
            explanation={
                "default": (
                    "When a place-value column sum is 10 or more, write the units digit and pass the tens "
                    "as a carry into the next higher place. Carries are ordinary place-value bookkeeping, "
                    "not a separate mysterious rule."
                ),
                "beginner": "If a column makes 14, write 4 and remember 1 for the next column.",
                "intermediate": "In Urdhva, each vertical/crosswise sweep is one place-value column plus any incoming carry.",
                "advanced": "Carrying is reduction modulo 10 with quotient moved one power of ten higher.",
            },
            misconceptions=[
                {
                    "misconception_id": "mis.carry.concat_blocks",
                    "observable_error": "Writing raw column products side-by-side without carrying",
                    "correct_concept": "Each column contributes one digit after carry normalization",
                    "teaching_intervention": "Replay one Urdhva column and show write_digit vs outgoing_carry",
                    "rabbit_hint_strategy": "Level 2: watch the carry arrow; do not state the digit yet",
                    "follow_up_practice": "Urdhva beginner with a mid-size cross product",
                }
            ],
            source_references=[
                _src("scert", "Vertical and crosswise multiplication chapters", 32),
                _src("vedamu", "Urdhva sections", 41),
                _src("research", "Urdhva carry misconceptions", None),
            ],
            related_concepts=["sutra.urdhva.principle"],
        ),
        _entry(
            concept_id="foundation.algebraic_expansion",
            title="Algebraic expansion behind mental shortcuts",
            concept_type="foundation",
            aliases=["algebra", "expansion", "identity"],
            keywords=["algebra", "identity", "expansion", "why it works", "proof"],
            explanation={
                "default": (
                    "Most Vedic mental-math shortcuts in this app are rearrangements of school algebra: "
                    "(B±a)(B±b), (10n+5)², and place-value convolutions. The shortcut is optional; the identity is the reason."
                ),
                "beginner": "A shortcut works because it secretly uses a true number pattern, not magic.",
                "intermediate": "If you expand the algebra, you get the same left and right parts the method writes.",
                "advanced": "Teaching should connect each method to a named identity and its domain of use.",
            },
            source_references=[
                _src("research", "Algebraic foundations summary", None),
                _src("vedamu", "Worked algebraic presentations across sutra chapters", 0),
            ],
        ),
        _entry(
            concept_id="foundation.unsupported_methods",
            title="Methods mentioned in books but not implemented here",
            concept_type="unsupported_boundary",
            app_supported=False,
            aliases=["anurupyena", "paravartya", "unsupported sutra"],
            keywords=["anurupyena", "paravartya", "not in this app", "unsupported"],
            explanation={
                "default": (
                    "Reference books list many sutras (for example Anurupyena or Paravartya). "
                    "This application currently implements only nikhilam, urdhva, ekadhikena, "
                    "yavadunam, and ekanyunena. Do not invent animations or practice for other methods."
                ),
                "beginner": "That method may exist in books, but this app cannot open it yet. Try Urdhva or Nikhilam instead.",
            },
            source_references=[
                _src("scert", "Sixteen sutras list", 8),
                _src("app", "PRACTICE_SUTRAS allow-list", None),
            ],
        ),
    ]


def _nikhilam_example(a: int, b: int, difficulty: str) -> dict[str, Any]:
    base = {"beginner": 100, "intermediate": 1000, "advanced": 10000}[difficulty]
    steps = build_nikhilam_steps(a, b, base)
    result = steps[-1]["result"]
    assert result == a * b
    devs = next(s for s in steps if s["type"] == "deviations")
    return {
        "example_id": f"ex.nikhilam.{difficulty}.{a}x{b}",
        "sutra_id": "nikhilam",
        "difficulty": difficulty,
        "operands": {"a": a, "b": b, "base": base},
        "expected_result": result,
        "engine_verified": True,
        "independent_check": a * b,
        "intermediate": {
            "deviation_convention": DEVIATION_CONVENTION,
            "deviations": devs["deviations"],
        },
        "app_supported": True,
    }


def build_nikhilam() -> dict[str, Any]:
    examples = [
        _nikhilam_example(98, 97, "beginner"),
        _nikhilam_example(98, 103, "beginner"),
        _nikhilam_example(996, 997, "intermediate"),
    ]
    entries = [
        _entry(
            concept_id="sutra.nikhilam.overview",
            sutra_id="nikhilam",
            title="Nikhilam Navatashcaramam Dashatah — overview",
            concept_type="sutra_overview",
            aliases=["nikhilam", "near base multiplication", "all from 9 and last from 10"],
            keywords=["nikhilam", "near base", "base 100", "deviation", "why nikhilam"],
            prerequisites=["foundation.place_value", "foundation.complements"],
            explanation={
                "default": (
                    "Nikhilam means working with numbers near a power-of-ten base. "
                    "Instead of multiplying the large numbers directly, we multiply their gaps from the base "
                    "and rebuild the product from a left part and a right part."
                ),
                "translation": "Commonly glossed as “all from 9 and the last from 10.”",
                "app_support": "Interactive Theory/Practice for beginner/intermediate/advanced near-base ranges.",
            },
            examples=examples,
            source_references=[
                _src("vedamu", "Nikhilam chapters", 19),
                _src("scert", "Base Method / special multiplication", 32),
                _src("app", "backend/nikhilam.py", None),
            ],
            related_concepts=["sutra.nikhilam.principle", "sutra.yavadunam.overview"],
            extra={
                "full_name": "Nikhilam Navatashcaramam Dashatah",
                "related_sutras": ["yavadunam", "urdhva"],
            },
        ),
        _entry(
            concept_id="sutra.nikhilam.principle",
            sutra_id="nikhilam",
            title="Why Nikhilam works",
            concept_type="principle",
            aliases=["why nikhilam", "nikhilam algebra"],
            keywords=["why", "works", "algebra", "identity", "base", "deviation"],
            prerequisites=["foundation.algebraic_expansion", "foundation.complements"],
            explanation={
                "default": (
                    "Let B be a base such as 100. Write the factors as (B − d) and (B − e) using this app’s "
                    "convention deviation = base − number. Then "
                    "(B − d)(B − e) = B(B − d − e) + de. "
                    "The left part is the cross-subtraction; the right part is the product of deviations, "
                    "padded to the base width with carry if needed."
                ),
                "beginner": (
                    "Near 100, the hard product becomes a small gap×gap plus a simple left number. "
                    "For 98×97: gaps 2 and 3; left 95; right 06; product 9506."
                ),
                "intermediate": "Same identity with base 1000; pad the right part to three digits.",
                "advanced": "Mixed signs (one above base, one below) still follow the identity; negative right parts need borrow/adjust.",
                "derivation": "(B-d)(B-e)=B²−B(d+e)+de=B(B−d−e)+de.",
            },
            examples=examples[:1],
            source_references=[
                _src("research", "Nikhilam algebraic identity", None),
                _src("vedamu", "Nikhilam worked methods", 21),
                _src("app", f"Deviation convention {DEVIATION_CONVENTION}", None),
            ],
            misconceptions=[
                {
                    "misconception_id": "mis.nikhilam.reversed_deviation",
                    "observable_error": "Computing number − base instead of base − number for Nikhilam",
                    "correct_concept": f"This app uses {DEVIATION_CONVENTION} for Nikhilam",
                    "teaching_intervention": "Point to the base landmark and ask which way the tile sits",
                    "rabbit_hint_strategy": "Level 2: relationship base − number; forbid stating the digit",
                    "follow_up_practice": "Nikhilam beginner deviation_a",
                },
                {
                    "misconception_id": "mis.nikhilam.wrong_base",
                    "observable_error": "Choosing a base far from both numbers",
                    "correct_concept": "Choose the nearby power-of-ten supported by the difficulty level",
                    "teaching_intervention": "Compare distances to 100 vs 1000",
                    "rabbit_hint_strategy": "Level 1: look at the base landmark",
                    "follow_up_practice": "Stay inside the level’s numeric window",
                },
            ],
        ),
        _entry(
            concept_id="sutra.nikhilam.alt_place_value",
            sutra_id="nikhilam",
            title="Nikhilam — place-value explanation",
            concept_type="alternate_explanation",
            aliases=["another way nikhilam", "explain differently"],
            keywords=["another way", "different explanation", "place value", "nikhilam"],
            explanation={
                "default": (
                    "Think of 98 as 100 − 2. Multiplying by 97 is like taking 97 hundreds and then adjusting "
                    "because of the missing 2×97. That adjustment becomes the deviation product and the "
                    "cross-subtraction you see on the stage."
                ),
                "beginner": "Start from a round hundred, then fix the leftover gaps.",
            },
            source_references=[_src("app", "Teaching narrative aligned to engine steps", None)],
            related_concepts=["sutra.nikhilam.principle"],
        ),
        _entry(
            concept_id="sutra.nikhilam.check_base_choice",
            sutra_id="nikhilam",
            title="Understanding check: why choose this base?",
            concept_type="understanding_check",
            keywords=["why base", "choose 100", "check"],
            explanation={
                "prompt": "Why did we choose 100 as our base for 98×97?",
                "expected_reasoning": "Both numbers are close to 100, so gaps are small and easy.",
                "misconception_indicators": ["any base works the same", "base is random"],
            },
            source_references=[_src("app", "Nikhilam beginner window 90–109", None)],
        ),
        _entry(
            concept_id="sutra.nikhilam.applicability",
            sutra_id="nikhilam",
            title="Nikhilam applicability and limits",
            concept_type="applicability",
            keywords=["range", "limit", "when to use", "nikhilam"],
            explanation={
                "default": (
                    "Best when both factors are near the same 10^n. In this app: beginner base 100 (90–109), "
                    "intermediate 1000 (990–1009), advanced 10000 (9990–10009). Outside that, prefer Urdhva."
                )
            },
            source_references=[_src("app", "NIKHILAM_LEVELS in main.py", None)],
        ),
    ]
    return {"sutra_id": "nikhilam", "content_version": CONTENT_VERSION, "entries": entries}


def build_urdhva() -> dict[str, Any]:
    calc = calculate_urdhva(23, 14)
    assert calc["result"] == 23 * 14
    ex = {
        "example_id": "ex.urdhva.beginner.23x14",
        "sutra_id": "urdhva",
        "difficulty": "beginner",
        "operands": {"a": 23, "b": 14},
        "expected_result": calc["result"],
        "engine_verified": True,
        "independent_check": 23 * 14,
        "app_supported": True,
    }
    entries = [
        _entry(
            concept_id="sutra.urdhva.overview",
            sutra_id="urdhva",
            title="Urdhva Tiryagbhyam — overview",
            concept_type="sutra_overview",
            aliases=["urdhva", "vertically and crosswise", "criss-cross"],
            keywords=["urdhva", "vertical", "crosswise", "general multiplication"],
            prerequisites=["foundation.place_value", "foundation.carrying"],
            explanation={
                "default": (
                    "Urdhva Tiryagbhyam multiplies by taking vertical and crosswise digit products, "
                    "one place-value column at a time, with carries. It is a general method for positive integers."
                ),
                "translation": "Vertically and crosswise.",
            },
            examples=[ex],
            source_references=[
                _src("vedamu", "Urdhva sections", 41),
                _src("scert", "Vertical / crosswise multiplication", 32),
                _src("app", "backend/urdhva.py", None),
            ],
        ),
        _entry(
            concept_id="sutra.urdhva.principle",
            sutra_id="urdhva",
            title="Why Urdhva works",
            concept_type="principle",
            aliases=["why urdhva", "why carry"],
            keywords=["why", "carry", "urdhva", "foil", "place value"],
            explanation={
                "default": (
                    "For two-digit factors (10a+b)(10c+d)=100ac+10(ad+bc)+bd. "
                    "Each Urdhva sweep collects the products that belong to the same power of ten, "
                    "then carrying writes a standard decimal number."
                ),
                "beginner": "You still multiply digit by digit; you just collect them by place in one line.",
                "intermediate": "Larger factors need more sweeps (2n−1 for equal n-digit factors) and careful carries.",
                "advanced": "It is discrete convolution of digit sequences with base-10 carries.",
                "derivation": "(10a+b)(10c+d)=100ac+10(ad+bc)+bd.",
            },
            examples=[ex],
            misconceptions=[
                {
                    "misconception_id": "mis.urdhva.no_carry",
                    "observable_error": "Concatenating column products without carry",
                    "correct_concept": "Normalize each column to one digit; pass carry left",
                    "teaching_intervention": "Use foundation.carrying with the current column totals",
                    "rabbit_hint_strategy": "Level 2: watch carry arrow",
                    "follow_up_practice": "Urdhva problem with cross sum ≥ 10",
                }
            ],
            source_references=[
                _src("research", "Urdhva FOIL / convolution framing", None),
                _src("scert", "Vertical and crosswise", 49),
            ],
        ),
        _entry(
            concept_id="sutra.urdhva.alt_foil",
            sutra_id="urdhva",
            title="Urdhva — FOIL / another way",
            concept_type="alternate_explanation",
            keywords=["another way", "foil", "urdhva"],
            explanation={
                "default": (
                    "If you know FOIL for binomials, Urdhva for two-digit numbers is the same idea "
                    "written in place-value columns: First, Outside+Inside, Last, then carry."
                )
            },
            source_references=[_src("research", "FOIL equivalence", None)],
        ),
        _entry(
            concept_id="sutra.urdhva.applicability",
            sutra_id="urdhva",
            title="Urdhva applicability",
            concept_type="applicability",
            keywords=["general", "when to use urdhva"],
            explanation={
                "default": (
                    "Use Urdhva as the general multiplier in this app. Prefer Nikhilam only when both "
                    "numbers sit near the same power-of-ten base in the supported window."
                )
            },
            source_references=[_src("app", "urdhva engine", None)],
        ),
    ]
    return {"sutra_id": "urdhva", "content_version": CONTENT_VERSION, "entries": entries}


def build_ekadhikena() -> dict[str, Any]:
    calc = calculate_ekadhikena(35, "beginner")
    assert calc["result"] == 35 * 35
    ex = {
        "example_id": "ex.ekadhikena.beginner.35",
        "sutra_id": "ekadhikena",
        "difficulty": "beginner",
        "operands": {"number": 35},
        "expected_result": calc["result"],
        "engine_verified": True,
        "independent_check": 1225,
        "intermediate": {"previous": 3, "next": 4, "left": 12, "right": 25},
        "app_supported": True,
    }
    entries = [
        _entry(
            concept_id="sutra.ekadhikena.overview",
            sutra_id="ekadhikena",
            title="Ekadhikena Purvena — overview",
            concept_type="sutra_overview",
            aliases=["ekadhikena", "square ending in 5", "by one more than the previous"],
            keywords=["ekadhikena", "ending in 5", "square", "25"],
            explanation={
                "default": (
                    "Ekadhikena Purvena (“by one more than the previous”) is used here to square a number ending in 5: "
                    "multiply the preceding part by one more than itself, then append 25."
                ),
                "app_support": "Squares 2/3/4-digit numbers ending in 5 by difficulty.",
            },
            examples=[ex],
            source_references=[
                _src("vedamu", "Ekadhikena sections", 8),
                _src("scert", "Squaring / by one more", 53),
                _src("app", "backend/ekadhikena.py", None),
            ],
        ),
        _entry(
            concept_id="sutra.ekadhikena.principle",
            sutra_id="ekadhikena",
            title="Why squaring a number ending in 5 works",
            concept_type="principle",
            keywords=["why", "ending in 5", "25", "ekadhikena"],
            explanation={
                "default": (
                    "If n=10a+5, then n²=100a²+100a+25=100a(a+1)+25. "
                    "So the left block is a(a+1) and the right block is always 25."
                ),
                "beginner": "For 35: take 3, add one to get 4, 3×4=12, append 25 → 1225.",
                "derivation": "(10a+5)²=100a²+100a+25=100a(a+1)+25.",
            },
            examples=[ex],
            misconceptions=[
                {
                    "misconception_id": "mis.ekadhikena.times_same",
                    "observable_error": "Computing a×a instead of a×(a+1)",
                    "correct_concept": "Use one more than the previous part",
                    "teaching_intervention": "Say the phrase ‘one more than the previous’ while pointing at a and a+1",
                    "rabbit_hint_strategy": "Level 2: name the +1 relationship",
                    "follow_up_practice": "Ekadhikena beginner",
                }
            ],
            source_references=[
                _src("research", "Ekadhikena identity", None),
                _src("vedamu", "Ekadhikena", 8),
            ],
        ),
        _entry(
            concept_id="sutra.ekadhikena.alt_geometry",
            sutra_id="ekadhikena",
            title="Ekadhikena — geometric / another way",
            concept_type="alternate_explanation",
            keywords=["another way", "geometry", "ekadhikena"],
            explanation={
                "default": (
                    "Picture a square of side 10a+5 as a big 10a×10a block, two 5×10a strips, and a 5×5 corner. "
                    "Sliding one strip completes a 10a×10(a+1) rectangle worth 100a(a+1), leaving the 25 corner."
                )
            },
            source_references=[_src("research", "Geometric rearrangement", None)],
        ),
        _entry(
            concept_id="sutra.ekadhikena.applicability",
            sutra_id="ekadhikena",
            title="Ekadhikena applicability",
            concept_type="applicability",
            keywords=["ending in 5 only", "limits"],
            explanation={
                "default": (
                    "This app’s interactive Ekadhikena path is for positive integers ending in 5 with the "
                    "digit length required by difficulty. Broader textbook extensions (e.g. units summing to 10) "
                    "are not claimed as separate implemented features here."
                )
            },
            source_references=[_src("app", "ekadhikena digit constraints", None)],
        ),
    ]
    return {"sutra_id": "ekadhikena", "content_version": CONTENT_VERSION, "entries": entries}


def build_yavadunam() -> dict[str, Any]:
    calc = calculate_yavadunam(97, "beginner")
    assert calc["result"] == 97 * 97
    # App convention: deviation = number - base
    ex = {
        "example_id": "ex.yavadunam.beginner.97",
        "sutra_id": "yavadunam",
        "difficulty": "beginner",
        "operands": {"number": 97, "base": 100},
        "expected_result": calc["result"],
        "engine_verified": True,
        "independent_check": 9409,
        "intermediate": {
            "deviation_convention": "number - base",
            "deviation": 97 - 100,
        },
        "app_supported": True,
        "note": "Yavadunam uses number−base; do not swap with Nikhilam’s base−number convention.",
    }
    entries = [
        _entry(
            concept_id="sutra.yavadunam.overview",
            sutra_id="yavadunam",
            title="Yavadunam — overview",
            concept_type="sutra_overview",
            aliases=["yavadunam", "squaring near a base"],
            keywords=["yavadunam", "square near base", "deficiency"],
            explanation={
                "default": (
                    "Yavadunam squares a number near a power-of-ten base. "
                    "In this app, deviation is number − base (so 97 gives −3 at base 100). "
                    "That is intentionally different from Nikhilam’s base − number convention."
                )
            },
            examples=[ex],
            source_references=[
                _src("vedamu", "Yavadunam sections", 87),
                _src("scert", "Squaring numbers near a base", 53),
                _src("app", "backend/yavadunam.py", None),
            ],
        ),
        _entry(
            concept_id="sutra.yavadunam.principle",
            sutra_id="yavadunam",
            title="Why Yavadunam squaring works",
            concept_type="principle",
            keywords=["why", "yavadunam", "square"],
            explanation={
                "default": (
                    "If n=B+d with d=n−B, then n²=(B+d)²=B²+2Bd+d²=B(B+2d)+d²=B(n+d)+d². "
                    "The method writes a left part from n+d (with carry from d²) and a right part from d²."
                ),
                "beginner": "For 97: d=−3; left uses 97+(−3)=94; right is 09 from (−3)²; result 9409.",
                "derivation": "(B+d)²=B(B+2d)+d²=B(n+d)+d².",
            },
            examples=[ex],
            misconceptions=[
                {
                    "misconception_id": "mis.yavadunam.nikhilam_sign",
                    "observable_error": "Using base−number for Yavadunam",
                    "correct_concept": "Yavadunam engine uses number−base",
                    "teaching_intervention": "Contrast the two formulas explicitly; do not ‘fix’ either engine",
                    "rabbit_hint_strategy": "Level 2: name which formula this stage uses",
                    "follow_up_practice": "Yavadunam beginner",
                }
            ],
            source_references=[
                _src("research", "Near-base squaring identity", None),
                _src("app", "yavadunam deviation = number - base", None),
            ],
        ),
        _entry(
            concept_id="sutra.yavadunam.applicability",
            sutra_id="yavadunam",
            title="Yavadunam applicability",
            concept_type="applicability",
            keywords=["range", "yavadunam"],
            explanation={
                "default": "Same numeric windows as Nikhilam levels (near 100/1000/10000), but for squaring one number."
            },
            source_references=[_src("app", "Yavadunam LEVELS", None)],
        ),
    ]
    return {"sutra_id": "yavadunam", "content_version": CONTENT_VERSION, "entries": entries}


def build_ekanyunena() -> dict[str, Any]:
    calc = calculate_ekanyunena(7, "beginner")
    assert calc["result"] == 7 * 99
    ex = {
        "example_id": "ex.ekanyunena.beginner.7x99",
        "sutra_id": "ekanyunena",
        "difficulty": "beginner",
        "operands": {"number": 7, "multiplier": 99},
        "expected_result": calc["result"],
        "engine_verified": True,
        "independent_check": 693,
        "intermediate": {"left": 6, "right": 93},
        "app_supported": True,
    }
    entries = [
        _entry(
            concept_id="sutra.ekanyunena.overview",
            sutra_id="ekanyunena",
            title="Ekanyunena Purvena — overview",
            concept_type="sutra_overview",
            aliases=["ekanyunena", "multiply by 99", "multiply by 999"],
            keywords=["ekanyunena", "99", "999", "9999", "one less than the previous"],
            explanation={
                "default": (
                    "Ekanyunena Purvena is used here for multiplication by a string of 9s (99, 999, 9999). "
                    "The product splits into (number−1) on the left and the complement to the base on the right."
                )
            },
            examples=[ex],
            source_references=[
                _src("vedamu", "Ekanyunena sections", 70),
                _src("scert", "Multiplication involving 9s / related base methods", 34),
                _src("app", "backend/ekanyunena.py", None),
            ],
        ),
        _entry(
            concept_id="sutra.ekanyunena.principle",
            sutra_id="ekanyunena",
            title="Why multiplying by 99/999 works this way",
            concept_type="principle",
            keywords=["why", "99", "ekanyunena"],
            explanation={
                "default": (
                    "Because 99=100−1, n×99=n(100−1)=100n−n. That equals (n−1)×100 + (100−n) "
                    "after regrouping, which is exactly left=(n−1), right=(base−n)."
                ),
                "beginner": "7×99: left 6, right 93 → 693.",
                "derivation": "n(B−1)=nB−n=(n−1)B+(B−n).",
            },
            examples=[ex],
            source_references=[
                _src("app", "ekanyunena identity check", None),
                _src("vedamu", "Ekanyunena", 72),
            ],
        ),
        _entry(
            concept_id="sutra.ekanyunena.applicability",
            sutra_id="ekanyunena",
            title="Ekanyunena applicability",
            concept_type="applicability",
            keywords=["99", "999", "limits"],
            explanation={
                "default": (
                    "Beginner multiplies by 99 with n in 1..100; intermediate by 999 with n in 1..1000; "
                    "advanced by 9999 with n in 1..10000."
                )
            },
            source_references=[_src("app", "ekanyunena LEVELS", None)],
        ),
    ]
    return {"sutra_id": "ekanyunena", "content_version": CONTENT_VERSION, "entries": entries}


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    write_json(ROOT / "sources" / "references.json", build_references())
    mapping = {
        "foundation.place_value": "place_value.json",
        "foundation.complements": "complements.json",
        "foundation.carrying": "carrying.json",
        "foundation.algebraic_expansion": "algebraic_identities.json",
        "foundation.unsupported_methods": "unsupported_methods.json",
    }
    for entry in build_foundation_concepts():
        write_json(ROOT / "concepts" / mapping[entry["concept_id"]], entry)

    for builder, name in [
        (build_nikhilam, "nikhilam.json"),
        (build_urdhva, "urdhva.json"),
        (build_ekadhikena, "ekadhikena.json"),
        (build_yavadunam, "yavadunam.json"),
        (build_ekanyunena, "ekanyunena.json"),
    ]:
        write_json(ROOT / "sutras" / name, builder())
    print("Wrote knowledge pack", CONTENT_VERSION)


if __name__ == "__main__":
    main()
