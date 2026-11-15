# Tollgate 7B.5 — Evaluation Infrastructure Report

**Branch:** `feature/google-adk-setup`  
**Status:** Complete — **stop for approval** before Phase 7C formalization, push, or deploy  
**Scope:** LangSmith opt-in tracing, versioned datasets, unified eval runner, immutable experiment manifests, comparison reports, improvement register  
**Not in scope:** Rishi teaching-behavior changes, RAG expansion, math engines, animation contracts, production learner tracing

---

## 1. Existing evaluation infrastructure audit

### Already present (reused, not duplicated)

| Capability | Location | Status |
|---|---|---|
| ADK golden cases (31) | `eval/golden_cases.json` | Live blocked by Gemini 402 |
| Teaching-quality cases (32) | `eval/teaching_quality_cases.json` | Live blocked |
| Offline teaching fixtures (27) | `eval/offline_fixtures.json` | Working |
| Rubrics 0–4 | `eval/rubrics.py` | Working (7B.1) |
| Hint-disclosure oracle | `eval/hint_disclosure.py` | Working |
| Intermediate-step oracle | `eval/intermediate_claims.py` | Working |
| Teaching v2 scorer | `eval/teaching_v2_scoring.py` | Working |
| Calibration tests | `backend/tests/test_teaching_eval_calibration.py` | Working |
| Live opt-in gate | `backend/tests/live_gate.py` (`VEDIC_LIVE_EVAL`) | Working |
| Math engine pytest | `backend/tests/test_*` | Working |
| Progressive hint tests | `backend/tests/test_progressive_hints.py` | Working |
| Coach tool tests | `backend/tests/test_coach_tools.py` | Working |
| Frontend Vitest / Playwright | `frontend/` | Working |
| Knowledge pack + offline RAG scoring | `backend/knowledge/`, `eval/rag_*` | Present on branch from prior 7C work; **not claimed as live teaching gains** |

### Registered ADK tools (confirmed)

Always registered:

- `calculate_sutra(sutra, difficulty="beginner", a=None, b=None, number=None, tool_context=None, session_id=None)`
- `get_lesson(...)`
- `check_practice_answer(...)`
- `get_progressive_hint(...)`

Flag-gated (`VEDIC_KNOWLEDGE_RAG`):

- `search_vedic_math_knowledge(...)` — present on branch; production coaching use still pending formal 7C approval

Five Sutras remain: Nikhilam, Urdhva Tiryagbhyam, Ekadhikena Purvena, Yavadunam, Ekanyunena Purvena.

### Gaps addressed in 7B.5

| Gap | Solution |
|---|---|
| No unified entry point across offline/live/compare | `eval/runners/cli.py` |
| No immutable run manifests | `eval/runners/manifest.py` + `archive/runs/` |
| No dataset version registry | `eval/datasets/catalog.json` |
| No LangSmith / ADK observability | `eval/observability/langsmith_trace.py` (opt-in, fail-soft) |
| No privacy sanitization for export | `eval/observability/sanitize.py` |
| No paired experiment comparison | `eval/runners/compare.py` |
| No improvement ↔ evidence chain | `eval/IMPROVEMENT_REGISTER.md` |
| Offline scores conflated with live teaching | Explicit mode labels + compare compatibility checks |

### Minimal integration design

```text
Git golden fixtures (source of truth)
        │
        ▼
runners/cli ──► offline | live-shell | compare
        │              │
        │              └── optional maybe_configure_langsmith()
        │                         (LANGSMITH_TRACING + VEDIC_LANGSMITH_EVAL + API key)
        ▼
archive/runs/<experiment_id>/<run_id>/manifest.json  (immutable)
        │
        ▼
compare → reports/*.md + IMPROVEMENT_REGISTER.md
```

LangSmith is an optional side-channel for synthetic eval traces. Local offline evaluation remains fully usable without credentials.

---

## 2. Files created or modified

