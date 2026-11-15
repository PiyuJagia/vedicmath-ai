# Phase 7C — Rishi RAG Implementation and Evaluation Report

**Branch:** `feature/google-adk-setup`  
**Status:** Implemented + offline-verified — **stop for approval before Phase 7D**  
**Knowledge version:** `7C.1`  
**Feature flag:** `VEDIC_KNOWLEDGE_RAG` (default **off**)

---

## 1. Source analysis

### Reference 1 — *Vedic Mathematics - Methods* (Vedamu)
- **URL:** `https://www.vedamu.org/veda/1795%24vedic_mathematics_methods.pdf`
- **Access:** Downloaded successfully (160 pages). Local PDF gitignored.
- **Useful material:** Nikhilam, Urdhva, Ekadhikena, Yavadunam, Ekanyunena chapters; complements; worked numerical patterns.
- **Use in pack:** Page-index references + independently rewritten explanations (no substantial reprint).

### Reference 2 — *Fundamentals & Applications of Vedic Mathematics* (SCERT Delhi, 2014)
- **URL:** `https://navavani.org.in/wp/wp-content/uploads/2017/07/FUNDAMENTALANDVEDICMATHEMATICS.pdf`
- **Access:** Downloaded successfully (65 pages). Local PDF gitignored.
- **Useful material:** Base methods, vertical/crosswise, squaring near bases, digit-sum devices, sixteen-sutra list.
- **Caveat:** Preface asserts Atharvaveda / Vedic origin. Treated as **disputed historical claim**, not established fact.

### Existing application knowledge
- Five engines with teaching steps + animation events (authoritative arithmetic).
- Progressive Rabbit hints; Rishi instructions; Phase 7B rubrics/fixtures.
- Internal research: `research_notes/Vedic maths teaching foundations/`.

Detailed mapping: `research_notes/sources/SOURCE_MAPPING_7C.md`.

---

## 2. Knowledge inventory

**24 approved entries** across:

| Area | concept_ids (examples) |
|---|---|
| Foundations | `foundation.place_value`, `.complements`, `.carrying`, `.algebraic_expansion`, `.unsupported_methods` |
| Nikhilam | overview, principle, alt explanation, understanding check, applicability |
| Urdhva | overview, principle, FOIL alt, applicability |
| Ekadhikena | overview, principle, geometric alt, applicability |
| Yavadunam | overview, principle, applicability |
| Ekanyunena | overview, principle, applicability |

Each entry carries `content_version`, `review_status`, `source_references`, optional misconceptions/examples.

---

## 3. Source mapping

See `SOURCE_MAPPING_7C.md` and `backend/knowledge/sources/references.json`.

Key app-compatibility notes:
- Only five sutras are `app_supported` interactive methods.
- Anurupyena/Paravartya → `foundation.unsupported_methods` boundary.
- **Nikhilam** uses `deviation = base - number`.
- **Yavadunam** uses `deviation = number - base` (documented difference; engines unchanged).

---

## 4. Mathematical validation

| Check | Result |
|---|---|
| `validate_knowledge_pack()` | ok — 24 entries, all 5 sutras covered |
| `verify_examples_against_engines()` | 0 errors |
| Independent Python products/squares | matched labeled `expected_result` |
| Derivations in pack | school-algebra identities (checked by construction + examples) |

Worked examples include engine-verified cases such as `98×97`, `23×14`, `35²`, `97²`, `7×99`.

---

## 5. Knowledge-base architecture

```text
backend/knowledge/
  concepts/*.json
  sutras/{nikhilam,urdhva,ekadhikena,yavadunam,ekanyunena}.json
  sources/references.json
  schemas.py | loader.py | retrieval.py | validation.py | _build_pack.py
```

**Retrieval order:** exact `concept_id` → lexical/keyword/alias scoring → controlled abstention.  
**No Pinecone / Postgres / vector index.**

Security:
- Only `review_status=approved_for_agent` is searchable.
- Retrieved text marked as untrusted reference (tool `security_note`).
- Cannot invent document IDs; sources come from entries only.
- Knowledge never overrides engine results.

---

## 6. Retrieval implementation (ADK tool)

**Tool:** `search_vedic_math_knowledge`  
**Registered in** `COACH_TOOLS` **only when flag on**; instructions append `instructions_knowledge_rag.md` only when flag on.  
**Flag:** requires `VEDIC_KNOWLEDGE_RAG=1` (default off preserves pre-7C coaching toolset)

### Example output (offline, flag on)

```text
question: "Why does Nikhilam work?"
→ ok=true
→ matched_concept_ids: sutra.nikhilam.overview, sutra.nikhilam.principle, sutra.nikhilam.alt_place_value
→ retrieval_method: lexical
→ content_version: 7C.1
→ source_references: curated document metadata (Vedamu/SCERT/app/research)
```

