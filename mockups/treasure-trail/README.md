# Treasure Trail staging game

Play: https://treasure-trail-staging.onrender.com

Source branch: `feature/treasure-trail-mockups`. Separate Render static site: `treasure-trail-staging`. Changes to this branch update that staging site automatically. Production main and its frontend/backend services are separate.

## Levels

| Level | Environment | Maths |
| --- | --- | --- |
| Beginner | Daylight, realistic rolling ocean | Positive shortfalls below 100; six questions |
| Intermediate | Night storm, rain, lightning, optional thunder | Above-base signed deviations and near-1000 examples; six questions |
| Advanced | Darker storm, stronger swells and shaking, longer gaps | Mixed-sign deviations, carrying and borrowing; eight questions |

Every answer is on a separate rock. Selecting it jumps Rishi towards that rock. Correct landings reveal the next question and three new choices. Wrong answers animate a fall and game over; retry generates a different puzzle in the same level. Winning awards a preview badge. Badges are not saved to a profile.

Deviations follow the existing Python engine convention, `base - number`. The game explicitly teaches the convention in intermediate and advanced questions. Normalization uses floor division so negative right parts correctly borrow from the left. The final result agrees with direct multiplication and with the project’s Python Nikhilam engine for all 13 puzzle-bank examples.

The maths remains local to this standalone staging prototype; it does not call the production backend or modify learner progress. Difficulty selections are reflected in the URL (`?level=beginner`, `?level=intermediate`, or `?level=advanced`) for direct testing. Changing level restarts that crossing.

## Visuals and controls

Rishi, natural rock platforms, the ocean, and the island use realistic generated artwork. Wave overlays, rock bobbing and tilt, character balance, jumps, rain, a right-to-left plane, and occasional lightning remain animated. Sound is off until enabled; thunder is synthesized locally through Web Audio. Pause motion freezes the environment and disables lightning; initial reduced-motion preferences select paused motion. The explicit answer-selected jump still completes so the game remains playable. Backgrounding the tab suspends audio.

The bottom buttons open review states. Open `index.html` directly for an offline version. Images are embedded, so no server or dependency installation is needed to play it. Initial HTML download is larger because it includes all artwork.

See [asset-prompts.md](asset-prompts.md) for original asset paths and prompt briefs; generated with the built-in imagegen tool.

## Validation

`qa.cjs` uses installed Playwright Chromium. Set `PLAYWRIGHT_MODULE` to a local `@playwright/test` module path if it is not installed in normal Node resolution. `TRAIL_URL` optionally selects a hosted version; default is the adjacent local HTML. `CAPTURE_ONLY=1` checks and captures desktop/mobile layouts without repeating full gameplay.

Full checks cover independent calculations across all 13 puzzles; unique answer choices; all three full winning journeys; automatic next-question transitions; game over and different-puzzle retries; sound/motion controls; lightning rendering; asset loading; mobile answer placement; and browser JavaScript errors. A separate Python comparison verified the puzzle bank against `backend.nikhilam.build_nikhilam_steps`.
