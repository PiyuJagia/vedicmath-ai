# Rishi Teaching Intelligence Assessment Report

**Branch:** `feature/google-adk-setup`  
**Date:** 2026-11-14  
**Scope:** Audit + design only (no product-feature implementation authorization)  
**Standard:** Would this help a child understand the idea, build confidence, correct a misconception, and become a better independent problem-solver?

---

## 1. Executive assessment

We have a **strong tutoring substrate** (deterministic maths engines, typed handoff, Theory/Practice live chat, personas, session continuity, 29/29 golden math/safety cases) but we are still **closer to a capable reactive coach than to Rishi as a continuous teaching companion**.

| Vision pillar | Current maturity |
|---|---|
| Correct maths via tools | High |
| Warm conversational explanations | Medium–High (often excellent; sometimes verbose / “magical”) |
| Persona system (Boy Coach / Rabbit / Hummingbird) | Medium–High when prompted; reactive |
| **Rishi identity** in UI & instructions | Low (still “Boy Coach” / “Coach”) |
| Proactive tutoring | **Not implemented** (scripted demo lines only) |
| Evidence-based personalization | Low (no mastery memory; session only) |
| Conceptual knowledge pack beyond engine steps | Low–Medium (engines = procedures; little curated “why” KB) |
| Teaching-quality evaluation | Improving (new 32-case suite + calibration; live TQ suite not yet gated) |

**Verdict:** Architecturally ready for a focused teaching-intelligence program. Do **not** start with Pinecone. Highest leverage: Rishi identity + curated conceptual pack + event-driven proactive coaching + stronger pedagogical eval.

---

## 2. Current capability inventory

| Capability | Status |
|---|---|
| `calculate_sutra` / `get_lesson` / `check_practice_answer` | Implemented + verified |
| `/coach/chat` + learning context validation | Implemented + verified |
| Theory/Practice LiveCoachAsk behind feature flag | Implemented + verified (Playwright) |
| Session continuity (sessionStorage + ADK session) | Implemented + verified (browser journey) |
| Watch/open animation handoff (verified calculation_id) | Implemented + verified |
| Golden math/safety/persona suite (29 cases) | Implemented + verified (29/29 @ 1.0) |
| Scripted `demoCoach` Theory/Practice lines | Implemented + verified |
| Progressive practice hints (frontend, deterministic) | Implemented + verified |
| Display name **Rishi** | **Not implemented** (registry: “Coach”; tags: `[Boy Coach]`) |
| Event-driven proactive coaching | **Not implemented** |
| Misconception diagnosis from attempt history | **Partial** (engine `mistake` codes in practice UI; live coach not systematically consuming them) |
| Long-term learner memory (Postgres) | **Not implemented** |
| RAG / knowledge search tool | **Not implemented** |
| Teaching-quality eval suite (32 cases + calibration) | **Implemented (fixtures + calibration verified); live suite soft-gated, optional** |

---

## 3. Learner simulation results

**Method:** Live HTTP calls to `http://127.0.0.1:8010/coach/chat` with structured context.  
**Artifact:** `backend/agents/vedic_math_coach/eval/artifacts/teaching_simulations.json`  
**All 15 turns:** HTTP 200.

### Scenario table (condensed)

