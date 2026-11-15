# VedicMath AI — Architecture Inventory (Pre-Release)

**Audit date:** 2026-11-15  
**Method:** Code inspection only (no invented capabilities).  
**Repo:** `c:\Users\14042\Desktop\AI-Projects\vedicmath-ai`

---

## 1. Git context

| Item | Value |
|------|--------|
| Branch | `review/vedicmath-pre-submission` (tracks `origin/review/vedicmath-pre-submission`) |
| Tip | `6cae0e71a93db95f2ddbf4aafd49f0d08e8c4353` |
| Tip message | Prepare pre-submission review snapshot for independent audit. |
| Author / date | PiyuJagia · 2026-11-15 09:35:35 -0500 |
| Remote | `https://github.com/PiyuJagia/vedicmath-ai.git` |
| Dirty at audit | `frontend/.gitignore`, `skills-lock.json` modified; untracked `.agents/skills/langsmith-*` |

---

## 2. Frontend stack & coach UI

### Stack

| Layer | Evidence |
|-------|----------|
| React 19 + Vite 8 + TypeScript | `frontend/package.json` |
| Routing | `react-router` v8 (`BrowserRouter` / `Routes`) |
| Motion / icons / fonts | `motion`, `lucide-react`, Lora + Nunito Sans variable fonts |
| Unit tests | Vitest + Testing Library + jsdom |
| E2E | Playwright (`frontend/playwright.config.ts`, `frontend/e2e/`) |

### Key routes (`frontend/src/app/AppRoutes.tsx`)

| Path | Page |
|------|------|
| `/` | Home |
| `/onboarding` | Onboarding (minimal shell) |
| `/explore` | 16-sutra journey UI |
| `/sutras/:sutraId` | Overview |
| `/sutras/:sutraId/theory` | Theory + animation |
| `/sutras/:sutraId/learn` | Learn More animation |
| `/sutras/:sutraId/practice` | Practice with Coach |
| `/play` | Games shell (unlock UI only) |
| `/progress` | Progress |
| `/settings` | Settings |
| `/design-system` | Design system |
| `/coach-handoff` | Live ADK handoff harness |
| `*` | Not found |

### Coach UI status (dual path)

| Path | Status | Evidence |
|------|--------|----------|
| **Scripted lesson coach** | Active on Theory / Practice / Onboarding | `frontend/src/services/coach.ts` → `demoCoach`; `isDemo: true` |
| **Live ADK ask box** | Present on Theory + Practice as `LiveCoachAsk` | Calls `POST /coach/chat` via `coachClient.ts` |
| **Live gate** | On in Vite `DEV`, or `VITE_COACH_HANDOFF=true`, or admin role | `isCoachHandoffEnabled()` |
| **Handoff harness** | `/coach-handoff` for calculations / watch-animation / chat | `CoachHandoffPage.tsx` |

Lesson dialogue still uses scripted `demoCoach`. Live Rishi is an opt-in/add-on ask surface, not a full replacement of Theory/Practice narration.

Frontend lesson engines wired in UI: **nikhilam, urdhva, ekadhikena only** (`LessonSutraId` in `frontend/src/api/types.ts`). Stages: `NikhilamStage`, `UrdhvaStage`, `EkadhikenaStage`.

---

## 3. Backend stack & key endpoints

### Stack

| Layer | Evidence |
|-------|----------|
| FastAPI app | `backend/main.py` · version `0.5.0` |
| Python | `3.12.10` (`.python-version`) |
| Prod deps | `backend/requirements.txt`: FastAPI, Uvicorn, `google-adk==2.14.1`, `langsmith[google-adk]`, dotenv |
| Root `requirements.txt` | Thin (fastapi/uvicorn/pytest/httpx) — local/dev shorthand; Render uses `backend/requirements.txt` |
| CORS | `ALLOWED_ORIGINS` env (default localhost:5173) |
| Combined static+API | `backend/server.py` (`site` FastAPI) for local preview |

