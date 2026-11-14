# Changelog

Version notes for VedicMath AI. Older commits stay on `main`; each version below points at the history that introduced it.

## Unreleased — Practice answer checking

Two new routes let Practice with Coach check answers in Python, one step at a time. Nikhilam, Urdhva and Ekadhikena are supported; other Sutras return 404.

- `GET /sutras/{sutra}/questions` lists the questions for a problem in teaching order: a `key`, the `step_id` it belongs to, and the `answer_type` (`integer`, or `digits` with a digit count for padded values such as `06`). Expected answers are never included.
- `POST /sutras/{sutra}/check` takes `question`, `answer` (text), `difficulty`, and either `a` and `b` or `number`. It returns `status` (`correct`, `incorrect` or `invalid`), a `mistake` category where one applies (`sign` for a flipped sign, `missing_padding` for `6` instead of `06`), and a `message` for invalid input. It does not return the expected answer.
- Inputs use the same validation and error messages as the lesson endpoint.

## Unreleased — Nikhilam uses base − number

Nikhilam deviations are now `base - number`, so numbers below the base have positive deviations (98 at base 100 is +2). Results, supported ranges, and the borrow/carry normalization are unchanged; all 1,200 supported pairs give the same answers.

Changes to the Nikhilam teaching steps and animation events (same routes):

- `deviations` step: values flip sign and now carry `convention` and a `calculations` entry per operand.
- `cross_subtract` step: the left part is `a - deviation_b`; both diagonals are listed in `cross_calculations` and are always equal.
- New `adjust` step between `multiply_deviations` and `combine`, present only when a borrow or carry is needed. It states the amount moved and the left/right values before and after.
- `combine` stays last and adds `right_digits` and `padding_zeros`. The `base` step adds `right_digits`.
- Events name values by role (`number_a`, `number_b`, `deviation_a`, `deviation_b`, `left_part`, `right_part`) instead of by number, so equal operands such as 98 × 98 are unambiguous.
- Event actions renamed or replaced: `show_deviation` → `calculate_deviation`, `draw_cross_arrow` → `cross_subtract` (one per diagonal), `highlight_deviations` → `multiply_deviations`, `normalize_parts` → `adjust_parts` (adjust step) plus `pad_right_part` and `join_parts` (combine step). New: `compare_with_base`. Older consumers that read the removed actions must be updated.
- Contract tests: `python -m pytest backend/tests`.

## 0.2.0 — 2026-11-13

Urdhva Tiryagbhyam now works when the two numbers have different lengths.

- `calculate_urdhva` accepts any positive integers, including mixed digit lengths.
- A carry left after the last column is stored as its own column and teaching step (`final_carry`, animation action `write_final_carry`).
- Difficulty follows the longer number: beginner is 2 digits, intermediate is 3, advanced is 4.

## 0.1.0 — 2026-11-12

First complete learning API on `main` (commit `90ad236`).

- Nikhilam multiplication with beginner, intermediate, and advanced teaching steps, including carry and borrow.
- Urdhva Tiryagbhyam API and column animation events for equal-length numbers.
- Vendored VedicPy source (BSD 3-Clause) so the app does not depend on an external checkout.
- FastAPI backend, project README, Python dependencies, and a Vite frontend.
