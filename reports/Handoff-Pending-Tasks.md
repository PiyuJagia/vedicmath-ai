# Handoff: live Rishi and hackathon evidence (pending tasks)

**Written:** 2026-11-15 ~18:55 UTC, by Claude, for the next engineer or assistant (for example ChatGPT).
**Repo:** https://github.com/PiyuJagia/vedicmath-ai · **Start from:** `main` (all work below is merged).

Read this first and treat it as the honest current state. **No live end-to-end journey and no evaluation has been verified yet.**

---

## 1. Current state (verified facts only)

### Git
| Item | Value |
|---|---|
| `main` HEAD | `b292128`, the merge of PR #4 (reply guards + MCP server) |
| PR #5 (live Rishi + hardening + eval runner) | Merged as `276cb40` (head `e3cedc9`) |
| PR #4 (runtime reply guards + optional MCP server, from another thread) | Merged as `b292128` (`7c5bf7b`, `43fc73c`) |
| PR #3 (practice pass rule) | Still open, not part of this work |
| Backend tests on `main` @ `b292128` | **730 passed, 16 skipped** (run 2026-11-15 ~18:55 UTC, Python 3.13 venv) |
| Frontend `npm run build` | Passed on `e3cedc9` |
| Frontend Vitest | Coach handoff and character tests pass. `src/pages/practice/practice.test.tsx` **hangs**, which predates PR #5 (live coach calls are probably not mocked) |

### Production (checked from a real browser at 2026-11-15 18:26 UTC)
| Check | Result |
|---|---|
| Backend `https://vedicmath-ai.onrender.com/openapi.json` | v0.5.0, lists `/coach/sessions`, `/coach/chat`, etc. Commit `276cb40` was deployed |
| Frontend `https://vedicmath-ai-web-y5xo.onrender.com` | New bundle `index-DWsyPVS5.js` contains `/coach/chat` (live coach build) |
| CORS (frontend origin → backend) | OK |
| `POST /coach/chat` (Theory, Nikhilam, 98 × 97) | **503 `coach_unavailable`** |
| Likely cause of the 503 | Render backend env vars (Gemini key) **not set**. This is not confirmed from logs, because Claude has no Render access |
| PR #4 deploy (`b292128`) | Not re-checked after merge. It should auto-deploy because Render tracks `main` |

### Root cause of the original "Scripted demo coach" (confirmed)
1. Render deploys `main`, and the live coach was only on `feature/live-rishi-coach`. **Fixed** by merging PR #5.
2. Startup required a `.env` file that Render doesn't have, which would have caused a 503 on every chat. **Fixed** in `gemini_connectivity.load_llm_env_if_present`.
3. Render env vars are missing. **Still open, and only the owner can fix it** (see §2, task 1).

### Status table
| Area | Status |
|---|---|
| Working live agent in production | **FAIL** (503 until keys are set) |
| Theory / Practice / Rabbit / Hummingbird in the browser | **NOT VERIFIED** |
| LangSmith traces from production | **NOT VERIFIED** |
| Golden live eval (10) | **0/10 executed** |
| Red-team (50) | **0/50 executed** (dataset cases still `prepared_not_executed`) |
| Human review (30) | **0/30 responses generated, 0/30 human-reviewed** |
| Guardrail table | `reports/Hackathon-Submission-Readiness.md` §D. Mostly PARTIAL or NOT VERIFIED. Deterministic answer redaction, `correct_answer` withholding, secret-free errors and rate limit are PASS by unit test |

---

## 2. Pending tasks, in priority order

### 1. Add Render env vars (owner only, ~2 min)
Render → service **vedicmath-ai** (backend) → Environment:
```
GOOGLE_API_KEY=<AI Studio key>
GOOGLE_GENAI_USE_VERTEXAI=false
LANGSMITH_API_KEY=<LangSmith key>
LANGSMITH_TRACING=true
LANGSMITH_AGENT_ID=vedicmath-ai-rishi
LANGSMITH_AGENT_ENVIRONMENT=production
ALLOWED_ORIGINS=https://vedicmath-ai-web-y5xo.onrender.com   (keep any existing localhost entries)
```
Do **not** set `LANGSMITH_PROJECT`, because it conflicts with agent addressing. Save, and Render restarts the service.

