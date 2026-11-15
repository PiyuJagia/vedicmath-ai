# Live Rishi Coach — Frontend Surface Inventory

**Scope:** Visible coach / Rabbit / Hummingbird / Rishi dialogue and coaching text under `frontend/src` (current branch).  
**Date:** 2026-11-15  
**Code changes:** None (inventory only).

## Classification legend

| Class | Meaning |
|---|---|
| **1 — Agent-generated conversational** | Persona chat / coaching talk that is scripted today and is a candidate to become (or already is) live ADK chat. |
| **2 — Deterministic mathematical / lesson content** | Grounded in backend lesson numbers, frame narration, or check results; keep scripted. |
| **3 — Static UI instructions** | Labels, chrome, help notes, unlock copy; keep. |

---

## How live coaching is gated today

### `demoCoach` (always on product paths)

- **File:** `frontend/src/services/coach.ts`
- Deterministic `CoachService`. Every reply sets `isDemo: true`.
- Used by **Onboarding**, **Theory**, and **Practice** for the main Rishi bubble (welcome / explain / explain_again / why / feedback / complete).
- Does **not** call the backend chat API. For Theory `explain`, it mostly echoes `frame.coach` from narration. For Practice `feedback`, it wraps `feedbackText(...)` from `content/practice.ts`.

### `isCoachHandoffEnabled(role)` (feature gate)

- **File:** `frontend/src/api/coachClient.ts`
- Returns `true` when any of:
  1. `VITE_COACH_HANDOFF === 'true'`
  2. `import.meta.env.DEV` (local Vite)
  3. `role === 'admin'`
- Gates:
  - **`LiveCoachAsk`** on Theory and Practice (`liveCoach && <LiveCoachAsk … />`)
  - Entire **`CoachHandoffPage`** (dev harness); gated page shows a “not available” message otherwise

### `sendCoachChat` (live path)

- **File:** `frontend/src/api/coachClient.ts` → `POST /coach/chat`
- Used by:
  - `LiveCoachAsk` (Theory / Practice ask box)
  - `CoachHandoffPage` (full transcript harness)
- Session via `ensureCoachSession()` → `POST /coach/sessions`; history in `sessionStorage`.

### Parallel surfaces (important)

| Surface | Speaker bubble | Live ask |
|---|---|---|
| Theory | Scripted `demoCoach` + `demo` tag on bubble | Optional `LiveCoachAsk` if flag |
| Practice | Scripted `demoCoach` + `demo` tag | Optional `LiveCoachAsk` if flag |
| Learn More | Rabbit = `frame.rabbit` only | No live ask |
| Coach handoff | Live `sendCoachChat` replies | Full live chat (flagged) |

Scripted lesson coach and live Ask can appear **side by side** when the flag is on. Bubble demo tag: *“Lesson coach (scripted) · Ask Rishi for live help”* (`Characters.tsx`).

---

## Inventory by surface

### 1. Practice — `frontend/src/pages/practice/PracticePage.tsx`

| Instance | Speaker | Snippet / behaviour | Class |
|---|---|---|---|
| Main coach bubble | Rishi (`boy`) | Prompt + feedback via `demoCoach` (`feedback` / `complete`); e.g. complete: *“You solved … one step at a time. Wonderful work!”* | **1** (wrapper) + **2** (prompt/feedback body) |
| Empty-answer line | Rishi | *“Type your answer first, then press Check.”* | **3** |
| Hint bubble | Rabbit (via `HintBubble`) | `text.hints[level-1]` from `content/practice.ts` | **2** |
| Hint note | UI | *“Stuck? Tap the rabbit or press Hint…”* | **3** |
| Rabbit affordance | Rabbit | `aria-label` *“Ask the rabbit for a hint”* | **3** |
| Level-complete line | Hummingbird (visual) + copy | *“Level passed! … games are unlocked.”* | **3** |
| `LiveCoachAsk` (gated) | Rishi / Rabbit / Hummingbird from API | Live replies; UI: *“Ask Rishi”*, *“Live tutor · same session…”* | **1** (already live when gated) |
| Step line / picker errors | UI | *“Step N of M: …”*, *“Please enter whole numbers.”* | **3** |

