# Treasure Trail — design prototype

Open `index.html` directly in a browser. No server, installation, credentials, or internet connection is needed. The four buttons along the bottom jump between review states. Answering the choices plays through the crossing.

This is a standalone visual prototype, not an integration into the React app. Nothing is deployed. Navigation in the header is decorative. Badges are illustrative and are not saved to the learner's profile. Maths is calculated locally for the concept; production should use the existing Python lesson/question/check contracts as its source of truth.

## Proposed experience

- A child looks across the waves toward Wonder Island.
- Six correct choices take the explorer across five stepping stones and onto the island: base, first shortfall, second shortfall, cross-subtraction, shortfall product, final answer.
- For 97 × 93, answers are 100, 3, 7, 90, 21, 9021.
- Wording explicitly asks for positive shortfalls. Signed deviations would instead be −3 and −7.
- Correct choices animate a leap and a balancing moment. Waves continue moving; reduced-motion preferences suppress animation.
- A wrong choice causes a splash and rescue. The player chooses to retry, receiving a different pair of numbers and fresh encouragement. This proposes rescue instead of death for the child character; confirm this creative choice before implementation.
- Winning illuminates the island and awards a preview Ocean Explorer badge, with a new crossing available.

The number bank keeps both operands below 100 and each shortfall product below 100, so concatenating a two-digit right part is valid. Carrying, borrowing, above-base numbers, and mixed-base problems are outside this beginner concept.

## Review images

- `start.png` — first base question
- `crossing.png` — three stones crossed
- `retry.png` — splash and rescue
- `win.png` — badge and celebration
- `mobile.png` — narrow-screen layout

## Validation

Checked in installed Playwright Chromium: all six correct choices reach victory, the next puzzle changes numbers, a wrong answer shows rescue, retry resets the choices, and the 390px layout has no horizontal overflow. No browser JavaScript errors were reported.

## Branch scope

Created in an isolated worktree from local commit `2aff266` on `feature/treasure-trail-mockups`. Local main is older than the currently deployed commit `15d31bb`; this standalone prototype deliberately does not replace the existing Play page or Number Rocket. Before integration, base the implementation on current GitHub main and retain its game routes and unlock logic.