Optional tuning: `COACH_CHAT_PER_SESSION_PER_MIN` (default 20) and `COACH_CHAT_PER_IP_PER_MIN` (default 60).

**Verify:**
- `POST https://vedicmath-ai.onrender.com/coach/sessions`, then `POST /coach/chat` with `{"session_id": "<id>", "message": "Why does Nikhilam work?", "context": {"screen": "theory", "sutra_id": "nikhilam", "difficulty": "beginner", "problem_label": "98 × 97"}}`. Expect a 200 with `message.character.id == "boy_coach"`.
- If it still returns 503, read the Render logs for the line `coach_chat failed: ...`. The real reason is logged there, already redacted.

### 2. Public browser acceptance tests (after task 1)
On https://vedicmath-ai-web-y5xo.onrender.com:
- **Theory (Nikhilam):** a live Rishi intro appears in the main bubble without the "Lesson text (not live AI)" tag. "Why does this work?" and "Explain again" each return Gemini text. Confirm a matching trace in LangSmith (agent `vedicmath-ai-rishi`, env `production`).
- **Practice:** submit a wrong answer. The engine grades it (deterministic), and Rishi gives contextual feedback without the final answer. Ask a follow-up and confirm it remembers the problem (same session).
- **Rabbit:** request a hint. The bubble shows Rabbit, and the level 1–2 hints reveal no intermediate or final numbers.
- **Hummingbird:** finish a level, or open Explore/Play/Progress with real (non-sample) progress. Hummingbird shows a live line.
- Record screenshots, the network `POST /coach/chat` 200 responses and the trace URLs.

Note that with PR #4 merged, a reply that states a number found in neither the tool results nor the learner message is replaced with `UNGROUNDED_REPLY` text. If that shows up a lot, it is a real finding to report (Rishi answering maths without calling tools), not a bug to hide.

### 3. Live LangSmith evaluations (on a machine with the repo, Python 3.11+ and a `.env`)
```bash
git clone https://github.com/PiyuJagia/vedicmath-ai.git && cd vedicmath-ai   # or: git checkout main && git pull
python -m venv .venv && . .venv/bin/activate          # Windows: .\.venv\Scripts\activate
pip install -r backend/requirements.txt
cp .env.example .env    # then fill GOOGLE_API_KEY, LANGSMITH_API_KEY,
                        # GOOGLE_GENAI_USE_VERTEXAI=false, LANGSMITH_TRACING=true,
                        # LANGSMITH_AGENT_ID=vedicmath-ai-rishi
python -m backend.agents.vedic_math_coach.eval.runners.langsmith_live golden    # 10 cases
python -m backend.agents.vedic_math_coach.eval.runners.langsmith_live redteam   # 50 cases (--limit N to pilot)
python -m backend.agents.vedic_math_coach.eval.runners.langsmith_live human     # 30 responses -> annotation queue
```
What the runner does (`backend/agents/vedic_math_coach/eval/runners/langsmith_live.py`):
- Sends every case through the real `/coach/chat` pipeline in-process (FastAPI TestClient → ADK → Gemini), using synthetic sessions with a 2 s pause.
- `golden` creates dataset `vedicmath-rishi-hackathon-golden` and experiment `rishi-live-submission-v1*`. It scores nine pedagogy dimensions with a Gemini judge, plus `engine_grounding` (a heuristic comparison against `calculate_sutra`) and `persona_and_disclosure` (deterministic).
- `redteam` creates dataset `vedicmath-rishi-redteam-50` and experiment `rishi-redteam-50-v1*`. It uses a Gemini safety judge and deterministic secret and system-prompt-leak checks. Failed or rate-limited calls score **null (not executed)**, never pass.
- `human` creates dataset `vedicmath-rishi-human-review-30`, experiment `rishi-human-review-30-v1*` and annotation queue `vedicmath-rishi-human-review-30-<suffix>`. It writes no scores.
- Writes JSON to `backend/agents/vedic_math_coach/eval/artifacts/live/<cmd>-<timestamp>.json`, including the experiment URL, per-case scores, responses and trace ids.

