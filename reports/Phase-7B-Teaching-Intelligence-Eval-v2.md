# Phase 7B — Teaching Intelligence Evaluation v2

**Branch:** `feature/google-adk-setup`  
**Status:** Complete offline — **stop for approval before Phase 7C**  
**Mode:** Offline-first (no live Gemini spend). Live LLM-as-judge / golden / journey remain blocked until funded credits + `VEDIC_LIVE_EVAL=1`.

---

## 1. Files changed

### Evaluation framework (new / expanded)
| Path | Role |
|---|---|
| `backend/agents/vedic_math_coach/eval/rubrics.py` | 0–4 rubric criteria + heuristics |
| `backend/agents/vedic_math_coach/eval/hint_disclosure.py` | Engine-authored disclosure oracle (digit, paraphrase, premature L1/L2 expression) |
| `backend/agents/vedic_math_coach/eval/intermediate_claims.py` | Intermediate-equation arithmetic oracle |
| `backend/agents/vedic_math_coach/eval/offline_fixtures.json` | 27 labeled good/bad fixtures |
| `backend/agents/vedic_math_coach/eval/teaching_v2_scoring.py` | Offline scorer + report writer |
| `backend/agents/vedic_math_coach/eval/teaching_v2_offline_report.json` | Full offline run artifact |
| `backend/agents/vedic_math_coach/eval/artifacts/phase7b_offline_summary.json` | Compact metrics summary |
| `backend/agents/vedic_math_coach/eval/artifacts/phase7b_judge_calibration.json` | 7/7 calibration results |
| `backend/tests/test_teaching_v2_offline.py` | Deterministic unit + suite gates |
| `backend/tests/live_gate.py` | Opt-in live Gemini gate (`VEDIC_LIVE_EVAL=1`) |
| `.env.example` | Documents `VEDIC_LIVE_EVAL` |

### Test gating (no production learning change)
- `test_gemini_connectivity.py`, `test_vedic_math_coach.py`, `test_coach_chat.py`, `test_coach_eval.py`, `test_teaching_quality_eval.py` — live suites require explicit opt-in so depleted credits cannot break offline regression.

**Not changed:** mathematical engines, animation contracts, learner-facing production pedagogy beyond eval/test infrastructure.

---

## 2. Review of existing evaluations — coverage & gaps

| Corpus | Size | Role | Gap found |
|---|---:|---|---|
| Golden scenarios | **31** | Live ADK end-to-end expects | `last_report.json` is all-fail from **402 RESOURCE_EXHAUSTED**; no fresh live pass rate |
| Teaching-quality cases | **32** | Broader pedagogy prompts | Same live blockage; few machine oracles for “why” / intermediate steps |
| Judge-calibration tests | **7** | Known-bad must fail `_score_expect` | Regex/exclusion based; weak on paraphrase hint leaks & equation truth |
| Phase 7A Rabbit protection | Progressive hint tool + deterministic path | Strong for L1–L3 packets | Needed engine-grounded disclosure eval beyond redaction regex |
| ADK tool traces / sims | Phase 7A artifacts | Qualitative | Not a regression metric pack |

**Weak metrics addressed in 7B:** intermediate-step accuracy, conceptual cues, hint paraphrase/expression leakage, evaluator sensitivity to known-bad, per-category rates (not only overall %), offline vs live mode labeling.

---

## 3. Expanded evaluation dataset

`offline_fixtures.json` **v7B.1 — 27 fixtures** (labeled `good` / `bad`):

| Category | n | Intent |
|---|---:|---|
| conceptual | 2 | Why-Sutra + misconception diagnosis |
| adversarial | 9 | Known-bad explanations the evaluator must reject |
| hint_leakage | 11 | L1–L3 direct, paraphrase, product, expression, multi-turn, operand false-positive |
| safety | 1 | Unsupported-method abstention (good) |
| persona | 2 | Hummingbird + age-appropriate Rishi |
| guidance | 2 | Next-step practice + context-relevant practice step |

Adversarial failures covered: wrong intermediate with correct result, wrong carry story, wrong Sutra label, fabricated history, unsupported method as launched, generic praise as evidence, misleading concept, age-inappropriate language, missed misconception, Rabbit premature reveal.

---

## 4. Scoring rubrics (0–4, pass ≥ 3)

| Criterion | How scored offline |
|---|---|
| Mathematical grounding | Verified `calculation.result` / `sutra_id` vs expect |
| Intermediate-step accuracy | Parsed equations checked by arithmetic oracle |
| Conceptual understanding | Required conceptual cues present |
| Age appropriateness | Banlist / length heuristic |
| Misconception diagnosis | Required error-pattern cues |
| Hint quality | Engine disclosure packet + paraphrase + premature expression |
| Persona appropriateness | Speaker id match |
| Context relevance | Context cue hits |
| Next-step guidance | Practice / next-action cues |
| Unsupported abstention | Bans launch claims; rewards honest limitation |
| Instructional usefulness | No fabricated mastery/history |

Arithmetic truth is **never** delegated to an LLM judge. Optional LLM-as-judge remains `optional_not_run_offline`.

---

## 5. Actual offline evaluation results

**Source of truth:** `teaching_v2_offline_report.json`  
**Latency:** ~0.02s for full offline fixture pass (no LLM cost).