When flag off: `ok=false`, `code=knowledge_disabled` (pre-approval production behavior preserved for retrieval).

---

## 7. Rishi teaching examples (grounded patterns)

These are **designed tool+knowledge workflows**, not live Gemini transcripts:

1. **Why Nikhilam?** → `search_vedic_math_knowledge` + optional `calculate_sutra(98,97)` → algebra in child language + comprehension check.  
2. **Urdhva carry confusion** → retrieve `foundation.carrying` / Urdhva principle → explain place value; digits only from `get_lesson`.  
3. **Another way** → retrieve `*.alt_*` entries; avoid repeating the same wording.  
4. **Anurupyena request** → retrieve unsupported boundary; refuse fake animation.

Offline matched A/B fixtures: `eval/rag_before_after_fixtures.json` (explicitly **not** live improvement metrics).

---

## 8. Evaluation report (offline)

### Knowledge / retrieval suite
| Metric | Value |
|---|---|
| RAG golden cases | **33** (≥30 required) |
| Pass rate | **1.0** (33/33) |
| Hit rate (expected ok) | **1.0** |
| Precision@1 proxy | **1.0** |
| Incorrect retrieval rate | **0.0** |
| Abstention accuracy | **1.0** |
| Mean latency | ~3.8 ms |
| Acceptance gates | **passed** |

Per-category: concept_retrieval, exact_lookup, alias, misconception, alternate_explanation, difficulty, foundation, comparison, worked_example, abstention, unsupported_method, security, version — all **1.0**.

Artifacts: `eval/rag_retrieval_report.json`.

### Phase 7B offline (regression)
| Suite | Result |
|---|---|
| Teaching v2 fixtures | **27/27** |
| Judge calibration | **7/7** (unchanged framework) |

### Live Gemini
**Not run** (credits depleted / `VEDIC_LIVE_EVAL` unset). Do not treat offline scores as live teaching proof.

---

## 9. Before/after analysis

| Config | Status |
|---|---|
| A — Rishi without knowledge retrieval | Documented failure modes in offline fixtures (history-as-fact, hand-wavy carry, fake Anurupyena) |
| B — Rishi + approved pack | Offline fixtures show grounded algebra, carry place-value, unsupported abstention |

**Verdict:** Offline fixtures demonstrate *expected* pedagogical improvement when retrieval is used correctly.  
**Live comparative gain:** `pending_credits` — **not claimed**.

---

## 10. Full regression results

| Suite | Result |
|---|---|
| Backend pytest | **299 passed, 14 skipped** |
| Frontend Vitest | **158 passed** |
| Phase 7B offline eval | **27/27** |
| RAG retrieval eval | **33/33** |
| Rabbit hint-disclosure (in backend suite) | included / passing |
| Playwright | Not re-litigated; known unrelated Vite proxy/CORS smoke assert remains (Phase 7B note) |

No mathematical engine or animation-contract changes.

---

## 11. Risks and limitations

1. Live grounding / teaching-quality A/B still needed after credits return.  
2. `approved_for_agent` for v7C.1 is author/math-verified; recommend human educator review.  
3. Lexical retrieval may miss odd phrasings; expand aliases if live logs show misses.  
4. Copyright: PDFs are research references only (gitignored); pack stores original summaries + citations.  
5. Feature flag must stay off in production until approval.  
6. Vendor `vedicpy` module still prints a stray `39` on some imports (pre-existing; unrelated).

---

## 12. Recommendation for Phase 7D (proactive coaching)

Approve 7C as the conceptual knowledge backbone, then:

1. Fund credits → live RAG+tool golden / TQ / journey re-baseline.  
2. Wire learner events (wrong deviation, carry fail, hint level up) to `misconception_id` / `concept_id` retrieval.  
3. Proactive Rishi nudges only from approved concepts + engine evidence (never fabricated history).  
4. Human review pass on knowledge entries before flipping `VEDIC_KNOWLEDGE_RAG` default on.  
5. Still no Pinecone until measured lexical failure rate justifies it.

---

## Example transcript sketch (offline-designed)

```text
Learner: Why does Nikhilam work?
Rishi tools: search_vedic_math_knowledge(question=..., sutra_id=nikhilam)
         calculate_sutra(nikhilam, 98, 97)   # optional verified numbers
Rishi: [Rishi]
Near 100 we rewrite factors using base − number (this app’s rule).
98→2, 97→3. Algebra: (100−2)(100−3)=100×95+6=9506.
Shall we check what deviation 98 should be on the stage?
```

**Stop for approval.** No deploy / push performed.