**Sources wired into Practice coach text**

- `demoCoach.respond({ intent: 'feedback' | 'complete' })` → `services/coach.ts`
- Prompts / hints / `feedbackText` → `content/practice.ts` (**2**)

---

### 2. Theory — `frontend/src/pages/lesson/TheoryPage.tsx`

| Instance | Speaker | Snippet / behaviour | Class |
|---|---|---|---|
| Frame coach line | Rishi | `demoCoach` `explain` → `frame.coach` (from narration) | **2** (content) via **1** wrapper |
| Explain again | Rishi | *“Let me say it another way. {frame.state} {frame.coach}”* | **1** (rephrase scaffolding) over **2** |
| Why does this work? | Rishi | `{idea} Watch the example step by step…` | **1** (scaffolding) + **2** (`idea` from lessons) |
| Idea card | UI / lesson | `level.idea` from `content/lessons.ts` | **2** |
| Example state line | UI | `{stepTitle}. {frame.state}` | **2** |
| Coach action buttons | UI | *“Explain again”*, *“Why does this work?”* | **3** |
| `LiveCoachAsk` (gated) | Live personas | Same as Practice | **1** (live when gated) |
| Demo tag on bubble | UI | *“Lesson coach (scripted) · Ask Rishi for live help”* | **3** |

---

### 3. Let's Learn More — `frontend/src/pages/lesson/LearnMorePage.tsx`

| Instance | Speaker | Snippet / behaviour | Class |
|---|---|---|---|
| Rabbit dialogue | Rabbit | `frame.rabbit` every frame (narration) | **2** |
| Step explanation | UI | `frame.state` under step title | **2** |
| Hummingbird | Visual only | Celebrates on last frame; no speech | — |
| Nav CTAs | UI | *“Next: Practice with Coach”*, example tabs | **3** |

No `demoCoach`, no `LiveCoachAsk`.

---

### 4. Narration library (feeds Theory coach + Learn More rabbit + a11y state)

**File:** `frontend/src/content/narration.ts`  
Built into timelines by `animation/sutras/{nikhilam,urdhva,ekadhikena}.ts`.

| Channel | Role | Examples | Class |
|---|---|---|---|
| `coach` | Rishi teaching line (Theory; Practice stage a11y via `state`) | *“Let's multiply {a} by {b} the Nikhilam way.”*; *“Multiply the linked digits.”*; Ekadhikena often uses backend `explanation` | **2** |
| `rabbit` | Learn More visual helper | *“These two tiles are the numbers we will multiply…”*; *“The amber token is the carry…”* | **2** |
| `state` | Math truth / text alternative | *“Base − A: 100 − 98 = −2.”* | **2** |

---

### 5. Practice wording — `frontend/src/content/practice.ts`

| Instance | Snippet | Class |
|---|---|---|
| `questionText` prompts | e.g. *“What is the deviation of {n}? Remember: base − number.”* | **2** |
| Three hint levels per key | e.g. *“Work out 100 − 98.”* | **2** |
| `feedbackText` | *“Yes! … is right.”*; *“So close! Check the sign…”*; *“Not quite. Have another look…”* | **2** (deterministic coaching; correctness from backend check) |

---

### 6. Scripted coach service — `frontend/src/services/coach.ts`

| Intent | Snippet | Class | Used on |
|---|---|---|---|
| `welcome` | *“Namaste… I am Rishi, your coach…”* | **1** | Onboarding |
| `explain` | `frameLine` / `idea` / fallback *“Let us look at this together.”* | **2** / fallback **1** | Theory |
| `explain_again` | *“Let me say it another way…”* | **1** | Theory |
| `why` | *“…Watch the example step by step…”* | **1** | Theory |
| `ask` | question prompt / *“What do you think comes next?”* | **2** / fallback **1** | (API present; Practice builds prompt inline) |
| `hint` | *“Here is a hint. Take your time.”* | **1** | Defined; Practice uses rabbit hints instead |
| `feedback` | delegates to `feedbackText` | **2** | Practice |
| `complete` | *“You solved … Wonderful work!”* | **1** | Practice |

