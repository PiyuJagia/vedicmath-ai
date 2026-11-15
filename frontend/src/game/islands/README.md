# Islands of Courage app integration

Prepared on `feature/integrate-islands-of-courage` from production commit `a520f6e`. Game source/artwork come from the tested standalone game at `6ff5dc8` on `feature/treasure-trail-mockups`.

## Behavior

- Replaces the Treasure Trail card label with Islands of Courage under Play to Win.
- Opens `/play/islands?level=beginner|intermediate|advanced` for Nikhilam.
- Uses the existing `isGameUnlocked` checks for each Nikhilam practice level, including the existing admin bypass. Passing another Sutra does not unlock it. Direct links to locked levels show the appropriate practice link and do not load the game.
- The app owns level selection; the embedded game has no independent difficulty selector or review-state buttons. Opening its static HTML directly redirects through the app's guarded route.
- Earned game badges are saved separately as `vedicmath-ai:islands-of-courage` in browser localStorage. They never grant practice mastery. Completion messages are checked for origin, iframe window, active difficulty, complete leap count, and valid multiplication.
- All three worlds, forward jumps, post-landing camera movement, wave/rock animation, wildlife, and the local sound controls are preserved. Reduced motion follows the app setting.
- Ask Rishi opens a coach panel inside the game, including in full screen. It uses the app's existing agent session and chat API, with world, puzzle, base, step, and local answer feedback. Learners can request explanations or type questions. Replies never execute game actions. Late replies for previous steps are ignored. Disabled or offline coaching does not block play. AI calls are learner initiated.

## Packaging

The reviewed canvas game is isolated in a same-origin iframe under `frontend/public/games/islands-of-courage/`. HTML, CSS, JavaScript, and original PNG artwork are separate files. Nothing is embedded into the app JavaScript bundle. A world loads its required artwork only when opened, and shared artwork can be cached between worlds. Game asset prompts and provenance are in `ASSET-CREDITS.md` in that directory.

The game keeps the approved prototype's local deterministic puzzle bank. Its calculations were checked against direct multiplication and the Python Nikhilam engine during prototype validation. It does not add backend endpoints or depend on backend readiness to play. The existing app agent can still connect in the background through its unchanged provider.

## Existing coach-context defect found during verification

The untouched production source stalls its practice screen tests: `LiveCoachAsk` updates context in an effect, while the provider previously created a new patch callback and a new context object for every identical patch. This change stabilizes the callback and returns the current context for identical values. No agent prompts, SDK behavior, tools, API contracts, or backend code are changed. A regression test verifies repeated inline patches settle and genuinely changed context still propagates.

## Verification

- TypeScript and Vite production build pass.
- 182 frontend tests pass, including existing coach and practice tests plus new unlock/badge/context regression coverage.
- Five Playwright integration checks pass: locked card/direct URL/standalone redirect; full Beginner victory and retry with unchanged mastery; Intermediate and Advanced victories via the existing admin bypass; all three mobile worlds without clipped options; agent context and continued play during an agent outage. A separate component regression checks foreign-message rejection and late-response suppression.
- Browser tests mock existing coach HTTP responses to avoid provider costs and backend cold-start dependence. They do not claim to validate the live LLM service.
- App screenshots are captured separately for review. Number Rocket remains accessible after exiting the game.

## Release

Merge to main only after review and approval. Existing Render static-site rewrites already support the new `/play/islands` route. No environment or compute-plan changes are needed. Both existing Render services track main, so a merge can trigger both deployments even though backend code is unchanged. Reverting the integration commit restores the previous card and routes.
