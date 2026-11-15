# Hackathon submission readiness — VedicMath AI (live Rishi)

**Date:** 2026-11-15 · **Branch:** `claude/project-thread-njghjl` · **PR:** https://github.com/PiyuJagia/vedicmath-ai/pull/5 (draft, not merged)

Verdict: **not yet submission-ready.** The code is fixed and tested, but production still serves the old scripted coach, and no live evaluation has run yet. Every remaining step is listed in section F with its owner.

## A. Application status

| Item | Status | Evidence |
|---|---|---|
| Working live agent in production | **NO** | `vedicmath-ai.onrender.com/openapi.json` shows v0.4.0 with no `/coach` routes (checked 2026-11-15 17:2x UTC) |
| Theory | **FAIL (prod)** · fix ready | Prod bundle `index-JXmrFGu6.js` contains "Scripted demo coach, not live AI" and no `/coach/chat` |
| Practice | **FAIL (prod)** · fix ready | Same bundle |
| Rabbit | **NOT VERIFIED** | Needs deploy and a browser run |
| Hummingbird | **NOT VERIFIED** | Needs deploy and a browser run |
| Deployed commits | Frontend and backend both from `main` @ `5bc3905` (Render deploys `main`; backend version string 0.4.0 matches `main`) | |
| Public demo URL | https://vedicmath-ai-web-y5xo.onrender.com | |

### Root cause (confirmed)
1. **Unmerged code.** The live coach is only on `feature/live-rishi-coach` (13 ahead of `main`, 0 behind). Render builds `main`, so both services run the scripted version.
2. **Latent runtime failure after merging.** `runtime._ensure_llm()` called `load_llm_env()`, which raises when `.env` is missing. Render has no `.env`, so every `/coach/chat` would have returned a 503 whose text exposed the server path. This is fixed in PR #5.
3. **Production env vars.** These are not confirmed on Render. `GOOGLE_API_KEY` and the LangSmith variables must be set on the backend service, and only Piyu can do that.

Not a cause: CORS and routing. `render.yaml` sets `VITE_API_BASE` to the backend, and `ALLOWED_ORIGINS` is read from the env. Both must include the static site URL, which is part of step 2 of the deploy checklist.

## B. Technical architecture
- **One Google ADK agent** (`backend/agents/vedic_math_coach/agent.py`) on **Gemini `gemini-3.8-flash`**, with three personas: Rishi (`boy_coach`), Rabbit and Hummingbird. The persona is parsed from the reply's speaker tag and returned as `message.character`.
- **FastAPI** `/coach/sessions` and `/coach/chat` (`handoff/api.py`). **React/TS** `LiveCoachProvider` is the one shared client used by every screen.
- **Deterministic tools:** `calculate_sutra`, `get_lesson`, `check_practice_answer` and `get_progressive_hint`. The engines own all maths and all animation timelines.
- **LangSmith:** ADK tracing through agent addressing (`observability/langsmith.py`). In production, learner I/O is redacted.
- **RAG:** a curated knowledge pack behind `VEDIC_KNOWLEDGE_RAG`, which is **off** by default. It returns reference text labelled untrusted.
- **Memory:** ADK `InMemorySessionService` (lost on restart), plus browser `sessionStorage`/`localStorage`. **There is no auth, no Postgres and no cross-device memory.**

## C. Agent evaluation evidence
| Item | Status |
|---|---|
| Dataset `vedicmath-rishi-hackathon-golden` (10 cases) | **Defined, not uploaded.** Runner: `eval/runners/langsmith_live.py golden` |
| Experiment `rishi-live-submission-v1` | **Not run.** This cloud machine can't reach LangSmith and has no keys |
| Scores, traces | None yet. Do not cite any |

The runner sends each case through the real `/coach/chat` pipeline. It scores 9 pedagogy dimensions with a Gemini judge, checks numbers against a heuristic engine comparison (`engine_grounding`), and adds a deterministic persona and answer-disclosure check. Judge errors and 503s score as null, never as passes.

## D. Safety evidence

