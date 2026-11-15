# Claude handoff — Live Rishi frontend integration

**Purpose:** Synchronize Claude onto the latest completed live-Rishi work.  
**Scope of this document:** Git state, architecture, and verification only.  
**Do not** treat this branch as already deployed production.

---

## A. Repository state

| Item | Value |
|---|---|
| Remote | `https://github.com/PiyuJagia/vedicmath-ai.git` |
| Working branch (handoff) | `feature/live-rishi-coach` |
| Feature branch URL | https://github.com/PiyuJagia/vedicmath-ai/tree/feature/live-rishi-coach |
| Latest local tip before push of this doc | `939ba2f` (app work + delivery report) |
| Inventory report | `reports/Live-Rishi-Coach-Surface-Inventory.md` (post-integration) |
| Delivery report | `reports/Live-Rishi-Coach-Delivery.md` |

### Branch relationships (as of handoff)

| Branch | Role |
|---|---|
| `origin/main` @ `5bc3905` | Production deploy source; includes Number Rocket (PR #2). **Does not** include live Rishi product wiring. |
| `feature/live-rishi-coach` | **Latest live Rishi frontend + shared LiveCoach integration.** Merged `origin/main` Number Rocket at `fbd79c4`, then live coach commits `ad8a4c8` / `939ba2f` (+ this handoff commit). |
| `release/production-langsmith-20261115` @ `6247652` | LangSmith / production-candidate packaging and credential-blocker documentation. Ancestor of the feature branch, not the live-UI tip. |
| `review/vedicmath-pre-submission` @ `6cae0e7` | Pre-submission audit snapshot. |
| `origin/claude/project-thread-*` | Separate Claude threads; do not overwrite without inspection. |

**Merge-base** of `feature/live-rishi-coach` and `origin/main`: `5bc3905` (feature is ahead of main with live-coach work; not behind main).

---

## B. Implemented functionality

### Completed on `feature/live-rishi-coach`

- Shared `LiveCoachProvider` + `askLiveCoach` → `POST /coach/chat`
- Live coaching default **ON**; emergency kill `VITE_COACH_LIVE=false`
- Theory: lesson start / explain / why + Ask Rishi
- Practice: feedback / struggle / Rabbit hint persona / level complete + Ask Rishi
- Learn More: Ask Rishi (frame rabbit/state remain deterministic)
- Onboarding welcome; Explore / Play / Progress Hummingbird encourage (non-sample)
- Number Rocket coach visit upgraded when live enabled
- Handoff schemas: screens, persona, progress_note, check_status
- LangSmith: do not restore conflicting `LANGSMITH_PROJECT` at configure time
- Honest memory milestone doc (no durable Postgres/auth claimed)

### Verified locally (not production)

- Frontend production build
- Coach-related Vitest (handoff page / client)
- Live `POST /coach/sessions` + `/coach/chat` smoke (Rishi + Rabbit)
- LangSmith traces in project `vedicmath-ai-rishi-local` (see delivery report)

### UI surfaces using actual live Rishi (feature branch)

Onboarding, Explore, Theory, Learn More (Ask), Practice, Play, Progress, Rocket coach visit, Coach handoff harness — when live flag is on and backend `/coach/chat` is reachable.

### Still scripted / deterministic (intentional)

- Animation narration: `frame.state`, `frame.coach`, `frame.rabbit`
- Practice engine prompts + progressive hint **ladder text** in `HintBubble`
- Static UI unlock / empty-answer / chrome copy
- Rocket engine-fact template until live reply arrives
- `frontend/src/services/coach.ts` **`demoCoach`** — **tests-only** (e.g. `content/why.test.ts`); product pages use `useLiveCoach`

### Known limitations

- No durable multi-user learner memory (InMemory ADK sessions + browser storage)
- Display name ≠ authentication
- Local port `8000` has been observed serving stale API without `/coach`; use a fresh uvicorn or `VITE_PROXY_TARGET`
- **Production Render still serves `main`, which still shows scripted Theory coach**

---

## C. Important architecture

1. **One Google ADK agent** (`backend/agents/vedic_math_coach/agent.py`) with personas **Rishi / Rabbit / Hummingbird**.
2. **Gemini** via ADK (model family used in connectivity: `gemini-3.8-flash`).
3. **FastAPI** coach routes: `backend/agents/vedic_math_coach/handoff/api.py` — `/coach/sessions`, `/coach/chat`, calculations/animations/handoff.
4. **Deterministic ownership:** maths engines, practice check, hint disclosure limits, animation timelines, game unlocks — never Gemini-invented.
5. **LangSmith:** `configure_google_adk` agent addressing → local project `vedicmath-ai-rishi-local`; keep `LANGSMITH_PROJECT` from dual-destination conflict.
6. **Session/memory:** ADK `InMemorySessionService`; chat history `sessionStorage`; progress `localStorage`. See `docs/learner-memory-design.md`.

---

## D. Outstanding issue (user-reported)

**Symptom:** Production Nikhilam Theory page still shows **"Scripted demo coach, not live AI"** (or equivalent demo tag).

**Likely cause:** Deployed app tracks **`main`**, which does **not** contain the live LiveCoach product wiring. That wiring lives on **`feature/live-rishi-coach`**. Until that branch is reviewed, merged, and both frontend + backend are redeployed with compatible `/coach/chat` contracts, production will continue to serve the scripted Theory/Practice coach path.

Do **not** claim production is fixed by pushing this feature branch alone.

---

## E. Instructions for Claude

1. **Inspect `feature/live-rishi-coach` first** (latest remote SHA after this handoff push). Do not start from stale `main` Theory/Practice alone.
2. **Do not rebuild** LiveCoach / `/coach/chat` / persona mapping from scratch if already present.
3. **Work on a new branch** based on the latest `feature/live-rishi-coach` tip (e.g. `fix/live-rishi-theory-demo-tag` or similar).
4. **Do not merge to `main`** and **do not deploy** independently.
5. Preserve Number Rocket, deterministic engines, LangSmith setup, eval/RAG parallel work.
6. If fixing the production demo-tag UX: confirm whether the remaining label is (a) undeployed feature branch, (b) kill-switch env, (c) failed live call falling back with `demo` tag, or (d) deterministic lesson caption incorrectly labeled.

---

## F. Verification (local feature branch)

```powershell
# Backend with current code (avoid stale :8000)
cd <repo>
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8001

# Frontend (proxy to 8001 if needed)
cd frontend
$env:VITE_PROXY_TARGET="http://127.0.0.1:8001"
npm run dev
```

Manual checks:

1. Open Theory for Nikhilam → main Rishi bubble should **not** permanently show scripted-demo branding once a live reply arrives (`demo={!shown.isLive}`).
2. Use **Ask Rishi** → network `POST /api/coach/chat` 200 with agent text.
3. Practice: submit wrong answer → live feedback; tap Rabbit → live hint persona (ladder text may still show in HintBubble).
4. LangSmith: traces under `vedicmath-ai-rishi-local` for those turns.

Optional API smoke:

```powershell
$session = Invoke-RestMethod http://127.0.0.1:8001/coach/sessions -Method POST
$body = @{ session_id=$session.session_id; message="Greet briefly as Rishi for Nikhilam theory."; context=@{ screen="theory"; sutra_id="nikhilam"; difficulty="beginner" } } | ConvertTo-Json -Depth 5
Invoke-RestMethod http://127.0.0.1:8001/coach/chat -Method POST -Body $body -ContentType "application/json"
```

---

## Key files for Claude

| Path | Notes |
|---|---|
| `frontend/src/services/LiveCoachContext.tsx` | Shared provider |
| `frontend/src/services/liveCoach.ts` | Intents → `/coach/chat` |
| `frontend/src/api/coachClient.ts` | `isLiveCoachEnabled`, session, chat |
| `frontend/src/components/coach/LiveCoachAsk.tsx` | Ask UI via provider |
| `frontend/src/pages/lesson/TheoryPage.tsx` | Live Theory |
| `frontend/src/pages/practice/PracticePage.tsx` | Live Practice |
| `frontend/src/services/coach.ts` | `demoCoach` tests-only |
| `backend/agents/vedic_math_coach/agent.py` | ADK root agent |
| `backend/agents/vedic_math_coach/handoff/api.py` | Coach HTTP API |
| `backend/agents/vedic_math_coach/observability/langsmith.py` | Tracing |
| `reports/Live-Rishi-Coach-Surface-Inventory.md` | Post-integration inventory |
| `reports/Live-Rishi-Coach-Delivery.md` | Delivery + LangSmith URLs |