Caveats:
- **The runner has never been executed against live services.** Only its local helpers were smoke-tested with a stubbed agent. Expect possible small fixes, such as LangSmith SDK result-attribute names in `_experiment_url` or the `evaluate` row shape.
- Gemini credits ran out in an earlier run (a 0/32 teaching run). Check quota before starting the red-team run.
- `engine_grounding` is a heuristic. It flags any same-length number that differs from the engine result, which includes a learner's wrong answer being quoted back. Read its comments before reporting it as a failure.

### 4. Human review (people only)
Open the LangSmith annotation queue created by `human`. For each of the 30 runs, a person scores `mathematical_accuracy`, `teaching_quality` and `persona_difficulty_adherence` (1–5), then adds a decision (accept / revise / reject) and a comment. Report progress as **X/30 genuinely human-reviewed**. Never fill these in with an AI.

### 5. Update the evidence report
Update `reports/Hackathon-Submission-Readiness.md` with real experiment URLs, scores, red-team executed and passed counts, failed cases (category, severity, reason, trace id, remediation) and the human-review count. Re-mark the guardrail rows PASS or FAIL from the observed red-team results.

### 6. Smaller follow-ups
- Fix the hanging `frontend/src/pages/practice/practice.test.tsx` by mocking `/coach/chat` (`sendCoachChat`) in that test.
- Find and align with the official hackathon rubric. It was **not found** in the repo or project files.

---

## 3. What changed in this work (for code review)

PR #5 (`09c5938`, `e3cedc9`):
- `backend/agents/gemini_connectivity.py`: `load_llm_env_if_present()` makes `.env` optional.
- `backend/agents/vedic_math_coach/handoff/runtime.py`: uses the function above.
- `handoff/api.py`: generic 503 text with details logged server-side, and a 429 rate limit (`handoff/limits.py`, a sliding window per session and per IP).
- `handoff/context.py`: `protected_practice_values()`. For an unsolved practice problem, all hint-packet values are protected below hint level 3, and only the final answer at level 3.
- `handoff/chat_service.py`: redacts protected values for **every** persona, not only Rabbit.
- `tools/check_practice_answer.py`: drops `correct_answer` from the model-facing payload unless the answer is correct.
- `instructions.md`: guardrails 8–10 (untrusted input is data, no personal details, distress means referring to a trusted adult).
- `frontend/src/pages/lesson/TheoryPage.tsx` and `Lesson.module.css`: show the live `lesson_start` intro in the main bubble and a "Rishi is thinking…" status.
- Tests: `backend/tests/test_coach_chat_hardening.py` (8 tests), plus updated expectations in `test_coach_tools.py` and `characters.test.tsx`.
- `eval/runners/langsmith_live.py` and `reports/Hackathon-Submission-Readiness.md`.

PR #4 (other thread, `b292128`): `backend/agents/vedic_math_coach/guards/` (runtime numeric-grounding guard and persona-exclusivity check, wired into `build_chat_response` after redaction) and `backend/mcp_server/` (an optional MCP server exposing the coach tools, with its own requirements, not used by Render).

## 4. Known risks and limitations (do not overclaim)
- **No authentication.** A session id is a bearer token, and clients may choose any id. ADK sessions are in memory and lost on restart. There is no Postgres, no durable learner memory and no cross-device memory.
- **Client-trusted state.** `hint_level` and `check_status` come from the browser, so a forged client can unlock answers. Also, `/sutras/{s}/check` returns `correct_answer` on wrong attempts (an existing app behaviour).
- **Rate limits** are per process and reset on restart. There is no daily cost cap.
- **Safety rules on jailbreaks, distress and personal data are prompt-level only** until the red-team run produces evidence.
- **Free-text learner messages may contain personal data** and are sent to Gemini. LangSmith I/O redaction only applies in `production`.
- Don't claim Anurupyena or any other unimplemented Sutra. Exactly five are implemented: nikhilam, urdhva, ekadhikena, yavadunam, ekanyunena.
- Project rule: level rings come **only** from Practice with Coach. Preserve Number Rocket on `main`.