### Created

| Path | Role |
|---|---|
| `eval/datasets/catalog.json` | Versioned dataset registry |
| `eval/calibration/known_bad_cases.json` | Known-bad calibration corpus |
| `eval/observability/sanitize.py` | Secret / non-synthetic redaction |
| `eval/observability/langsmith_trace.py` | ADK→LangSmith configure (opt-in) |
| `eval/observability/__init__.py` | Package |
| `eval/runners/manifest.py` | Immutable run manifests |
| `eval/runners/offline.py` | Offline suite orchestrator |
| `eval/runners/compare.py` | Manifest comparison |
| `eval/runners/cli.py` | CLI entry point |
| `eval/runners/__main__.py` | `python -m …runners` |
| `eval/runners/__init__.py` | Package |
| `eval/experiments/7b-baseline/README.md` | Experiment family notes |
| `eval/experiments/7c-rag/README.md` | Planned RAG pair notes |
| `eval/experiments/7d-proactive/README.md` | Future proactive notes |
| `eval/CHANGELOG.md` | Eval infra changelog |
| `eval/IMPROVEMENT_REGISTER.md` | Change ↔ evidence register |
| `eval/HACKATHON_EVIDENCE.md` | Evidence package checklist |
| `eval/archive/example_runs/*` | Sample manifest (no secrets) |
| `eval/reports/example_comparison.md` | Generated compare example |
| `backend/tests/test_eval_infrastructure.py` | Infra integrity tests |
| `reports/Tollgate-7B.5-Evaluation-Infrastructure.md` | This report |

### Modified

| Path | Change |
|---|---|
| `.env.example` | LangSmith + `VEDIC_LANGSMITH_EVAL` docs |
| `.gitignore` | Ignore `eval/archive/runs/` |

### Explicitly not changed

Mathematical engines, animation contracts, Rishi `instructions.md` pedagogy (except hash recording), frontend redesign, production coaching traffic instrumentation.

---

## 3. LangSmith integration architecture

**Official path verified:** `langsmith.integrations.google_adk.configure_google_adk`  
**Installed SDK:** `langsmith==0.14.17`  
**ADK:** `google-adk==2.14.1`  
**Docs reference:** https://docs.langchain.com/langsmith/trace-with-google-adk

```text
Eval CLI / pytest (synthetic only)
        │
        ▼
maybe_configure_langsmith()
  requires ALL of:
    LANGSMITH_TRACING=true|1|on
    VEDIC_LANGSMITH_EVAL=1
    LANGSMITH_API_KEY set
        │
        ├── disabled → no-op; agent unchanged
        └── enabled → configure_google_adk(project_name=…)
                        fail-soft on any exception
```

**Privacy defaults**

- Tracing **off** unless triple-gated.
- Intended traffic: synthetic evaluation conversations only.
- `sanitize.py` redacts secrets and blocks non-synthetic message export helpers.
- Production FastAPI learner paths are **not** instrumented in this tollgate.
- If remote export risk cannot be fully controlled, keep tracing on the isolated eval runner (current design).

**What may leave the backend when enabled:** synthetic prompts/responses, tool names/args (sanitized), ADK/model spans, experiment/run IDs, tags (`synthetic-eval`).  
**What must not leave:** real learner identities, production chat histories, API keys, DB credentials, internal knowledge-source secrets.

---

## 4. Configuration and setup instructions

```env
# .env (never commit)
LANGSMITH_TRACING=false
LANGSMITH_API_KEY=
LANGSMITH_PROJECT=vedicmath-ai-evals
# LANGSMITH_ENDPOINT=https://api.smith.langchain.com
# VEDIC_LANGSMITH_EVAL=1   # required second opt-in for eval tracing

# Live Gemini (separate)
# VEDIC_LIVE_EVAL=1
# GOOGLE_API_KEY=...
```

