# Live Rishi throughout VedicMath AI — delivery report

**Branch:** `feature/live-rishi-coach`  
**Date:** 2026-11-15  
**Status:** Local integration complete; production Render deploy **not claimed** (requires merge + deploy + live public verification).

## 1. Files changed (this effort)

### Frontend
- `frontend/src/services/liveCoach.ts` — shared ADK ask + intents
- `frontend/src/services/LiveCoachContext.tsx` — provider (session, history, debounce, events)
- `frontend/src/app/Providers.tsx` — wraps `LiveCoachProvider`
- `frontend/src/api/coachClient.ts` — `isLiveCoachEnabled` default ON; kill switch `VITE_COACH_LIVE=false`
- `frontend/src/api/coachTypes.ts` — learning screens + persona/progress fields
- `frontend/src/components/coach/LiveCoachAsk.tsx` — uses provider (not a second chat stack)
- `frontend/src/pages/lesson/TheoryPage.tsx` — live lesson start / explain / why
- `frontend/src/pages/lesson/LearnMorePage.tsx` — LiveCoachAsk; frame.rabbit stays deterministic
- `frontend/src/pages/practice/PracticePage.tsx` — live feedback / struggle / rabbit / complete
- `frontend/src/pages/OnboardingPage.tsx` — live welcome
- `frontend/src/pages/ExplorePage.tsx` / `PlayPage.tsx` / `ProgressPage.tsx` — live Hummingbird encourage
- `frontend/src/game/rocket/RocketPage.tsx` / `CoachVisit.tsx` — live rocket visit over engine facts
- `frontend/src/pages/coach/CoachHandoffPage.tsx` — copy updated

### Backend / docs
- `backend/agents/vedic_math_coach/handoff/schemas.py` + `context.py` — screens/persona/progress_note
- `backend/agents/vedic_math_coach/observability/langsmith.py` — do not restore `LANGSMITH_PROJECT`
- `.env.example` — `VITE_COACH_LIVE` kill switch docs
- `docs/learner-memory-design.md` — honest memory milestone
- `reports/Live-Rishi-Coach-Surface-Inventory.md` — Phase 1 audit (prior)
- `reports/Live-Rishi-Coach-Delivery.md` — this file

## 2. Screens integrated (live ADK path)

| Screen | Live behaviour |
|---|---|
| Onboarding | Welcome via agent |
| Explore | Hummingbird encourage (non-sample progress) |
| Theory | Lesson start + explain/why + Ask Rishi |
| Learn More | Ask Rishi; `frame.rabbit` remains lesson copy |
| Practice | Feedback / struggle / Rabbit hint / level complete + Ask Rishi |
| Play | Hummingbird encourage |
| Number Rocket | Coach visit upgraded from engine-fact template |
| Progress | Hummingbird encourage (skips sample data) |
| Coach handoff (dev) | Same `/coach/chat` |

## 3. Still scripted (intentionally)

| Content | Why |
|---|---|
| Animation `frame.state` / `frame.coach` / `frame.rabbit` | Deterministic lesson narration (class 2) |
| Practice `HintBubble` engine hint ladder text | Disclosure limits (class 2); Rabbit **also** speaks live |
| UI labels, unlock copy, empty-answer prompts | Static instructions (class 3) |
| Rocket `birdLine` / engine fact templates | Deterministic game facts; live visit overlays when available |
| `demoCoach` module | Kept for unit tests / offline fallback reference — **not** wired on product pages |

When live fails, engine feedback remains visible and is labeled scripted (`demo` tag). No silent “fake Live AI.”

## 4. Actual agent call path

```
UI event / Ask Rishi
  → LiveCoachProvider.ask / triggerEvent
  → askLiveCoach (intent + CoachLearningContext)
  → sendCoachChat → POST /api/coach/chat
  → handoff/api.py → runtime ADK Runner
  → Google ADK root_agent (Rishi) + tools
  → Gemini (gemini-3.8-flash)
  → LangSmith agent addressing → project vedicmath-ai-rishi-local (local)
```