| Metric | Value | Notes |
|---|---|---|
| Mode | `offline` | Simulated / labeled fixtures — **not** live Gemini |
| Fixtures | 27 / 27 passed | Evaluator acceptance of good + rejection of bad |
| Pass rate | **1.0** | Per-fixture eval gate |
| Evaluator sensitivity (known-bad) | **1.0** | All adversarial fixtures correctly rejected |
| Evaluator acceptance (known-good) | **1.0** | All good fixtures accepted |
| Live LLM judge | not run | Credits depleted |

### Per-category pass rates

| Category | n | pass_rate |
|---|---:|---:|
| conceptual | 2 | 1.0 |
| adversarial | 9 | 1.0 |
| hint_leakage | 11 | 1.0 |
| safety | 1 | 1.0 |
| persona | 2 | 1.0 |
| guidance | 2 | 1.0 |

### Aggregates on **label=good** fixtures only

| Aggregate | Score (0–1 normalized) |
|---|---:|
| mathematical_grounding | 1.0 |
| intermediate_step_accuracy | 1.0 |
| conceptual_understanding | 1.0 |
| age_appropriateness | 1.0 |
| misconception_diagnosis | 1.0 |
| hint_quality | 1.0 |
| persona_appropriateness | 1.0 |
| context_relevance | 1.0 |
| next_step_guidance | 1.0 |
| unsupported_abstention | 1.0 |

Hint-leakage rate on good Rabbit fixtures: **0** (all disclosure checks passed).  
Unsupported-method rejection: covered by adversarial `bad_anurupyena_as_feature` + good abstention fixture (sensitivity 1.0).

---

## 6. Judge-calibration results

`artifacts/phase7b_judge_calibration.json` — **7 / 7 passed** (offline deterministic):

1. Teaching-quality dataset ≥ 30  
2. Golden dataset intact (≥ 25; actual 31)  
3. Reject correct answer + wrong explanation text  
4. Reject generic feedback as personalized  
5. Reject Rabbit answer dump  
6. Reject wrong Sutra on calculation payload  
7. Reject unnecessary animation-launch claim  

---

## 7. Failure examples (known-bad — correctly rejected)

| Fixture id | Failure mode |
|---|---|
| `bad_correct_result_wrong_intermediate` | Result 9506 but `100−98=8` |
| `bad_wrong_carry_story` | “Always carry when you feel like it” |
| `bad_wrong_sutra_label` | Claims Urdhva / `sutra_id=urdhva` for Nikhilam task |
| `bad_fabricated_history` | Invented streak / mastery |
| `bad_anurupyena_as_feature` | Claims launched unsupported animation |
| `bad_generic_praise_as_evidence` | Praise as proof of mastery |
| `bad_misleading_concept` | “Any random base” |
| `bad_age_inappropriate` | Insults / “magical sutra” |
| `bad_misconception_ignored` | Ignores wrong-deviation evidence |
| `bad_rabbit_l1_direct_leak` | States deviation digit at L1 |
| `bad_rabbit_l1_paraphrase_leak` | “distance … is two” |
| `bad_rabbit_l1_expression_leak` | Premature `100 − 98` at L1 |
| `bad_rabbit_l2_product_leak` | Full product 9114 |
| `bad_rabbit_l3_states_answer` | Evaluates expression to digit |
| `bad_rabbit_indirect_answer_rephrase` | “two short … enter” |
| `bad_multi_turn_hint_circumvention` | Safe L1 then “Type 2” |

---

## 8. Regression (offline)

| Suite | Result |
|---|---|
| Backend pytest (live gated off) | **285 passed, 14 skipped** |
| Frontend Vitest | **158 passed** (12 files) |
| Teaching v2 + calibration | **18 passed** |
| Playwright (smoke + practice + nikhilam animation + rishi-ux) | **20 passed, 1 failed** — failure is `smoke` CORS origin assert under Vite proxy (`5175` vs direct `8010`); unrelated to teaching eval / engines. Live coach-journey deferred (credits). |

Live suites skip unless `VEDIC_LIVE_EVAL=1` **and** funded `GOOGLE_API_KEY`.

---

## 9. Remaining live-validation requirements

Before claiming production teaching quality against Gemini:

1. Fund Google AI Studio credits (resolve 402 RESOURCE_EXHAUSTED).  
2. Set `VEDIC_LIVE_EVAL=1`.  
3. Re-run: golden 31, teaching-quality 32, live coach persona/multi-turn, coach-journey Playwright.  
4. Optional LLM-as-judge on `judge_explanation: true` cases — report latency + cost separately from offline.  
5. Clearly label any live report `mode: live_gemini` vs `mode: offline`.

---

## 10. Recommendation for Phase 7C

**Approve Phase 7B as the offline evaluation backbone.** Phase 7C should focus on product teaching improvements **driven by live gaps**, not more fixture scaffolding:

1. **Live re-baseline** once credits return (golden + TQ + journey).  
2. **Wire disclosure oracle into CI** as a hard gate on Rabbit deterministic path + any LLM Rabbit replies.  
3. **Misconception / carry micro-lessons** for the highest-frequency wrong patterns (swap deviation order, premature carry).  
4. **Context-conditioned next steps** (theory → practice; stuck step → Rabbit L1 only).  
5. Avoid changing math engines / animation contracts unless a live arithmetic discrepancy appears.

---

## Explicit mode distinction

| Artifact | Mode |
|---|---|
| `teaching_v2_offline_report.json` | **Offline simulated / labeled** |
| `phase7b_judge_calibration.json` | **Offline deterministic** |
| `last_report.json` (golden) | **Stale live failure (402)** — do not treat as teaching quality |
| Future funded Gemini runs | Must set `mode: live_gemini` |

**Stop for approval.** No deploy / push performed.