| Guardrail | Existing mechanism | Test evidence | Result | Remaining risk |
|---|---|---|---|---|
| Jailbreak / role abandonment | Prompt rules 6 and 8 (rule 8 added in PR #5) | No adversarial run yet | NOT VERIFIED | Prompt-only. Red-team run needed |
| System-prompt exfiltration | Prompt rule 6. The red-team runner also checks deterministically for instruction text in replies | No live run | NOT VERIFIED | Prompt-only. No output filter in production |
| Prompt injection via UI context | `validate_learning_context`: allow-listed sutras and difficulties, clipped strings, `extra="forbid"` rejects `correct_answer` (tests in `test_coach_context.py`) | Unit tests pass | PARTIAL | Clipped free text (`frame_state`, `progress_note`) still reaches the model |
| Retrieved-knowledge injection | Tool labels results "untrusted reference content". RAG is off by default | Code review | PARTIAL | Prompt-level only |
| Hint-level bypass by asking Rishi | **New:** unsolved practice values redacted from every persona's reply (`protected_practice_values`) | `test_coach_chat_hardening.py` (8 tests) | PASS (deterministic) | `hint_level` and `check_status` are client-supplied, so a forged client can unlock them. `/sutras/{s}/check` also returns `correct_answer` on wrong attempts |
| Answer given to the model on a wrong attempt | **New:** `check_practice_answer` drops `correct_answer` unless correct | Unit test | PASS | Hint packets still pass `forbidden_values` to the model, so redaction is the backstop |
| Maths authority | Tools plus engine. Practice grading is deterministic in the UI | 713 backend tests pass | PASS | The model can still misstate numbers in prose. The architecture thread's grounding guard (PR #4) is not wired yet |
| Unsupported Sutras | Context preamble lists the 5 supported Sutras | Golden case g10, not run | NOT VERIFIED | |
| Child safety / distress | Prompt rule 10 (added in PR #5). Gemini's built-in safety filters | No live run | NOT VERIFIED | Prompt-only |
| Personal data | Prompt rule 9 (added). No PII fields in the API. Production LangSmith I/O redaction | Code review | PARTIAL | Free-text messages may contain PII and reach Gemini |
| Secrets in responses | `redact_secrets` on errors. **New:** 503 no longer echoes internal errors | Unit test | PASS | |
| Session isolation | Random UUID session ids; calculation ids checked for ownership | Existing tests | PARTIAL | A session id is a bearer token. No auth, and clients may choose any id |
| Abuse / cost control | **New:** 20 turns/min per session, 60/min per IP (429). Message max 4000 chars | Unit tests | PARTIAL | In-process only, resets on restart. No auth, no daily budget cap |

**Red-team execution:** **0/50 executed.** All 50 cases are still `prepared_not_executed`. Runner: `langsmith_live.py redteam`.

## E. Human review evidence
- **Actual responses prepared: 0/30.** Runner: `langsmith_live.py human`. It creates the dataset, generates 30 live responses, and puts them in a LangSmith annotation queue with the rubric. All score fields stay empty.
- **Genuinely human-reviewed: 0/30.**

## F. Submission checklist

| Item | State | Owner |
|---|---|---|
| Repo / commit | PR #5 head `claude/project-thread-njghjl` | — |
| Set Render backend env vars | Pending | **Piyu** (API keys) |
| Merge PR #5 → Render deploys | Pending approval | **Piyu** approves, Claude merges |
| Browser E2E on public site (Theory, Practice, Rabbit, Hummingbird) plus LangSmith trace links | Pending deploy | Claude (via Piyu's built-in browser) |
| 10-case LangSmith experiment | Pending | Claude, on Piyu's laptop (keys) |
| 50 red-team run | Pending | Claude, on Piyu's laptop |
| 30 human reviews | Pending | **Humans** |
| Architecture summary | Section B | — |
| Known limitations | No auth, in-memory sessions, prompt-only safety rules, client-trusted hint state, practice Vitest file hangs (pre-existing) | — |
| Official judging rubric | **Not found** in the repo or project files, so the evidence is not aligned to it | Piyu to share |

### Deploy checklist (exact)
1. Render → **vedicmath-ai** → Environment: set `GOOGLE_API_KEY`, `GOOGLE_GENAI_USE_VERTEXAI=false`, `LANGSMITH_API_KEY`, `LANGSMITH_TRACING=true`, `LANGSMITH_AGENT_ID=vedicmath-ai-rishi`, `LANGSMITH_AGENT_ENVIRONMENT=production`. Make sure `ALLOWED_ORIGINS` includes `https://vedicmath-ai-web-y5xo.onrender.com`. Do not set `LANGSMITH_PROJECT`.
2. Merge PR #5 into `main`. Both services auto-deploy.
3. Verify that `https://vedicmath-ai.onrender.com/openapi.json` reports `0.5.0` and lists `/coach/chat`.
4. On Theory, a live Rishi intro appears with no "not live AI" tag.
