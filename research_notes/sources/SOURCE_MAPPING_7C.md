# Phase 7C — Source-to-curriculum mapping

**Mode:** research mapping (original summaries only; PDFs gitignored).  
**App authority:** Python engines remain mathematical truth.

## Documents inspected

| ID | Title | Access | Pages | Notes |
|---|---|---|---:|---|
| `vedamu_methods` | Vedic Mathematics - Methods | Downloaded OK (`1795%24vedic_mathematics_methods.pdf`) | 160 | Keyword hits for all five sutras; text extract saved locally as `_extract_vedamu.txt` (gitignored) |
| `scert_fundamentals_2014` | Fundamentals & Applications of Vedic Mathematics (SCERT Delhi, 2014) | Downloaded OK | 65 | Strong on base methods, vertical/crosswise, squaring near base; preface asserts Vedic origin (disputed) |

PDF page indexes below are **0-based PDF indexes**, not necessarily printed page numbers.

## Sutra mapping (high level)

| Sutra | App support | Vedamu PDF indexes (samples) | SCERT PDF indexes (samples) | Existing app sources | Proof status |
|---|---|---|---|---|---|
| nikhilam | Supported | 19–31, 70–75 | Base method ~32–38; “all from 9” ~18–22 | `backend/nikhilam.py` (`deviation = base - number`) | Algebra verified; examples engine-checked |
| urdhva | Supported | 32, 39, 41–42 | Vertical/crosswise ~32–40, 49–51 | `backend/urdhva.py` | FOIL / place-value verified |
| ekadhikena | Supported | 8, 10, 16, 18 | Squaring ending / related ~53+; sutra list p.8 | `backend/ekadhikena.py` | `(10a+5)²` verified |
| yavadunam | Supported | 87, 90–93 | Squaring near base ~53–55 | `backend/yavadunam.py` (`deviation = number - base`) | Identity verified; **sign convention differs from Nikhilam** |
| ekanyunena | Supported | 70, 72, 75–76 | Multiples of 9s / base-related ~34+ | `backend/ekanyunena.py` | `n(B-1)=(n-1)B+(B-n)` verified |

## Foundational / reusable concepts

| Concept | Sources | Teaching relevance |
|---|---|---|
| Place value / powers of 10 | SCERT intro; app bases | Shared by Nikhilam, Yavadunam, Ekanyunena |
| Complements | Vedamu ~14–17; SCERT all-from-9 | Nikhilam prerequisite |
| Carrying | SCERT/Vedamu Urdhva chapters; research notes | Urdhva misconception focus |
| Algebraic expansion | Internal research + textbook algebra sections | “Why it works” without mystique |
| Unsupported methods | SCERT sixteen-sutra list p.8–9 | Anurupyena/Paravartya boundary |

## Critical convention conflict (documented, not “fixed”)

| Method | Deviation definition in **this app** |
|---|---|
| Nikhilam | `base - number` |
| Yavadunam | `number - base` |

Reference books may narrate “deficiency” with varying sign language. Knowledge entries teach **app conventions** explicitly and must not silently rewrite engines.

## Historical hygiene

SCERT preface claims Atharvaveda origin. Internal research notes (`sutras-math.md`) and Dani critiques mark that as **disputed**. Knowledge pack separates math facts from historical claims; agent instructions forbid mystical framing.

## Gaps remaining after 7C pack

- Broader Ekadhikena extensions (units sum to 10) mentioned in literature: **not** claimed as separate app features.
- Anurupyena / Paravartya / vinculum-heavy variants: boundary-only.
- Live Gemini grounded-teaching A/B: **pending credits**.
- Human content review beyond `mathematically_verified` / author `approved_for_agent` for v7C.1: recommend educator pass in 7D prep.
