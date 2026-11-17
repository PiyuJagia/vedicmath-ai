# VedicMath AI — 100 live agent evaluation campaign

## Defined scope (100 unique evaluation cases)

| Track | Cases | Execution command | Evaluation evidence |
|---|---:|---|---|
| Original golden (g01–g10) | 10 | `python -m backend.agents.vedic_math_coach.eval.runners.langsmith_live golden` | Live LangSmith experiment `rishi-live-submission-v1*` |
| Extended golden (g11–g20) | 10 | `python -m backend.agents.vedic_math_coach.eval.runners.langsmith_live golden --extra` | Live LangSmith experiment `rishi-live-submission-extension-v1*` |
| Red-team adversarial | 50 | `python -m backend.agents.vedic_math_coach.eval.runners.langsmith_live redteam` | Actual responses, safety judge, LangSmith traces |
| Human review | 30 | `python -m backend.agents.vedic_math_coach.eval.runners.langsmith_live human` | Actual responses + LangSmith annotation queue + human reviews |
| **Total** | **100** | | |

**Definitions:** "Prepared" is not "executed"; "executed" is not "passed"; "generated response" is not "human-reviewed." Do not count failed/empty model responses as successful evaluations. The previous 10-case experiment counts toward the original golden track only if its case IDs, actual responses, and scores can be verified. Do not count reruns of the same golden IDs twice to inflate the unique case count.

## Instructions for Windows PowerShell

In `C:\Users\14042\Desktop\AI-Projects\vedicmath-ai`:

```powershell
git fetch origin
git switch feature/hackathon-100-live-evals
git pull --ff-only origin feature/hackathon-100-live-evals
.\.venv\Scripts\Activate.ps1

# Generate real Rishi replies for human review FIRST so reviewers can start.
python -m backend.agents.vedic_math_coach.eval.runners.langsmith_live human

# Run ten NEW golden cases. The existing ten have already been run once; check actual experiment scoring.
python -m backend.agents.vedic_math_coach.eval.runners.langsmith_live golden --extra

# Run all 50 safety cases. Budget/time/quota permitting.
python -m backend.agents.vedic_math_coach.eval.runners.langsmith_live redteam
```

**Do not enter API keys into chat or git.** The commands use local `.env` credentials, not production credentials. Respect Google API quotas and available credits. The production app is not touched by these evaluation runner executions. The calls generate Gemini and LangSmith charges as configured.

## Human annotation process

- Run `human`, then open the LangSmith annotation queue reported in the JSON artifact.
- Use [Human-Review-30-Reviewer-Pack.md](Human-Review-30-Reviewer-Pack.md) for the 30 actual cases and rubric.
- Reviewer enters three 1–5 ratings, a decision (accept/revise/reject), and a concrete observation for each **actual agent reply**.
- Do not score missing/failed replies; they are not queued.
- If multiple reviewers are available, split 1–15 and 16–30 without duplicating assignments.
- Preserve annotation timestamps and trace/run IDs in the evidence.

## Golden scoring caveats

- Pedagogy is judged separately by Gemini, with nine 0–1 dimensions.
- Agent failures must be marked **not executed** (`None`), not scored zero.
- The existing `grounding_check` is a **heuristic**, not a definitive mathematical correctness verdict: it can flag learner-quoted wrong answers or other legitimate intermediate numbers. Inspect flagged traces.
- The runtime numeric-grounding guard may replace a response with fallback text. Report those as actual observed response-quality failures; do not silence the guard.
- Evaluator failures or missing judge JSON should be reported separately as `not scored`, not passes.
- A successful LangSmith experiment link is not proof that every case passed.

## Red-team scoring caveats

- Exactly 50 distinct prepared cases exist in `redteam_safety_50.json`, across prompt injection, jailbreaks, exfiltration, privacy, child safety, tool/hint abuse, and other categories.
- The runner scores real responses with a Gemini safety judge, plus deterministic secret and instruction fingerprint detection.
- Any 429, 503, Gemini quota error, empty response, or judge failure must be treated as unavailable/unscored, not a passing safety outcome.
- Inspect high/critical results manually and retain their traces. Do not claim jailbreak-proof behavior.
- The runner currently uses in-process FastAPI `TestClient`, which follows the real /coach/chat app pipeline but does **not** prove production deployment health. UI-originated traces are separate evidence.

## Status at preparation time

- 10 original golden cases: an initial real LangSmith experiment was created and reported, but actual passing results need inspection.
- 10 extension golden cases: prepared in runner, **0 executed**.
- 50 red-team: prepared, **0 executed in the supplied handoff**.
- 30 human review cases: prepared, **0 responses executed or human-reviewed in the supplied handoff**.
- Actual counts must be updated from LangSmith and local run artifacts before submission.

## Submission evidence checklist

Collect LangSmith URL for each track, unique executed case IDs, model and judge scores, safety pass/fail/unknown counts, 30 human reviewer decisions/comments, and a concise limitations statement. Include screenshots of the working Rishi/Rabbit/Hummingbird frontend and cite deterministic-engine tool use. Do not claim that the optional MCP server is connected to the live hosted agent unless verified.

**Final gate:** submit actual observed counts, not target counts.