---

### 7. Live ask UI — `frontend/src/components/coach/LiveCoachAsk.tsx`

| Instance | Snippet | Class |
|---|---|---|
| Toggle / heading | *“Ask Rishi”* / *“Hide Rishi”* | **3** |
| Note | *“Live tutor · same session across Theory & Practice · maths verified by Python tools”* | **3** |
| Placeholder / errors | *“Ask Rishi…”*, *“Connecting…”*, *“Coach session unavailable.”* | **3** |
| Reply bubble | `response.message.text` via `sendCoachChat` | **1** (live) |
| Speaker figures | Maps API `boy_coach` → Rishi; rabbit; hummingbird | — |

Mounted only when `isCoachHandoffEnabled(settings.role)` on Theory/Practice.

---

### 8. Coach handoff harness — `frontend/src/pages/coach/CoachHandoffPage.tsx`

| Instance | Snippet | Class |
|---|---|---|
| Gated empty state | *“This development surface is available in local development…”* | **3** |
| Lede | *“Talk with the Google ADK Coach… Theory and Practice still use the scripted demoCoach.”* | **3** |
| Chat history / latest bubble | Live `sendCoachChat` / handoff message text | **1** (live) |
| Starter hint | *“Try: What is 98 × 97 with Nikhilam beginner?”* | **3** |
| Stage captions | Timeline `state` when animation opens | **2** |

---

### 9. Number Rocket / Play games — `frontend/src/pages/PlayPage.tsx`

No separate Number Rocket page; games live on Play.

| Instance | Speaker | Snippet | Class |
|---|---|---|---|
| Unlock dialogue | Hummingbird | *“{Sutra} {Level} games are unlocked. Great practising!”* / *“Pass … practice to unlock these games.”* | **1** (companion status; low priority for ADK) |
| Game blurbs | UI | Number Rocket: *“Solve problems to lift your rocket higher.”*; Treasure Trail / Math Detective similar | **3** |
| Lock / footer | UI (+ Rabbit visual) | *“Pass … practice to unlock”*; *“Games will use maths from the Python engine…”* | **3** |
| Status pills | UI | *“Unlocked”*, *“Game coming soon”* | **3** |

---

### 10. Progress — `frontend/src/pages/ProgressPage.tsx` (+ summary)

| Instance | Speaker | Snippet | Class |
|---|---|---|---|
| Header dialogue | Hummingbird | *“You have passed N levels. Keep it up!”* / *“Pass your first Practice to start collecting badges.”* | **1** (companion; low priority) |
| Learning summary card | UI text | `learningSummary(...)` in `content/summary.ts` — progress-grounded template | **2** / **3** (deterministic summary, not chat) |
| Recommended next | UI | *“Every available Sutra is mastered. Wonderful!”* | **3** |
| Section labels | UI | Theory / Let's Learn More / Practice with Coach | **3** |

---

### 11. Explore — `frontend/src/pages/ExplorePage.tsx`

| Instance | Speaker | Snippet | Class |
|---|---|---|---|
| Journey bird | Hummingbird | *“Welcome back! {Sutra} is ready for you.”* / *“Your journey is ready to begin.”* | **1** (companion; low priority) |
| Keep going card | UI | *“Unlock more Sutras to master Vedic Math.”* | **3** |
| Sutra tips | UI | `sutra.explanation` | **2** |

---

### 12. Onboarding — `frontend/src/pages/OnboardingPage.tsx`