```bash
# Optional dependency
pip install "langsmith[google-adk]"

# Offline (default path — no network credentials required)
python -m backend.agents.vedic_math_coach.eval.runners.cli offline --experiment-id rishi-7b-baseline

# Compare two immutable manifests
python -m backend.agents.vedic_math_coach.eval.runners.cli compare \
  --baseline PATH/manifest.json \
  --candidate PATH/manifest.json \
  --out backend/agents/vedic_math_coach/eval/reports/comparison.md

# Live shell (records pending status; needs VEDIC_LIVE_EVAL=1)
python -m backend.agents.vedic_math_coach.eval.runners.cli live --experiment-id rishi-live

# Live + LangSmith shell
# LANGSMITH_TRACING=true VEDIC_LANGSMITH_EVAL=1 LANGSMITH_API_KEY=... VEDIC_LIVE_EVAL=1 \
python -m backend.agents.vedic_math_coach.eval.runners.cli live --with-langsmith --experiment-id rishi-live-ls
```

---

## 5. Evaluation runner modes and commands

| Mode | CLI | Network | Purpose |
|---|---|---|---|
| 1 Offline deterministic | `offline` | None required | Fixtures, oracles, calibration, knowledge schema |
| 2 Offline recorded replay | Same fixtures / labeled responses | None | Scorer regression (labeled offline) |
| 3 Live ADK | `live` + `VEDIC_LIVE_EVAL=1` + pytest golden | Gemini | Real tool/model behavior |
| 4 Live + LangSmith | `live --with-langsmith` + both opt-ins | Gemini + LangSmith | Same live cases with traces |
| 5 Paired comparison | `compare --baseline --candidate` | None | Metric deltas if compatible |

**Safeguards**

- No automatic paid eval enablement.
- No Gemini retry loops on `402 RESOURCE_EXHAUSTED`.
- Live refused without `VEDIC_LIVE_EVAL`.
- LangSmith failures never break agent/eval execution.
- Manifest directories refuse overwrite (`FileExistsError`).

---

## 6. Dataset versioning strategy

Source of truth: **Git** under `eval/`. Registry: `eval/datasets/catalog.json` (`catalog_version` 7B.5.1).

Each dataset records: `dataset_id`, `version`, `category`, `path`, `description`, `grading`, `case_count`, `langsmith_dataset_id` (null until published), `change_history`.

| dataset_id | version | grading |
|---|---|---|
| `golden_adk_cases` | 6B.3 | deterministic_expect_checks |
| `teaching_quality_cases` | 7A.1 | deterministic_plus_optional_llm_judge |
| `teaching_v2_offline_fixtures` | 7B.1 | rubric_0_4_plus_oracles |
| `judge_calibration` | 7B.1 | must_fail_deterministic |
| `rag_retrieval_cases` | 7C.1-prep | retrieval_hit_precision_abstention |
| `rag_before_after_offline` | 7C.1-prep | labeled_offline_only |

**Rules:** Never rewrite historical fixtures to make new experiments pass. LangSmith UI edits must not silently diverge from Git. RAG datasets are catalogued as prepared, not as live teaching baselines.

---

## 7. Experiment manifest example

Real offline run (local archive; gitignored):

- `experiment_id`: `rishi-7b-baseline`
- `run_id`: `rishi-7b-baseline-20261115T141756Z-070f0162`
- `evaluation_mode`: `offline`
- `git_branch`: `feature/google-adk-setup`
- `working_tree_dirty`: `true` + `dirty_patch_fingerprint`
- `adk_version`: `2.14.1`
- `langsmith_sdk_version`: `0.14.17`
- `gemini_model`: `gemini-3.8-flash`
- `evaluator_rubric_version`: `7B.1`
- `schema_version`: `7B.5.1`
- Per-category offline pass rates: teaching_v2 / calibration / hint_disclosure / knowledge_validation = **1.0**

Checked-in sample: `eval/archive/example_runs/SAMPLE_MANIFEST.json`.