| Scenario | Expected | Actual | Issues | Severity | Improvement |
|---|---|---|---|---|---|
| A1 What is Nikhilam? | Simple intro, check understanding | Warm, correct idea of base/deviation; long; “magical”; Sanskrit dump | Overlength; mystique framing | Med | Rishi style: shorter; avoid “magic”; introduce Rishi |
| A2 Why base 100? | Context-aware, child-level | Excellent landmark analogy; asks follow-up | Slightly long | Low | Keep; tighten |
| A3 Why subtracting? | Re-explain without overwhelm | Strong chocolate-box analogy; called `calculate_sutra` | Offered Watch while Theory stage is lesson-owned | Med | Separate “explain” vs “offer animation” |
| A4 Verified example | Tool-grounded steps | Used tool for 96×97=9312; clear steps | Good | — | Prefer current Theory example unless asked otherwise |
| A5 What next? | App-real next step | Recommended Practice + other sutras | Mentions paths app may not unlock yet | Low | Tie to real routes / progress state |
| B1 Wrong deviation (fixture said incorrect, answer “2”) | Diagnose using engine | Said learner was right; 2 is math-correct for 98 | Fixture inconsistent; coach ignored `check_status` | High (process) | Bind `check_practice_answer` to `question_key`; trust engine status for that key |
| B2 Frustration + hint | Empathy + hint, no answer dump | Switched to Rabbit; good number-line hint | Also attached watch_animation | Med | Hint path should not auto-offer watch |
| B3 Rabbit visual hint | Progressive hint | Revealed “for 98 … drops by **2**” | Answer leak | High | Rabbit policy: never state the target digit on early hints |
| B4 Sign confusion | Sign convention help | Clear `base − number` explanation | Good | — | Encode as misconception pack |
| B5 Hummingbird cheer | Encouragement only | Perfect Hummingbird turn | Good | — | Automate on correct-after-struggle events |
| C1 Algebraic why | Tool + algebra | Excellent identity-level proof + 9506 | Dense for some ages | Low | Offer “simple / algebra” depth modes |
| C2 Nikhilam vs Urdhva | Accurate contrast | Clear selection rule | Good | — | Curate into KB |
| C3 Harder advanced | Verified advanced calc | 9998×9997=99950006 grounded | Good | — | — |
| C4 Out of range | Honest refusal | Engine range message + good guidance | Mentions Anurupyena (unsupported in app) | Med | Label unsupported methods; prefer Urdhva in-app |
| C5 Other sutra for 23×14 | Honest comparison | Tool-verified 322; Urdhva walkthrough | Mentions Anurupyena again | Med | Same as above |

### Critical product insight from B1

`learner_answer=2` for deviation of 98 **is mathematically correct**. The simulation’s `check_status=incorrect` was a bad fixture. The coach re-checked with tools and told the truth. **Keep tool authority**—but also teach the agent: when `question_key` + `check_status` disagree with a fresh check, explain the mismatch rather than silently discarding UI status.

---

## 4. Pedagogical gaps

1. **Identity gap:** Vision says Rishi; product says Boy Coach / Coach.
2. **Reactive-only live AI:** No welcome-on-enter, no mistake-triggered Rabbit, no completion Hummingbird without being asked.
3. **Dual coach surfaces:** Practice shows scripted demo + live Ask — clear labels help, but learners may not know which is “real Rishi.”
4. **Engine teaching_steps are procedural** (base → deviations → combine), not conceptual essays; “why” depends on Gemini improvisation.
5. **Hint leakage:** Rabbit sometimes states the target value.
6. **Unsupported method mentions** (Anurupyena) without app support.
7. **Verbosity / mystique** (“magical sutras”) vs calm school tutor.
8. **No evidence-based insight objects** (observation → evidence → action).
9. **Eval gap:** 29/29 proves tool/math/persona compliance more than teaching quality; result-in-text ≠ intermediate grounding.
10. **No persistent memory** → cannot honestly personalize mastery claims.

---

## 5. Rishi proactive coaching design

### 5.1 Principles

- Event-triggered, not polling Gemini every N seconds.
- Prefer deterministic templates; call Gemini only when personalization needs context.
- Never claim memory that does not exist.
- Never reveal answers in early hints.
- Respect “learner is typing / focused” quiet window.

### 5.2 Event → behavior (proposed)

| Event (verified) | Persona | Mode | Behavior |
|---|---|---|---|
| Enter Theory first time (sutra+difficulty) | Rishi | Deterministic | 1–2 sentence welcome + “Ask me anytime” |
| Animation step change (optional, throttled) | Rishi | Deterministic | Soft comprehension prompt (max 1 / 3 steps) |
| Practice `check` incorrect ≥2 | Rabbit | Rule → optional Gemini | Progressive hint from engine hints / misconception tag |
| Practice correct after ≥2 wrong | Hummingbird | Deterministic | Short effort celebration |
| Level complete | Rishi | Deterministic + progress | Next: Practice / Learn More / next difficulty |
| Return unfinished (session flag) | Rishi | Deterministic | “Continue where you left off?” |
| Idle ≥45s with empty answer (optional) | Rishi | Deterministic | Dismissible “Need a rabbit hint?” |
| Explicit Ask | Routed | Gemini + tools | Current `/coach/chat` |

### 5.3 Safeguards