| Instance | Speaker | Snippet | Class |
|---|---|---|---|
| Step 1 bubble | Rishi | `demoCoach` welcome (*“Namaste… I am Rishi…”*) | **1** |
| Steps 2–4 bubbles | Rishi | *“What should I call you?”*; *“Pick an avatar colour…”*; *“Wonderful, {name}! Your journey starts with Nikhilam…”* | **1** |
| How-to list | UI | Theory / Learn More / Practice with Coach blurbs | **3** |
| Demo tag | UI | Scripted vs Ask Rishi | **3** |

No `LiveCoachAsk` on onboarding.

---

### 13. Home / Overview / Settings / Design system

| File | Visible coach text? | Notes | Class |
|---|---|---|---|
| `pages/HomePage.tsx` | Characters only (Rishi + Hummingbird art) | Marketing hero; **no** `CharacterDialogue` | — / **3** marketing |
| `pages/lesson/SutraOverviewPage.tsx` | Characters visual; section cards *“Try it yourself with hints”* | No dialogue bubble | **3** |
| `pages/SettingsPage.tsx` | Hummingbird art only | No dialogue | — |
| `pages/DesignSystemPage.tsx` | Link *“Open coach handoff”* | Dev chrome | **3** |

---

### 14. Character components & registry

**`frontend/src/characters/Characters.tsx`**

| Instance | Snippet | Class |
|---|---|---|
| Mood alt text | *“encouraging you”*, *“helping you fix a step”* | **3** (a11y) |
| Demo tag | *“Lesson coach (scripted) · Ask Rishi for live help”* | **3** |
| HintBubble chrome | *“Hint {n} of {total}”* | **3** |
| Rabbit default label | *“Ask the rabbit for a hint”* | **3** |

**`frontend/src/characters/registry.ts`**

| Identity | Role string | Screen primary speaker |
|---|---|---|
| Rishi (`boy`) | Main teacher | onboarding, home*, theory, practice, overview, coach_handoff |
| Rabbit | Visual helper and hints | learn (primary); secondary on practice / onboarding / play |
| Hummingbird | Progress companion | play, progress, explore, settings |

\*Home orchestrates Rishi as primary but does not render a dialogue bubble.

**`frontend/src/characters/CharacterContext.tsx`** — only primary may speak (except `coach_handoff`, where primary + secondary may speak one at a time).

---

### 15. Lesson idea copy — `frontend/src/content/lessons.ts`

Shown on Theory “The idea” card; also fed into `demoCoach` `why`. Examples:

- *“When both numbers are close to 100, find how far each one is from 100…”*
- *“To square a number ending in 5, multiply the part before the 5 by one more than itself…”*

**Class: 2**

---

## Summary counts (visible product surfaces)

| Class | Where it concentrates |
|---|---|
| **1 — Should become / already live conversational** | Onboarding Rishi steps; Theory explain_again/why scaffolding; Practice complete cheer; `LiveCoachAsk` + CoachHandoff (already live when gated); Hummingbird Explore/Play/Progress status lines (optional / low priority) |
| **2 — Keep deterministic lesson/math** | Full `narration.ts` coach/rabbit/state; Practice prompts/hints/`feedbackText`; Theory idea + frame lines; Learn More rabbit + state |
| **3 — Keep static UI** | Buttons, breadcrumbs, unlock copy, demo tags, Ask Rishi chrome, game blurbs, picker/validation |

## Recommended live-coach migration targets (from this inventory)

1. **High:** Theory/Practice Rishi bubble intents that are conversational wrappers (`welcome`, `explain_again`, `why`, `complete`, free-form Ask) — already partially covered by gated `LiveCoachAsk`; product path still defaults to `demoCoach`.
2. **Keep scripted:** Frame `coach` / `rabbit` / `state`, Practice step prompts & progressive hints, check-based `feedbackText`.
3. **Leave as templates unless product wants personality live:** Hummingbird Explore / Play / Progress one-liners.
4. **Do not conflate:** Rabbit Practice hints are deterministic progressive hints, not live chat (Rabbit may appear as an ADK speaker only on the live ask / handoff paths).