---

## 8. LangSmith experiment example

**Not executed in this tollgate** — no LangSmith API key configured; tracing left disabled by design to avoid unintended charges and privacy risk.

When credentials exist:

1. Set `LANGSMITH_TRACING=true`, `VEDIC_LANGSMITH_EVAL=1`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT=vedicmath-ai-evals`.
2. Run `live --with-langsmith` (synthetic only).
3. Record `langsmith.project` / experiment IDs into the local manifest.
4. Prefer syncing datasets once; store `langsmith_dataset_id` in `catalog.json` rather than re-uploading every run.

Local framework remains authoritative if LangSmith is unavailable.

---

## 9. Archived report directory example

```text
backend/agents/vedic_math_coach/eval/
  datasets/catalog.json
  rubrics.py                    # Track 3 rubrics (preserved)
  calibration/known_bad_cases.json
  runners/{cli,offline,compare,manifest}.py
  observability/{langsmith_trace,sanitize}.py
  experiments/{7b-baseline,7c-rag,7d-proactive}/
  archive/
    example_runs/SAMPLE_MANIFEST.json
    runs/                       # gitignored immutable outputs
      rishi-7b-baseline/<run_id>/{manifest.json,summary.json}
  reports/example_comparison.md
  IMPROVEMENT_REGISTER.md
  HACKATHON_EVIDENCE.md
  CHANGELOG.md
```

---

## 10. Comparison-report example

Generated: `eval/reports/example_comparison.md`

```text
# Comparison: rishi-7b-baseline -> rishi-7b-baseline-repeat
Compatible: True