### Core maths / practice (`backend/main.py`)

| Method | Routes |
|--------|--------|
| Health | `GET /` |
| Nikhilam | `GET /multiply/nikhilam`, `GET /animate/nikhilam` |
| Urdhva | `GET /multiply/urdhva`, `GET /animate/urdhva` |
| Ekadhikena | `GET /multiply/ekadhikena`, `GET /animate/ekadhikena` |
| Yavadunam | `GET /multiply/yavadunam`, `GET /animate/yavadunam` |
| Ekanyunena | `GET /multiply/ekanyunena`, `GET /animate/ekanyunena` |
| Unified lesson | `GET /sutras/{sutra_name}/lesson` (all five) |
| Practice | `GET /sutras/{sutra_name}/questions`, `POST .../check`, `POST .../check-all` |

### Coach router (`prefix=/coach`, `handoff/api.py`)

| Route | Purpose |
|-------|---------|
| `POST /coach/sessions` | Mint session id + warm ADK session |
| `POST /coach/calculations` | Deterministic calc + optional watch handoff |
| `POST /coach/animations` | Resolve `watch_animation` / `open_animation` |
| `POST /coach/handoff` | Compose text + typed actions |
| `POST /coach/chat` | Live ADK turn (Gemini + tools → UI handoff) |

---

## 4. Five implemented Sutras & engines

| Sutra | Engine module | Notes |
|-------|---------------|-------|
| Nikhilam | `backend/nikhilam.py` (+ `backend/vendor/vedicpy/multiply.py` for product) | Full API + frontend lesson/animation |
| Urdhva Tiryagbhyam | `backend/urdhva.py` | Full API + frontend lesson/animation |
| Ekadhikena Purvena | `backend/ekadhikena.py` | Full API + frontend lesson/animation |
| Yavadunam | `backend/yavadunam.py` | API + practice + coach tools; **no** frontend `lessonId` / stage |
| Ekanyunena Purvena | `backend/ekanyunena.py` | API + practice + coach tools; **no** frontend `lessonId` / stage |

Practice registry: `PRACTICE_SUTRAS = ("nikhilam", "urdhva", "ekadhikena", "yavadunam", "ekanyunena")`.

Explore UI lists **16** sutra names (`frontend/src/content/sutras.ts`); only three have `lessonId`. Remaining thirteen show as coming-soon / locked journey nodes.

---

## 5. Agent framework (Rishi)

| Claim | Code support |
|-------|--------------|
| Framework | **Google ADK** (`from google.adk.agents import Agent`) — **not LangChain** |
| Entry | `backend/agents/vedic_math_coach/agent.py` → `root_agent` |
| Model id | `gemini-3.8-flash` (`config.py`; mirrored in `gemini_connectivity.py`) |
| App / agent name | `vedic_math_coach` |
| `sub_agents` | `[]` (empty; comment allows future attach) |
| Instructions | `instructions.md` (+ optional RAG addendum) |

### Tools (`tools/__init__.py` → `COACH_TOOLS`)

Always registered:

1. `calculate_sutra`
2. `get_lesson`
3. `check_practice_answer`
4. `get_progressive_hint`

Feature-flagged:

5. `search_vedic_math_knowledge` — only when `VEDIC_KNOWLEDGE_RAG` is truthy

Local ADK UI: `adk web backend/agents` (documented in `backend/agents/README.md`). Note: that README still says tools “will be attached… not connected yet” in the intro — **stale**; tools are wired.

---

## 6. Rabbit / Hummingbird

**Personas on one agent**, not separate ADK agents.

- Enum + speaker tags in `personas.py`: `[Rishi]` / legacy Boy Coach, `[Rabbit]`, `[Hummingbird]`
- Routing guidance in `instructions.md` and `suggest_persona()` heuristics for tests
- Frontend maps `boy_coach` → boy character; rabbit / hummingbird companions render separately
- Deterministic Rabbit hints can bypass LLM (`handoff/deterministic_hint.py` → `try_deterministic_rabbit_hint`)

