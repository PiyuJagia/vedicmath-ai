# Experiment family: `rishi-7c-rag-v1`

**Intent:** Paired comparison vs `rishi-7b-baseline` after curated knowledge retrieval is approved.

**Do not claim live teaching gains until a live paired run completes with credits.**

**Planned configuration**
- Same model / rubrics / golden prompts as baseline
- Additional tool: `search_vedic_math_knowledge` (`VEDIC_KNOWLEDGE_RAG=1`)
- Datasets: baseline suites + `rag_retrieval_cases` (offline lexical) + live TQ/golden when available

**Offline retrieval prep (not live teaching):**
```bash
python -m backend.agents.vedic_math_coach.eval.runners.cli offline --experiment-id rishi-7c-rag-v1 --include-rag-retrieval
```
