# Islands of Courage

Play: https://treasure-trail-staging.onrender.com

A standalone three-world Nikhilam adventure. Source branch: `feature/treasure-trail-mockups`. Separate Render service: `treasure-trail-staging`. This branch automatically deploys the staging game; production main and the app’s frontend/backend services are separate.

## Worlds

| Level | World | Experience | Maths |
| --- | --- | --- | --- |
| Beginner | Sapphire Sea | Realistic ocean, dolphin, reef fish, distant island | Positive shortfalls below 100; six questions |
| Intermediate | Ember Keep | Lava ocean, distant dragons, warm-lit castle | Signed deviations and near-1000 examples; six questions |
| Advanced | Sky Citadel | Floating rocks above clouds, storm and lightning, distant citadel | Mixed-sign deviations, carrying and borrowing; eight questions |

All worlds retain Rishi’s rear-facing cream outfit and lavender sash. The plane was removed. Controls use the app’s lavender, teal, white, and navy palette.

## Movement

Selecting an answer jumps Rishi toward that rock in world space. The camera holds still throughout the 1.2-second jump, making Rishi visibly travel away from the starting platform and become smaller with perspective. After a correct landing, a separate 0.7-second camera move catches up; the next question appears when that move completes. Wrong choices cause a fall and game over. Retry starts a different puzzle in the selected level.

Destinations begin farther away and grow continuously with camera progress. Rock dimensions remain consistent in world space. Rock height, tilt, Rishi’s standing height, and answer-label placement use the same wave field. The visible animated water-crest overlay is projected from that field too. Backdrops are photographic-style assets with procedural overlays; this is an artistic water model rather than a fluid simulation. Advanced uses cloud drift instead of water crests.

## Maths and controls

Deviations follow the Python engine convention `base - number`. Carrying and borrowing use floor division to normalize the right part to `[0, base)`. All 13 puzzle examples agree with direct multiplication and `backend.nikhilam.build_nikhilam_steps`. This staging prototype calculates locally; it does not call the production backend or save learner badges or progress.

Direct URLs accept `?level=beginner`, `?level=intermediate`, or `?level=advanced`. Switching level restarts the crossing. Review buttons open start, crossing, game-over, and destination scenes.

Sound is off until enabled. Advanced-world thunder uses local Web Audio synthesis. Pause motion freezes the environment and disables lightning; reduced-motion preferences select paused motion on load. Answer-selected jumps and camera transitions still complete so the game remains playable. Backgrounding the tab suspends audio.

Open index.html directly for offline play. The PNG artwork is embedded in the HTML to match the existing single-file staging build, so initial download size is larger than a page that streams assets individually. Original assets and built-in imagegen prompt briefs are listed in [asset-prompts.md](asset-prompts.md).

## Validation

`qa.cjs` uses Playwright Chromium. Set `PLAYWRIGHT_MODULE` if Playwright is installed elsewhere. `TRAIL_URL` selects a hosted version; default is adjacent local HTML. `TRAIL_SCREENSHOT_DIR` selects a screenshot directory. `CAPTURE_ONLY=1` performs camera/wave-field assertions and desktop/mobile layout checks without replaying every question.

Checks cover all 13 independently calculated puzzles, unique choices, all three full winning journeys, next-question transitions after landing, game over and fresh-puzzle retries, sound/motion controls, lightning rendering, eight asset loads, mobile answer placement, and JavaScript errors. Camera checks assert that Rishi’s world depth changes while camera depth stays fixed mid-jump, that the camera catches up after landing, and that the shared wave field determines the platform height.