---

## 7. MCP

**Not implemented / not used** in application code.

Repo-wide search for `mcp` / `MCP` in code/config yielded **no matches**. No MCP server, client, or tool bridge under `backend/` or `frontend/`.

---

## 8. LangSmith integration

| Aspect | Status |
|--------|--------|
| Integration | Official `langsmith.integrations.google_adk.configure_google_adk` |
| Hookup | `observability/langsmith.py` via `ensure_langsmith_tracing()` before agent construct; optional `@traceable` on `chat_turn` |
| Dep | `langsmith[google-adk]>=0.14.17` in `backend/requirements.txt` |
| Tests | `backend/tests/test_langsmith_tracing.py` |
| Eval CLI | Optional `--with-langsmith` in eval runners |

### Env vars (from `.env.example` + code)

| Variable | Role |
|----------|------|
| `LANGSMITH_TRACING` | Opt-in (`true` / `1` / …) |
| `LANGSMITH_API_KEY` | Required for enablement |
| `LANGSMITH_ENDPOINT` | Default `https://api.smith.langchain.com` |
| `LANGSMITH_AGENT_ID` | Default `vedicmath-ai-rishi` |
| `LANGSMITH_AGENT_ENVIRONMENT` | Default `local` |
| `LANGSMITH_PROJECT` | Documented optional classic fallback (unused when agent addressing set) |
| `VEDIC_TRACE_MODEL` | Optional metadata override (defaults to `gemini-3.8-flash`) |

Without API key, tracing stays off even if `LANGSMITH_TRACING=true`. Failures do not break coaching.

---

## 9. Knowledge / RAG

| Aspect | Code support |
|--------|--------------|
| Store | Curated **JSON pack** under `backend/knowledge/` (`concepts/`, `sutras/*.json`, `sources/references.json`) |
| Retrieval | Exact concept id + **lexical** scoring (`retrieval.py`) — **no** embeddings / vector DB / Pinecone in code |
| Feature flag | `VEDIC_KNOWLEDGE_RAG=1` (or true/yes/on) |
| When off | Tool returns `status: disabled`; agent omits RAG tool + instruction addendum |
| PDFs | Referenced by URL/page index in JSON + `research_notes/`; research notes say PDFs are **gitignored** — not loaded as runtime corpus |

---

## 10. Memory / persistence

| Store | Scope | Persistence |
|-------|-------|-------------|
| ADK `InMemorySessionService` | Coach conversation | Process memory only (`session.py`, `handoff/runtime.py`) |
| `_CALCULATIONS` dict | Verified calc snapshots / animation handoff | In-process (`tools/store.py`) |
| Browser `localStorage` | Progress + settings | Dev-only; explicitly not a production DB (`storage.ts`) |
| Browser `sessionStorage` | Coach session id + chat history | Tab/session (`coachClient.ts`) |

**No application database** (Postgres/SQLite/Redis) found in backend code or `render.yaml`.

Render note (platform): ephemeral filesystem — local writes would not survive deploys even if added without external storage.

---

## 11. Testing inventory

### Pytest — `backend/tests/` (25 modules)

Includes engines/QA (`test_nikhilam`, `test_practice`, `test_answer_contract`, `test_qa_*`), CORS/server, ADK setup, coach tools/chat/context/handoff/hints, knowledge pack + RAG eval, LangSmith config, teaching evals (live gated), eval infrastructure, Gemini connectivity.

Live Gemini suites gated by `VEDIC_LIVE_EVAL=1` + funded `GOOGLE_API_KEY` (`live_gate.py`).

### Offline / teaching eval package

`backend/agents/vedic_math_coach/eval/` — fixtures, rubrics, scoring, offline runners CLI:

```text
python -m backend.agents.vedic_math_coach.eval.runners.cli offline|compare|live
```

Artifacts/reports under `eval/` and `reports/Phase-7*.md`.

### Vitest — frontend unit (~dozen `*.test.ts(x)`)

Routes, API parsers, animation timeline/playback/stage QA, progress, practice, characters, UI, coach handoff page/client.

### Playwright — `frontend/e2e/`

`smoke`, `practice`, `nikhilam|urdhva|ekadhikena-animation`, `coach-handoff`, `coach-journey`, `rishi-ux-audit`, `mobile`. Default `baseURL` points at Render static site URL in config.

---

## 12. Deployment

| Service | Config source | Branch | Role |
|---------|---------------|--------|------|
| `vedicmath-ai-web` | `render.yaml` (static) | **`main`** | Frontend CDN; `rootDir: frontend`; SPA rewrite; `VITE_API_BASE=https://vedicmath-ai.onrender.com` |
| `vedicmath-ai` | Dashboard (documented in `render.yaml` comments + README) | **`main`** (per README) | FastAPI: `pip install -r backend/requirements.txt`; `uvicorn backend.main:app --host 0.0.0.0 --port $PORT` |

Blueprint intentionally **does not** define the backend service. Live Render MCP listing was not available without workspace selection at audit time; inventory above is from repo config/docs only.

---

## 13. Gaps vs product vision

Mapped to README / Explore / planned features — only where code shows absence or stub:

| Vision item | Current code reality |
|-------------|----------------------|
| Adaptive AI Coach as primary UX | Live ADK exists behind flag/DEV/admin; Theory/Practice narration still **scripted** |
| Progress tracking (durable / multi-device) | Browser `localStorage` only; coach sessions in-memory |
| Adaptive long-term memory | Explicit guardrail: no mastery/streak claims without session evidence; no durable learner model |
| 16 Sutras | Journey UI lists 16; **5** engines; **3** animated frontend lessons |
| Games / Math Lab | `/play` unlock chrome; games labeled **“Game coming soon”** — no game endpoints |
| Knowledge-backed tutoring in prod | JSON RAG implemented but **flagged off** by default |
| Sanskrit Shloka learning | Not found as a feature module |

---

## 14. Incomplete / unused / duplicated / stale pieces

| Item | Observation |
|------|-------------|
| Yavadunam & Ekanyunena | Backend + practice + coach tools complete; frontend journey nodes lack `lessonId` / stages |
| `PlayPage` games | Unlock logic real; gameplay absent |
| Dual coach systems | `demoCoach` + live `/coach/chat` coexist by design |
| `backend/agents/README.md` intro | Claims tools not connected — outdated vs `COACH_TOOLS` |
| Root vs backend requirements | Two requirement files; Render uses `backend/requirements.txt` |
| Vendored VedicPy | Broader than used (square/cube/division/etc. present; app engines are custom modules) |
| `ALL_LESSONS_OPEN = true` | Journey locks soft-disabled for lessoned sutras |
| LangSmith agent skills under `.agents/` | Present as Cursor/agent tooling; not runtime app code |
| MCP | Absent (see §7) |

---

## Quick reference diagram

```text
Browser (Vite/React)
  ├─ Scripted demoCoach ──────────► Theory / Practice dialogue
  ├─ LiveCoachAsk /coach-handoff ─► POST /coach/* ──► Google ADK Runner
  │                                      │              gemini-3.8-flash
  │                                      │              tools → engines
  │                                      └─ InMemorySessionService
  └─ /api lesson & practice ──────► FastAPI main.py
                                      ├─ nikhilam / urdhva / ekadhikena /
                                      │  yavadunam / ekanyunena
                                      └─ optional knowledge JSON (flag)

Observability: LangSmith ADK integration (env-gated)
Persistence: none durable (memory + localStorage)
MCP: none
```

---

*End of inventory. Claims limited to evidence in this repository at the audited tip.*