- Cooldown map per `(session, event_type)` in sessionStorage / later Postgres.
- Mute levels: All / Hints only / Off.
- Suppress while input focused + recent keypress < 8s.
- Deduplicate identical proactive text.
- Proactive payloads never include `correct_answer`.
- Backend validates event payloads the same way as chat context.

### 5.4 UI integration

- Reuse `LiveCoachAsk` + character components; add a slim `ProactiveBanner` above Ask (not a second avatar system).
- Keep scripted frame lines for animation sync; live Rishi for Ask + event coaching.

### 5.5 Testing

- Unit: cooldown, mute, quiet window.
- Golden: no-interrupt, no-answer-leak, persona routing.
- Playwright: Theory enter → proactive welcome appears once; Practice double-miss → Rabbit hint once.

---

## 6. Vedic Maths RAG proposal

**Research report:** `reports/Vedic maths teaching foundations.md`  
**Notes:** `research_notes/Vedic maths teaching foundations/`

### Existing knowledge

- Python engines + `teaching_steps` / animation events  
- Frontend theory ideas, narration, practice hints, `mistake` feedback  
- Coach `instructions.md` (persona + tool rules; little conceptual depth)

### Missing

- Levelled “why it works”, misconception libraries, analogies, applicability limits, sutra comparison cards, reviewed references, history_status (disputed Vedic provenance).

### Recommendation: **Option A — No RAG yet**

Ship a **curated Markdown/JSON knowledge pack** per sutra (keyed by `sutra_id` + topic), loaded via a read-only tool such as `get_vedic_concept(sutra_id, topic)` — **not** vector search.

| Option | Recommendation |
|---|---|
| A Tools + curated pack | **Do now** |
| B Local/ADK FilesRetrieval | Later if pack >> prompt budget |
| C Pinecone | **Defer** until multi-tenant / large corpus |

**Hard rule:** Retrieval never overrides calculations, checks, or animation payloads.

**Eval before claiming benefit:** matched baseline vs concept-tool coach on conceptual clarity, misconception handling, unsupported claims, latency, cost.

---

## 7. Agent evaluation report

### Baseline (existing)

- 29/29 golden cases, aggregates 1.0 (math, persona, safety, animation, isolation, explanation_judge).

### New this audit

| Artifact | Result |
|---|---|
| `teaching_quality_cases.json` | **32** scenarios (conceptual, misconception, hinting, personalization, proactive policy, all 5 sutras) |
| `test_teaching_eval_calibration.py` | **7 passed** — known-bad responses correctly fail |
| `test_teaching_quality_eval.py` | Live soft-gated suite (≥0.6) — optional; not fully run in this pass (time) |
| Teaching simulations | 15/15 live turns captured |

### Calibration false-positives caught

- Correct final answer + wrong explanation text  
- Fake mastery / streak claims  
- Rabbit answer dump  
- Wrong sutra_id on calculation  
- Fake animation launch claim  

### Remaining eval debt

- Intermediate-step claim checking beyond result-in-text  
- Rubric 0–4 multi-criteria judge with raw scores  
- Forced live run of all 32 TQ cases + report in CI nightly  

---

## 8. UI/UX audit

**Ports used:** API `8010`, Vite `5175` (verified listening).  
**Playwright:** `e2e/rishi-ux-audit.spec.ts` — 3/3 passed.

Screenshots:

- `frontend/e2e/screenshots/rishi-audit-theory-collapsed.png`
- `frontend/e2e/screenshots/rishi-audit-theory-expanded.png`
- `frontend/e2e/screenshots/rishi-audit-practice.png`
- `frontend/e2e/screenshots/rishi-audit-theory-mobile.png`
- Prior journey: `coach-journey-*.png`

### Observations

| Question | Finding |
|---|---|
| Is Rishi visible? | Boy Coach art is central; **name “Rishi” absent** |
| Overcrowded? | Practice: workspace + demo dialogue + character + live Ask + suggestions — **dense** |
| Ask discoverable? | Theory: secondary “Ask AI Coach” toggle — OK for flag; easy to miss |
| Characters clear? | Demo labelled “Scripted demo coach”; live labelled — good honesty |
| Next step clear? | Theory footer CTA strong; live coach next-step advice not always route-true |
| AI ↔ animation connected? | Context passes frame; live chat does not drive stage (correct); cognitive link still weak |
| Continuous journey? | Session continuity works; feels like chat bolted onto lesson, not yet one tutor |

