# Changelog

Version notes for VedicMath AI. Older commits stay on `main`; each version below points at the history that introduced it.

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
