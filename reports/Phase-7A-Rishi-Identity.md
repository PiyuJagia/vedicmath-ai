# Phase 7A — Rishi Identity & Teaching Quality

**Branch:** `feature/google-adk-setup`  
**Status:** Implemented + tested (live Gemini partially blocked by depleted AI Studio credits)

---

## 1. Files changed

### Backend
- `agents/vedic_math_coach/instructions.md` — Rishi voice, progressive hints, unsupported-method rules
- `agents/vedic_math_coach/personas.py` — `[Rishi]` + legacy `[Boy Coach]` → `boy_coach`
- `agents/vedic_math_coach/agent.py` — description update
- `agents/vedic_math_coach/tools/progressive_hints.py` — **new** level-gated hint packets + redaction
- `agents/vedic_math_coach/tools/__init__.py` — register `get_progressive_hint`
- `agents/vedic_math_coach/handoff/schemas.py` — display_name **Rishi**
- `agents/vedic_math_coach/handoff/chat_service.py` — strip `[Rishi]`; redact Rabbit leaks
- `agents/vedic_math_coach/handoff/context.py` — attach progressive hint packets; unsupported-sutra notice
- `agents/vedic_math_coach/handoff/deterministic_hint.py` — **new** LLM-free Rabbit path
- `agents/vedic_math_coach/handoff/api.py` — serve deterministic hints before ADK
- `eval/golden_cases.json` — Rishi greeting + Anurupyena + Rabbit leak cases (31 total)
- Tests: `test_progressive_hints.py`, updates to coach/persona/eval tests

### Frontend
- `characters/registry.ts` — name **Rishi**
- `characters/Characters.tsx` — clearer scripted vs live label
- `components/coach/LiveCoachAsk.tsx` — “Ask Rishi”
- `pages/practice/PracticePage.tsx` — Ask collapsed by default (`compact`)
- `services/coach.ts` — welcome mentions Rishi
- E2E + unit test updates

---

## 2. Before / after — Rishi responses

| | Before (audit) | After (7A) |
|---|---|---|
| Identity | “Boy Coach” / “Coach” | Display **Rishi** (`id` still `boy_coach`) |
| Intro style | Long, “magical sutras”, Sanskrit dump | Captured live: *“Namaste! I am Rishi, your Vedic Math coach… one thoughtful step at a time…”* (display_name Rishi) |
| Instructions | Generic coach | Concise, no mystique, follow-up questions, no fake mastery |

*Note: Further free-form Rishi turns after the first sample returned HTTP 503 because Gemini AI Studio prepaid credits were depleted (`RESOURCE_EXHAUSTED`). Deterministic Rabbit path still works.*

---

## 3. Rabbit hint progression (verified packets)

For Nikhilam `98 × 93`, `question_key=deviation_a` (forbidden includes `2`, product `9114`):

| Level | Allowed text (served as Rabbit) |
|---|---|
| **1** | Look at how far 98 sits from the base on the number line… below or above? |
| **2** | Use base − number. Base is 100. Find the distance… without rushing to a final product. |
| **3** | Work out 100 − 98. Finish the arithmetic yourself. |

Live HTTP (deterministic path): all three returned `speaker=rabbit`, `tools_used=["get_progressive_hint"]`, **no answer digit `2`**.

Adversarial redaction: if Rabbit prose still contains a forbidden token at levels 1–2, `chat_service` replaces it with `…`.

---

## 4. Unsupported-method guardrail

- Instructions: do not present Anurupyena / unimplemented sutras as app features.
- Context preamble repeats supported-sutra list.
- Golden case `unsupported_anurupyena_not_app_feature` added.
- Live confirmation blocked by credit depletion; rule is in prompt + eval suite for when Gemini is available.

---

## 5. UI screenshots

- `frontend/e2e/screenshots/rishi-audit-theory-collapsed.png`
- `frontend/e2e/screenshots/rishi-audit-theory-expanded.png` (Ask Rishi)
- `frontend/e2e/screenshots/rishi-audit-practice.png` (scripted lesson coach + Ask Rishi toggle)
- `frontend/e2e/screenshots/rishi-audit-theory-mobile.png`

Density: Practice Ask starts **collapsed**; demo tag reads *Lesson coach (scripted) · Ask Rishi for live help*.

---

## 6. Test results

| Suite | Result |
|---|---|
| Backend pytest (excl. long live) | **281 passed**, 6 deselected |
| Progressive hint / Rishi identity tests | **7 passed** |
| Frontend Vitest | **158 passed** |
| Playwright Rishi UX audit | **3 passed** |
| Playwright coach-journey | **Failed** — `/coach/chat` 503 (Gemini credits depleted) |
| Golden live suite (31 cases) | **Not completed** — same billing block |

---

## 7. Teaching-quality evaluation comparison

| Metric | Pre-7A | Post-7A |
|---|---|---|
| Baseline golden set size | 29 | **31** (+Anurupyena, +Rabbit leak) |
| Calibration (known-bad fails) | 7/7 | Still green |
| Hint safety | Prompt-only | **Packets + deterministic Rabbit + redaction** |
| Identity in API | Boy Coach | **Rishi** display_name |
| Live TQ / full golden | 29/29 historically | Re-run pending credits |

---

## 8. Remaining limitations

1. **Gemini AI Studio credits depleted** — free-form Rishi chat and full golden live re-score blocked until billing is restored.
2. Deterministic Rabbit path covers **hint-cue + hint_level + problem operands** only; general Q&A still needs Gemini.
3. No proactive coaching yet (Phase 7D).
4. No curated concept pack / RAG (Phase 7C).
5. Internal enum still named `Boy Coach` / id `boy_coach` by design for compatibility.

---

**Stop for approval before Phase 7B.**
