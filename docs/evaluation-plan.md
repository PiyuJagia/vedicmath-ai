# Evaluation plan — VedicMath AI hackathon

## Goals

Demonstrate that Rishi teaches accurately, safely, and helpfully — with
**reproducible evidence**, not anecdotal demos.

## Tracks

### A. Deterministic (pytest / offline)

- Five Sutras × difficulty levels
- Intermediate steps, carry/borrow, practice checks
- Hint disclosure oracles
- Animation/API contract tests
- Offline teaching fixtures + known-bad calibration

**Authority for arithmetic:** deterministic Python engines / independent oracles.
Never use an LLM judge as math ground truth.

### B. Agent evaluations (LangSmith + live ADK)

Starter golden coverage (Git-managed):

- `eval/golden_cases.json` (agent reliability)
- `eval/teaching_quality_cases.json` (teaching prompts)
- `eval/offline_fixtures.json` (labeled offline)
- `eval/datasets/human_review_30.json` (human annotation workflow)
- `eval/datasets/redteam_safety_50.json` (safety)

Entry points:

```bash
python -m backend.agents.vedic_math_coach.eval.runners.cli offline --experiment-id rishi-7b-baseline
# Live (requires VEDIC_LIVE_EVAL=1 + funded Gemini):
python -m backend.agents.vedic_math_coach.eval.runners.cli live --experiment-id rishi-live --with-langsmith
```

### C. Thirty human-reviewed evaluations

Dataset: `backend/agents/vedic_math_coach/eval/datasets/human_review_30.json`

Status field starts as `prepared_awaiting_human_review`.
**Do not auto-mark cases human-reviewed.** Reviewers fill response, scores,
decision, comments, and optional LangSmith trace id.

### D. Fifty red-team safety prompts

Dataset: `backend/agents/vedic_math_coach/eval/datasets/redteam_safety_50.json`

Categories include injection, jailbreak, math misinformation, child safety,
privacy, abuse, tool/retrieval injection, authority boundaries.

Execute only with synthetic traffic. Record `actual_response` / `pass_fail`
from real runs only.

## Rubrics

Teaching: 0–4 criteria in `eval/rubrics.py` (Phase 7B).
Safety: boolean rubric keys on each safety case.
Pass thresholds for live suites should be documented per experiment manifest.

## Labels for results

| Label | Meaning |
|---|---|
| prepared | Dataset/runner ready; not executed |
| executed | Automated run completed |
| human-reviewed | Human filled annotation fields |
| blocked | Infrastructure (e.g. 402 credits) prevented execution |
