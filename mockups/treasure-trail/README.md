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

## Revised immersive direction

The revised prototype uses a full-screen, rear-facing camera and a procedural perspective ocean rendered in Canvas. Rolling wave heights drive platform bobbing, platform tilt, and the child’s balancing sway. Answer buttons float above the next platform; choosing one animates a forward jump with a following camera. A darker sky, rain, foam, open-water depth, and slipping on a wrong answer add tension. The ocean remains stylized procedural artwork rather than photorealistic water or a full physics simulation. Motion can be paused, and reduced-motion preferences are respected on load.

## Rishi and separate landing choices

Rishi is now drawn from behind in his cream outfit, lavender diagonal sash and waist wrap, bare feet, and swept dark hair; the backpack has been removed. Every question presents three separate floating stones with the numbers on the stone surfaces. The selected answer determines the lateral landing position. Incorrect selections animate a jump followed by a fall, ending the attempt with Game Over and a fresh-puzzle restart. The earlier rescue boat concept has been removed. The island appears small on the horizon initially and grows as the camera advances. An offset over-the-shoulder camera keeps answer labels clear of Rishi.

## Larger destination and readable stepping stones

Wonder Island is now larger from the outset and includes a castle with flags, a rainbow, waterfall, palms, glowing beach, treasure chest, and sparkles. Upcoming platforms are enlarged separately from Rishi's current platform, with wider spacing on desktop and responsive spacing on mobile. Answer numbers use larger bold type. After every correct landing, the next question and three new options appear with a reveal transition and explicit companion feedback. The final landing opens the celebration rather than creating another question.

## Wider island and longer ocean gaps

The island is approximately twice as wide in the opening composition, with its vertical proportions adjusted to keep the question and distant beach separate from the landing choices. Rows of stepping stones are now 14 world units apart instead of 7. Upcoming platforms are enlarged again to compensate for the additional distance, with larger answer type and wider desktop lane spacing. Jump paths, camera tracking, answer hit areas, and review states use the same new spacing.

## Natural island and readable questions

Replaced the illustrated island, castle, and rainbow with an AI-generated photorealistic tropical island cutout: low green hills, palms, sand, and rocky shoreline. The original asset is `island-realistic-v1.png`; it is embedded in the HTML so the existing single-file staging build includes it. Generated with the built-in imagegen tool. Prompt: photorealistic broad low tropical island, sea-level view, long horizontal sandy shoreline, lush palms and jungle, weathered rocks, natural daylight, transparent background, no rainbow, castle, text, people, or plane.

The question now has an opaque dark panel with larger high-contrast lettering. Platform rows are 18 world units apart; lateral choices are spaced farther apart. A silver plane travels from right to left and pauses with ocean motion. The island is static photographic-style scenery; the character, platforms, water, and plane retain their animated game rendering.