| Metric | Baseline | Candidate | Difference |
| calibration | 1.0 | 1.0 | 0.0 |
| hint_disclosure | 1.0 | 1.0 | 0.0 |
| knowledge_validation | 1.0 | 1.0 | 0.0 |
| pass_rate | 1.0 | 1.0 | 0.0 |
| teaching_v2 | 1.0 | 1.0 | 0.0 |
```

Mode-mismatched compares are marked **incompatible** and must not attribute teaching gains. Offline fixture classification ≠ live agent performance.

---

## 11. Improvement register

See `eval/IMPROVEMENT_REGISTER.md`.

| ID | Decision | Evidence note |
|---|---|---|
| IMP-7A-hints | accepted (offline) | Hint-disclosure sensitivity; live leakage pending |
| IMP-7B-eval | accepted | 27/27 offline + 7/7 calibration |
| IMP-7B.5-infra | pending approval | Enables reproducible before/after chain |
| IMP-7C-rag | pending | Code present on branch; live paired teaching delta **not** accepted yet |
| IMP-7D-proactive | not started | Requires approved 7C + this infra |

---

## 12. Test results and skips

### Eval infrastructure (this tollgate)

- `backend/tests/test_eval_infrastructure.py` — **9 passed**
- Related: `test_teaching_v2_offline.py`, `test_teaching_eval_calibration.py`, `test_progressive_hints.py` — **34 passed** combined with infra suite

### Offline CLI

- `rishi-7b-baseline` offline run: **pass_rate 1.0**
- Suites: teaching_v2, calibration, hint_disclosure, knowledge_validation

### Full regression (this validation)

| Suite | Result |
|---|---|
| Backend pytest (`backend/tests`) | **308 passed, 14 skipped** |
| Frontend Vitest | **158 passed** (12 files) |
| Eval infra + 7B offline/calibration/hints | **34 passed** |
| Offline CLI `rishi-7b-baseline-verify` | **pass_rate 1.0** (`cases_attempted=36`, `cases_failed=0`) |

Live Gemini suites remain among the 14 skips without `VEDIC_LIVE_EVAL=1`.

### Known skips / pending

| Item | Reason |
|---|---|
| 31 golden live ADK cases | Gemini AI Studio credits depleted / 402 |
| Live teaching-quality judge | Same |
| LangSmith live experiment | No API key / intentionally disabled |
| Playwright full journey | Not required for infra tollgate; prior e2e specs remain |

**Do not interpret offline fixture classification as successful live agent evaluation.**

---

## 13. Privacy and security validation

| Control | Validation |
|---|---|
| Tracing off by default | `test_langsmith_disabled_by_default` |
| Double opt-in | `test_langsmith_requires_eval_opt_in` |
| Secret redaction | `test_sanitize_redacts_secrets_and_blocks_nonsynthetic` |
| Non-synthetic block | sanitize returns `[REDACTED_NON_SYNTHETIC]` |
| No production instrumentation | Only eval CLI `maybe_configure_langsmith` |
| Archive secrets | `archive/runs/` gitignored; sample manifests use placeholders |
| Credentials | Never hardcoded; `.env.example` empty keys only |

Intended audience includes children — remote traces limited to synthetic eval traffic for this tollgate.

---

## 14. Pending live-evaluation requirements

Before claiming live teaching improvements:

1. Funded Google AI Studio / Gemini credentials (no 402).
2. Explicit `VEDIC_LIVE_EVAL=1`.
3. Re-run golden + teaching-quality pytest suites; label 402 as **infrastructure failure**, not teaching failure.
4. Optional: LangSmith key + `VEDIC_LANGSMITH_EVAL=1` for inspectable synthetic traces.
5. For RAG attribution: paired live experiments (`rishi-7b-baseline` vs `rishi-7c-rag-v1`) with identical dataset, model, rubrics; only toggle retrieval.
6. Update `IMPROVEMENT_REGISTER.md` with measured deltas before marking IMP-7C accepted.

---

## 15. Readiness assessment for Phase 7C

| Criterion | Ready? |
|---|---|
| Offline eval reproducibility | **Yes** |
| Immutable experiment manifests | **Yes** |
| Dataset catalog + RAG placeholder datasets | **Yes** |
| Comparison + improvement register | **Yes** |
| LangSmith opt-in plumbing | **Yes** (credentials pending) |
| Live baseline revalidation | **No** — blocked on Gemini credits |
| Formal acceptance of RAG as teaching improvement | **No** — requires paired live evidence after this tollgate approval |
| Push / Render deploy | **No** — awaiting explicit approval |

**Verdict:** Tollgate 7B.5 evaluation infrastructure is complete for offline/replay experiment tracking. Phase 7C knowledge/RAG code already exists on this branch from prior work, but **formal Phase 7C acceptance and any push/deploy should wait for approval**. Do not treat offline RAG retrieval scores as live grounded-teaching proof.

---

## Scoring architecture preserved (Phase E)

1. **Math** — deterministic engines/oracles only; never LLM-as-math-authority.  
2. **Agent reliability** — tool selection, session isolation, animation auth (golden/live).  
3. **Teaching intelligence** — 0–4 rubrics + criterion scores (7B).  
4. **RAG quality** — interfaces/datasets prepared; scores not claimed as live teaching gains.

Calibration continues to require rejection of: wrong reasoning + right answer, wrong carry, premature Rabbit disclosure, fabricated history, unsupported methods, false evidence-based praise, misleading explanations.

---

## Hackathon evidence package

Checklist: `eval/HACKATHON_EVIDENCE.md`. Package remains understandable without LangSmith dashboard access; judges get local manifests, comparison tables, improvement register, and this report.

---

## Reproduction (offline)

```bash
python -m backend.agents.vedic_math_coach.eval.runners.cli offline --experiment-id rishi-7b-baseline
python -m pytest backend/tests/test_eval_infrastructure.py -q
python -m pytest backend/tests -q   # live suites skip without VEDIC_LIVE_EVAL
cd frontend && npm test -- --run
```

---

**Stop here. Awaiting approval before Phase 7C formalization, push, or deploy.**
