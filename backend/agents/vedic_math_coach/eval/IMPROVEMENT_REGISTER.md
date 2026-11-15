# Improvement register

Links engineering changes to evaluation evidence.  
**Do not claim measured improvements when only implementation completion was verified.**

| ID | Tollgate | Problem | Hypothesis | Components | Git / patch | Baseline experiment | Candidate experiment | Metric changes | Regressions | Decision | Rationale |
|---|---|---|---|---|---|---|---|---|---|---|---|
| IMP-7A-hints | 7A | Premature Rabbit answer dumps | Level-gated engine hints reduce leakage | `progressive_hints.py`, deterministic hint path | See Phase 7A commits on branch | pre-7A qualitative | `rishi-7b-baseline` offline hint suite | Offline hint-disclosure sensitivity 1.0 (fixtures) | None observed offline | **accepted** (offline) | Live leakage rate still pending credits |
| IMP-7B-eval | 7B | Weak teaching metrics / adversarial gaps | Rubrics + known-bad fixtures improve evaluator trust | `offline_fixtures.json`, `rubrics.py`, `hint_disclosure.py` | Phase 7B | n/a (infra) | `rishi-7b-baseline` | 27/27 offline; 7/7 calibration | None | **accepted** | Offline evaluator integrity; not live teaching proof |
| IMP-7B.5-infra | 7B.5 | No reproducible experiment chain | Manifests + LangSmith opt-in enable before/after evidence | `eval/runners`, `observability`, dataset catalog | this tollgate | n/a | n/a | Infra only | n/a | **pending approval** | Enables measurable 7C/7D comparisons |
| IMP-7C-rag | 7C | Conceptual explanations ungrounded | Curated retrieval improves grounding | knowledge pack + `search_vedic_math_knowledge` | present on branch from prior work | `rishi-7b-baseline` | `rishi-7c-rag-v1` (planned live pair) | Offline retrieval 33/33 prepared; **live teaching delta pending** | TBD | **pending** | Wait for 7B.5 approval + live paired eval before accepting as teaching improvement |
| IMP-7D-proactive | 7D | Coaching not event-driven | Event hooks improve relevance without spam | TBD | TBD | `rishi-7c-rag-v1` | `rishi-7d-proactive-v1` | TBD | TBD | **not started** | Requires approved 7C + eval infra |

## How to add a row

1. Create baseline experiment run (`offline` or `live`).
2. Implement change on a known commit/patch fingerprint.
3. Create candidate experiment with the **same** dataset + rubric + mode.
4. Run `compare` on the two manifests.
5. Fill metric deltas and decision.
