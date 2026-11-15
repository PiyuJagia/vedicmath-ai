# Release Report — Production & LangSmith Integration

**Date (UTC):** 2026-11-15  
**Working branches:** `review/vedicmath-pre-submission`, `release/production-langsmith-20261115`  
**Production deploy to `main`:** **STOPPED** (credential blockers)  
**Rollback reference (current production):** `origin/main` @ `b57cc012c98f9f49e8db0c8b4443c5d0d42b206a`

---

## A. Verified application architecture

| Area | Verified reality |
|---|---|
| Frontend | React + TypeScript + Vite; routes for Sutras, theory, practice, coach handoff |
| Backend | FastAPI (`backend/main.py`) on Render Python web service |
| Agent framework | **Google ADK** (`google.adk.agents.Agent` + `Runner`) — **not LangChain** |
| LLM | Gemini Developer API — model `gemini-3.8-flash` |
| Agents | **One** ADK agent (`vedic_math_coach` / Rishi coach) |
| Personas | **Prompt personas** (Rishi / Rabbit / Hummingbird), not separate agents |
| MCP | **Not used** by the app; LangSmith ADK wrapper warns MCP tool module missing (harmless) |
| Math tools | `calculate_sutra`, `get_lesson`, `check_practice_answer`, `get_progressive_hint`; optional `search_vedic_math_knowledge` behind `VEDIC_KNOWLEDGE_RAG` |
| Sutras implemented | Nikhilam, Urdhva, Ekadhikena, Yavadunam, Ekanyunena (engines under `backend/`) |
| Memory | In-memory ADK sessions + calculation store; **no Postgres learner progress DB** |
| LangSmith | Official `configure_google_adk` + `rishi_chat_turn` `@traceable` span with privacy filters |
| RAG | Curated JSON knowledge pack; PDFs are research sources only (gitignored), not ingested |

See also: `reports/Architecture-Inventory-Pre-Release.md`.

---

## B. Code changes (release candidate)

**Release tip SHA:** see `release/production-langsmith-20261115` on GitHub after push.

Notable additions beyond review snapshot:

- Production IO redaction for custom spans (`VEDIC_LANGSMITH_REDACT_IO` / `production` env)
- LangSmith **agent-address vs `LANGSMITH_PROJECT` conflict fix** (clears env during configure)
- Eval datasets: `human_review_30.json`, `redteam_safety_50.json` + catalog entries
- Docs: `docs/langsmith-setup.md`, `docs/evaluation-plan.md`, `docs/evaluation-runbook.md`
- Skills: `langsmith-dataset`, `langsmith-evaluator` (+ existing `langsmith-trace`)
- Frontend: exclude `*.test.ts(x)` from `tsc -b` so production build succeeds
- `frontend/.gitignore` includes `.env*`

**Dependencies:** `langsmith[google-adk]>=0.14.17` in `backend/requirements.txt`.

---

## C. Testing

| Suite | Result |
|---|---|
| Backend pytest | **310 passed, 14 skipped, 4 failed** then fixed → LangSmith unit suite **15 passed** |
| Frontend Vitest | **158 passed** |
| Frontend `npm run build` | **Passed** after tsconfig exclude |
| Offline eval CLI | Previously **pass_rate 1.0** (fixtures; not live teaching) |
| Live Rishi smoke | **FAILED / blocked** — Gemini `402 RESOURCE_EXHAUSTED` |
| LangSmith ingest | **FAILED / blocked** — API `403 Forbidden`; also prior project/address conflict (fixed in code) |

Skipped live Gemini suites remain gated by `VEDIC_LIVE_EVAL`.

**Animations / UI journeys:** Automated contract/unit coverage exists; full Playwright production journey **not** claimed as executed in this release window.

---

## D. LangSmith

| Item | Status |
|---|---|
| Intended agent id | `vedicmath-ai-rishi` |
| Environments | `local` (dev), `production` (Render intended) |
| Project label | `vedicmath-ai-rishi` (metadata/tag only; not dual destination) |
| Local configure | `enabled: True` when key+tracing set |
| Verified visible traces | **No** — ingest 403; Gemini 402 prevented complete agent turn |
| Dataset/evaluator readiness | Prepared (Git datasets + docs + skills); not uploaded/executed in LangSmith UI |

**Human action required:** Create/authorize agent `vedicmath-ai-rishi` in the LangSmith workspace for the API key; fix 403; fund Gemini credits; re-run smoke.

---

## E. Production

| Item | Status |
|---|---|
| Frontend URL | https://vedicmath-ai-web-y5xo.onrender.com/ |
| Backend URL | https://vedicmath-ai.onrender.com/ |
| Render deploy branch | **`main` only** (both VedicMath services; PR previews off) |
| Deployed commit on main | Still `b57cc01…` (pre-ADK coach release) |
| This release pushed to main? | **No** |
| Live production Rishi smoke | **Not executed** (blocked) |
| Backend health check during work | `/` returned **503** (free-tier cold/unavailable) |

Rollback: keep serving `main` @ `b57cc01` until credentials restored and release branch is merged.

---

## F. Evaluation readiness

| Deliverable | State |
|---|---|
| Deterministic pytest | Ready / passing offline |
| Offline eval runner | Ready (`eval/runners/cli.py`) |
| Golden / teaching datasets | Git-managed |
| Human-review 30 | **Prepared** — `status: prepared_awaiting_human_review` (0 human-reviewed) |
| Safety 50 | **Prepared** — `status: prepared_not_executed` (0 executed) |
| Docs | `docs/evaluation-plan.md`, `docs/langsmith-setup.md`, `docs/evaluation-runbook.md` |

**Distinction:** prepared ≠ executed ≠ human-reviewed.

---

## G. Outstanding issues (human action)

1. **Fund Google AI Studio / Gemini credits** (clear 402) before live coach or production Rishi smoke.  
2. **Fix LangSmith 403** — verify API key workspace permissions and that agent `vedicmath-ai-rishi` exists.  
3. **After 1–2:** merge `release/production-langsmith-20261115` → `main`, set Render env (`LANGSMITH_*`, `VEDIC_LANGSMITH_REDACT_IO=true`, `LANGSMITH_AGENT_ENVIRONMENT=production`), redeploy, verify trace + `/coach/chat`.  
4. Persistent learner progress / adaptive mastery / 16 Sutras / games — **not implemented** (document only).  
5. Do not enable production RAG (`VEDIC_KNOWLEDGE_RAG`) until paired live eval accepts it.

---

## Success criteria checklist

1. Existing math/app capabilities preserved in candidate — **Yes (tests)**  
2. Backend/frontend regression — **Yes (after fixes)**  
3. Rishi architecture verified — **Yes (ADK + personas)**  
4. LangSmith verified real traces — **No (403 + 402)**  
5. Production deploy + smoke — **No (stopped)**  
6. Eval framework ready for team — **Yes (prepared)**  
7. Gaps transparent — **Yes**