**Needs human learner study:** Hint discoverability, whether children open Ask, whether dual coaches confuse, age-fit of long algebraic replies.

---

## 9. Prioritized improvement backlog

### Quick wins (high education / low–medium complexity)

1. Display **Rishi** (compat: keep `boy_coach` id; change display strings + registry name).  
2. Instructions: shorter turns, no “magic”, Rabbit no early answer digits, don’t invent unsupported sutras.  
3. Wire practice `mistake` codes into chat context.  
4. Run full TQ live suite; fix failing teaching cases.  
5. Theory Ask default copy: “Ask Rishi…”

### Medium

6. Curated concept pack + `get_vedic_concept` tool (Option A).  
7. Event-driven proactive layer (deterministic first).  
8. Insight object schema for evidence-based feedback.  
9. Intermediate mathematical claim checks in eval.  
10. Practice UI density pass (collapse live Ask until needed).

### Larger / later

11. Postgres learner memory tools.  
12. Mastery-aware recommendations.  
13. Games integration for Rishi.  
14. Pinecone only if corpus/auth multi-tenant needs justify it.

---

## 10. Proposed development tollgates

| Tollgate | Deliverables | Tests / exit |
|---|---|---|
| **7A — Rishi identity & voice** | Display name Rishi; instructions rewrite; Rabbit hint leak rules | Persona tests; simulation rubric; no ID breaks |
| **7B — Teaching eval v2** | 30+ TQ live green; calibration suite; intermediate grounding | Pass rate ≥0.85 teaching; 100% calibration fails on known defects |
| **7C — Curated concept pack** | 5 sutra Markdown/JSON packs + `get_vedic_concept` | Tool unit tests; conceptual goldens; no math override |
| **7D — Proactive coaching v1** | Event bus + cooldowns + mute; deterministic welcomes/hints/celebrations | Unit + Playwright; no spam; no answer leak |
| **7E — Evidence insights** | Insight schema from check/mistake/hint evidence | Fixture tests; forbid unsupported mastery claims |
| **7F — Memory readiness** | Design-only contract for Postgres tools | Schema review; no deploy required |
| **7G — RAG revisit** | Re-evaluate only if pack size or multi-tenant needs explode | Written decision record |

---

## 11. Answers to architecture questions

1. **One root ADK agent** with tools + persona tags remains best; specialist sub-agents add complexity without teaching gains at this size.  
2. **Initiation:** frontend/backend verified events → policy → optional Gemini.  
3. **Deterministic:** welcomes, celebrations, cooldowns, mute. **Gemini:** Ask turns, deep why, cross-sutra Q&A with tools/concepts.  
4. **Rabbit ↔ animation:** pass `frame_index` / step ids; Rabbit may only describe `get_lesson` events.  
5. **Misconceptions:** use `check_practice_answer` + `mistake` codes + hint level — never invent diagnosis.  
6. **Smallest KB:** 5 sutra files × (why, levels, misconceptions, limits, analogies, history_status).  
7. **Lightweight keyed retrieval** yes; semantic RAG unnecessary now.  
8. **Pinecone: defer.**  
9. **Postgres:** append-only learning events; coach reads via trusted tools only.  
10. **Measure:** TQ rubrics, hint-before-answer rate, recovery after mistakes, time-to-correct, learner studies — not chat volume.  
11. **Out of scope until memory:** cross-device personalization, “you always struggle with carries,” mastery streaks as facts.  
12. **Greatest education / least architecture:** Rishi voice + concept pack tool + proactive deterministic events + teaching eval v2.

---

## 12. Artifacts produced this audit

- `reports/Rishi Teaching Intelligence Assessment.md` (this file)  
- `reports/Vedic maths teaching foundations.md`  
- `research_notes/Vedic maths teaching foundations/*`  
- `backend/agents/vedic_math_coach/eval/teaching_quality_cases.json` (32)  
- `backend/agents/vedic_math_coach/eval/artifacts/teaching_simulations.json`  
- `backend/tests/test_teaching_eval_calibration.py`  
- `backend/tests/test_teaching_quality_eval.py`  
- `frontend/e2e/rishi-ux-audit.spec.ts` + screenshots  

**Stop for architectural approval before implementing 7A–7E product changes.**
