# Evaluation runbook

## Prerequisites

- Python 3.12 venv with `backend/requirements.txt`
- Optional: funded `GOOGLE_API_KEY`, `LANGSMITH_API_KEY`
- Never commit `.env`

## 1. Offline deterministic (no network)

```bash
python -m pytest backend/tests -q
python -m backend.agents.vedic_math_coach.eval.runners.cli offline --experiment-id rishi-7b-baseline
```

Artifacts: `eval/archive/runs/<experiment>/<run_id>/manifest.json` (gitignored).

## 2. Offline teaching / calibration

```bash
python -m pytest backend/tests/test_teaching_v2_offline.py backend/tests/test_teaching_eval_calibration.py -q
```

## 3. Compare two experiment manifests

```bash
python -m backend.agents.vedic_math_coach.eval.runners.cli compare \
  --baseline PATH/manifest.json \
  --candidate PATH/manifest.json \
  --out backend/agents/vedic_math_coach/eval/reports/comparison.md
```

Refuse to treat offline fixture scores as live teaching scores when modes differ.

## 4. Live ADK (opt-in)

```bash
set VEDIC_LIVE_EVAL=1
python -m pytest backend/tests/test_coach_eval.py backend/tests/test_teaching_quality_eval.py -q
python -m backend.agents.vedic_math_coach.eval.runners.cli live --experiment-id rishi-live --with-langsmith
```

On `402 RESOURCE_EXHAUSTED`, record **infrastructure failure**, do not retry loops,
do not mark teaching failure.

## 5. Human review (30)

1. Open `eval/datasets/human_review_30.json`
2. Run each `learner_prompt` via `/coach/chat` (synthetic session)
3. Paste response into `actual_rishi_response`
4. Score fields; set `reviewer_decision` / `reviewer_comments`
5. Attach LangSmith `trace_or_experiment_ref`
6. Change `status` to `human_reviewed` only after a human edits the case

Optional: upload dataset via LangSmith dataset skill / UI; keep Git JSON as source of truth.

## 6. Safety red-team (50)

1. Open `eval/datasets/redteam_safety_50.json`
2. Execute prompts against a synthetic coach session
3. Fill `actual_response`, `pass_fail`, `failure_explanation`, `trace_ref`
4. Set `status` to `executed` (never invent pass/fail)

## 7. Inspect traces

See `docs/langsmith-setup.md`. Filter by agent id `vedicmath-ai-rishi` and
environment (`local` / `production`).

## 8. Frontend regression

```bash
cd frontend
npm test -- --run
npm run build
```

Playwright coach journeys require a running API + credentials for live paths.

## Reproduction checklist for hackathon packet

- [ ] Offline pytest summary attached
- [ ] Offline eval manifest SHA recorded
- [ ] Live smoke trace id (if credits available)
- [ ] Human-review progress count (X/30 reviewed)
- [ ] Safety executed count (X/50) with failures listed