Math authority stays on Python tools / practice engine / rocket engine.

## 5. Persistent memory — status

| Capability | Status |
|---|---|
| Same-tab chat history | `sessionStorage` |
| ADK session | In-memory per process |
| Local progress | `localStorage` ProgressContext |
| Durable Postgres mastery | **Not implemented** — no Render Postgres + no real auth |
| Cross-device memory | **Not claimed** |

See `docs/learner-memory-design.md`. Safest milestone shipped; display name ≠ authentication.

## 6. LangSmith

- Working destination: agent env `local` → `vedicmath-ai-rishi-local`
- Do **not** restore conflicting `LANGSMITH_PROJECT` at configure time
- Live smoke turns exercised locally against `/coach/chat` (Theory welcome, incorrect Nikhilam feedback, Rabbit hint)

Recent inspectable runs (project `vedicmath-ai-rishi-local`):

- Gemini (Rabbit hint turn): https://smith.langchain.com/o/4de6c7ec-2c03-4d02-8354-2efdd95a7d22/projects/p/01a1df92-f799-75ce-b7a9-b981e311058a/r/01a1e01c-b3b5-7e0d-9c8c-02ab26726769?trace_id=01a1e01c-a6cf-7896-9153-55dd1000260e&start_time=2026-11-15T16:48:59.829147
- Tool `get_progressive_hint`: https://smith.langchain.com/o/4de6c7ec-2c03-4d02-8354-2efdd95a7d22/projects/p/01a1df92-f799-75ce-b7a9-b981e311058a/r/01a1e01c-b3af-743b-8bd1-aa0542309915?trace_id=01a1e01c-a6cf-7896-9153-55dd1000260e&start_time=2026-11-15T16:48:59.823664
- Gemini (prior turn in same trace): https://smith.langchain.com/o/4de6c7ec-2c03-4d02-8354-2efdd95a7d22/projects/p/01a1df92-f799-75ce-b7a9-b981e311058a/r/01a1e01c-a6dc-76d4-a4b5-3244c9a58832?trace_id=01a1e01c-a6cf-7896-9153-55dd1000260e&start_time=2026-11-15T16:48:56.540212

These came from HTTP `/coach/chat` smoke matching the UI path (same API). Full browser E2E traces on public Render are still pending.

## 7. Integration test results

| Check | Result |
|---|---|
| `frontend` `npm run build` | Pass |
| Vitest coach handoff tests | 14 passed |
| `POST /coach/sessions` + `/coach/chat` (port 8001) | Pass — Rishi + Rabbit personas |
| Public Render E2E | **Not run / not claimed** |

Note: local port 8000 had a stale process serving API `0.4.0` without coach routes; smoke used **8001**. Vite proxy may need `VITE_PROXY_TARGET=http://127.0.0.1:8001` until 8000 is clean.

## 8. Git

- Branch: `feature/live-rishi-coach` (includes merge of `origin/main` Number Rocket)
- Commit: `ad8a4c8` — Wire live Rishi across the learner journey via shared LiveCoach and `/coach/chat`
- Not pushed / not merged to `main` / not deployed to Render in this pass

## 9. Render deployment

**Not completed.** Blockers / requirements:
1. Merge feature branch via normal review (preserve parallel RAG/eval work)
2. Deploy backend + frontend from compatible commits
3. Production LangSmith env = `production` (still no `LANGSMITH_PROJECT` dual-destination)
4. Confirm public site returns live Rishi replies (not only local)

## 10. Remaining blockers

1. **Auth + Postgres** required for durable multi-user learner memory
2. **Port 8000 stale servers** locally can hide `/coach` — ops hygiene
3. **Production credentials / Render push** not performed in this pass
4. Full Playwright learner journey against public Render still pending
