# RAG options for a small-scope Vedic maths tutoring agent

Scope: compare (A) no RAG — tool outputs + curated explanations in prompt/files, (B) lightweight local Markdown/JSON retrieval or ADK document retrieval, (C) Pinecone/vector RAG, for ~5 curated sutras on Google ADK + Gemini. Project context: the coach already exposes deterministic tools (`calculate_sutra`, `get_lesson`) for nikhilam, urdhva, ekadhikena, yavadunam, and ekanyunena, with teaching steps and animation payloads.

## How useful is each option for tutoring and measurable learning gains?

### Takeaway
RAG can improve groundedness and short-term retention versus no AI, but randomized higher-ed trials often show **no learning, engagement, or grade gains** from RAG tutors—and sometimes displacement of productive study. For five curated sutras, pedagogical quality is driven more by deterministic maths tools, curated explanations, and tutoring pedagogy than by a vector index.

### Cited Findings
- In a psychology writing study (N=109), a RAG AI tutor beat no-AI on a posttest quiz (M=10.81 vs 9.22, p=.036) but did **not** beat unmodified GPT-4 Turbo (M=11.31; RAG vs GPT-4 p=.283) — [HFES / Sage DOI](https://doi.org/10.1177/10711813241275509).
- A semester-long RCT of a RAG GenAI tutor (~450 undergrads) found **no significant effects** on interest, self-efficacy, engagement, or achievement — [OSF preprint](https://doi.org/10.31219/osf.io/24tg7_v1).
- Another RCT of a RAG GenAI tutor in introductory marketing likewise found **no significant differences** on course interest, self-efficacy, or learning performance, including by interaction frequency — [OSF preprint](https://doi.org/10.31219/osf.io/rdtg5_v2).
- A large randomized university trial (N=2,379) of a course-integrated GenAI tutor using RAG over instructor-selected LMS materials found tutor access **reduced** final grades by ~0.27–0.37 SD and LMS participation by ~0.90 SD in the exact-match sample — [EdWorkingPapers PDF](https://edworkingpapers.com/sites/default/files/ai26-1598.pdf).
- A multi-course RAG tutor pilot reported high engagement qualitatively, but expert coding found **1.5% incorrect answers** and **16.5% answers outside the provided context**; authors conclude RAG reduces hallucinations mainly when topics are well covered in the materials — [ELTE repository](https://edit.elte.hu/xmlui/handle/10831/120076).
- Curriculum-grounded LLM tutoring work frames “pedagogical hallucinations” (plausible but curriculum-inconsistent feedback) as a core risk that RAG alone does not eliminate; verification loops and retrieval quality matter — [ACM case study PDF](https://dl.acm.org/doi/pdf/10.1145/3816713.3818221).
- Anthropic’s contextual-retrieval guidance states that if a knowledge base is **smaller than ~200,000 tokens (~500 pages)**, include the whole KB in the prompt—**no RAG needed**—and use prompt caching for latency/cost — [Anthropic research](https://www.anthropic.com/research/contextual-retrieval).
- Practitioner guidance: when the corpus is small and stable, skip the vector store and put the document in context (optionally cached); vector stores add fixed operational and freshness cost — [Meteorit](https://meteorit.rs/blog/2025-11-14-when-not-to-use-rag); [Arslan (Substack)](https://arslandg.substack.com/p/when-not-to-use-rag-and-what-to-use).

### Inferences
- **(A) No RAG + tools/curated files** matches both the evidence pattern (tutoring gains ≠ retrieval infra) and Vedic maths needs: exact products/steps must be deterministic, not retrieved prose. Curated explanations in `instructions.md` / lesson JSON can improve pedagogy without retrieval failure modes.
- **(B) Lightweight local / ADK FilesRetrieval** may help if prose explanations grow beyond what fits cleanly in the system prompt, or if authors want “search my lesson notes” UX—but for five sutras, selective `get_lesson(sutra_id)` is more educationally precise than semantic chunk search.
- **(C) Pinecone/vector RAG** is unlikely to improve learning metrics by itself at this scope; literature shows grounding ≠ achievement, and retrieval noise can inject wrong sutra steps into tutoring.

### Gaps
- No peer-reviewed RCTs specifically on Vedic maths or five-sutra micro-curricula with RAG vs tool-grounded tutoring; education evidence is mostly higher-ed course tutors.
- No public A/B on ADK FilesRetrieval vs prompt-stuffed Markdown for maths tutoring latency or accuracy.

## How do latency and cost compare across A, B, and C?

### Takeaway
(A) is cheapest and lowest-latency (one model call + local tool RPCs). (B) adds embedding/index work and an extra tool round-trip; ADK FilesRetrieval re-embeds the directory on every agent import. (C) adds a hosted vector service with plan minimums and per-read metering—justified at scale, not for a handful of sutra docs.

### Cited Findings
- Anthropic: for KBs under ~200k tokens, full-prompt inclusion plus caching can cut latency **>2×** and costs **up to 90%** versus repeated full-prompt sends without caching; RAG is positioned as the scalable path **after** the corpus outgrows that approach — [Anthropic contextual retrieval](https://www.anthropic.com/research/contextual-retrieval).
- ADK `FilesRetrieval` builds a LlamaIndex `VectorStoreIndex` over a local directory using Gemini embeddings; content is **re-indexed each time the agent module is imported**, and document text is sent to the embedding model for indexing — [ADK Files Retrieval docs](https://adk.dev/integrations/filesretrieval/).
- ADK also supports enterprise grounding via `VertexAiSearchTool` against an Agent Search datastore (hosted retrieval latency + GCP search cost), separate from local FilesRetrieval — [ADK Grounding with Search](https://adk.dev/grounding/grounding_with_search/).
- Pinecone plans: Starter free; Builder **$20/month flat**; Standard **$50/month minimum**; Enterprise **$500/month minimum**. On-demand Standard metering includes storage ~**$0.33/GB/mo**, write units ~**$4–$4.50/M**, read units ~**$16–$18/M** (cloud/region dependent) — [Pinecone pricing](https://www.pinecone.io/pricing/); [Understand cost](https://docs.pinecone.io/guides/cost/understand-cost).
- Pinecone documents that Dedicated Read Nodes target **sustained high QPS / large indexes / tight latency SLOs**; published DRN case latencies include ~12–45 ms p50 at millions–billions of vectors—workloads far above a five-sutra corpus — [DRN overview](https://docs.pinecone.io/guides/optimize/dedicated-read-nodes/overview); [DRN GA blog](https://www.pinecone.io/blog/dedicated-read-nodes-ga/).
- Guidance: most RAG systems do **not** need a dedicated vector DB on day one; need arises when semantic retrieval at scale, filtering, and latency complexity outgrow simpler options — [DronaHQ decision guide](https://www.dronahq.com/vector-database-rag/).

### Inferences
- For ~5 sutra Markdown/JSON packs (likely thousands of tokens, not hundreds of thousands), **(A)** minimizes tokens beyond the fixed instruction pack and avoids embed/query round-trips.
- **(B)** latency cost is mainly: startup re-index (ADK FilesRetrieval), embed API calls, then per-turn retrieve tool call before answer generation—often an extra model–tool hop versus loading the active sutra’s lesson via `get_lesson`.
- **(C)** fixed monthly floors ($20–$50+) dominate any storage cost for a tiny index; query latency may be fine, but total cost and ops exceed benefit until corpus/QPS grow.

### Gaps
- No measured p50 end-to-end latency for this repo’s coach with vs without FilesRetrieval (would need a local benchmark).
- Gemini-specific prompt-caching economics for ADK agents were not verified in primary Google docs during this pass; Anthropic caching figures should not be assumed identical for Gemini.

## How maintainable is each option for a five-sutra curriculum?

### Takeaway
(A) is easiest: edit Markdown/JSON and instructions, ship with the app, evaluate with golden cases. (B) adds chunk/index hygiene and ADK extension deps. (C) adds a second system of record (index sync, namespaces, embedding version drift).

### Cited Findings
- ADK FilesRetrieval requires `pip install "google-adk[extensions]"`, a pre-existing `data/` directory, and re-indexes on module import—content freshness is “redeploy/restart the agent process,” not incremental sync — [ADK Files Retrieval](https://adk.dev/integrations/filesretrieval/).
- Iron Mind: curated KBs with distinctive short entries often beat vector search for maintainability at ~100 entries; embeddings become the right middleman only when the corpus is too large/messy for human-authored indexes — [Iron Mind](https://iron-mind.ai/blog/why-we-dont-use-vector-search-for-ai-knowledge-base).
- Meteorit: production RAG systems have been replaced by “put the document in the prompt and cache it” when the corpus is small/stable — [Meteorit](https://meteorit.rs/blog/2025-11-14-when-not-to-use-rag).
- Google ADK samples show production hybrid RAG (GCS → Vertex Vector Search 2.0 → Cloud Run agent) as a multi-pipeline GCP system—appropriate for large, changing corpora, not five static sutras — [adk-samples multiformat-hybrid-rag](https://github.com/google/adk-samples/blob/8a745552/python/agents/multiformat-hybrid-rag/README.md).
- This codebase already centralizes verified steps in tools and eval scoring (`tools_used`, sutra_id checks), so curriculum changes can be gated by golden cases without an external index — local agent tools/eval under `backend/agents/vedic_math_coach/` (repo observation; not a web source).

### Inferences
- **(A)** maintainability wins: one author edits lesson files + instructions; CI runs coach evals; no index invalidation.
- **(B)** is maintainable if lessons stay few files and retrieval is optional; ADK FilesRetrieval’s full re-embed on import is awkward for serverless cold starts and for Render-style ephemeral deploys unless indexing is deferred/cached carefully.
- **(C)** maintainability loses until multiple authors, large doc sets, ACL namespaces, or continuous ingestion appear.

### Gaps
- No published ADK ops playbook for FilesRetrieval cold-start cost on free-tier host spin-down (Render free web services spin down after inactivity—platform constraint from workspace rules, not a RAG paper).

## What are hallucination and irrelevant-retrieval risks?

### Takeaway
Relevant retrieved context reduces hallucinations; **irrelevant context sharply increases them**. For maths tutoring, wrong-sutra chunks or out-of-corpus answers are more dangerous than “no retrieval,” because students may trust step lists. Deterministic tools + refusal rules address calculation hallucinations better than vectors.

### Cited Findings
- Algebra University RAG study: with **relevant** context, hallucinations in 2/74 queries; with **irrelevant** context, hallucinations in **33%** of cases; enumerative/list answers still hallucinated ~30.3% even with RAG — [Applied Sciences DOI](https://doi.org/10.3390/app142210748).
- ELTE RAG tutor pilot: **1.5% incorrect**, **16.5% out-of-context** answers despite retrieval grounding — [ELTE](https://edit.elte.hu/xmlui/handle/10831/120076).
- Thai health-education RAG+CoVe tutor: remaining failures include verification errors, de-contextualized over-generalization, OOD fabrication when retrieval is empty, and retrieval omission on slang/colloquial phrasing — [ACM PDF](https://dl.acm.org/doi/pdf/10.1145/3816713.3818221).
- Educational platform RAG work notes semantic-similarity retrieval struggles with specialized/polysemous terminology; recommends filters and safe fallback (“No relevant information found”) for OOD queries — [BDCC DOI](https://doi.org/10.3390/bdcc10040120).
- Classroom-alignment RAG survey: LLMs still risk fabricated or curriculum-misaligned content; RAG improves reliability by grounding in external resources but does not remove the need for knowledge-aligned retrieval design — [arXiv:2509.07846](https://arxiv.org/abs/2509.07846).
- Diagnostic work on educational RAG recommenders distinguishes pipeline hallucinations vs retrieval-grounding failures and finds retrieval **depth** and evaluation protocol change diagnosed hallucination rates — [Springer/ACM](https://dl.acm.org/doi/10.1007/978-3-032-32643-0_10).
- Meteorit: for numeric answers, RAG is the wrong shape versus querying a source of truth via tools/SQL — [Meteorit](https://meteorit.rs/blog/2025-11-14-when-not-to-use-rag).

### Inferences
- **(A)** risk profile: model may still invent pedagogy, but calculation/result hallucinations are blocked if tools are mandatory (as in current coach instructions). Irrelevant-retrieval risk is **zero** by design.
- **(B)** risk: semantic search may surface the wrong sutra’s explanation (e.g., Nikhilam vs Urdhva for “multiply near base”) and raise the Algebra-University-style irrelevant-context hallucination rate; mitigate with ID-keyed `get_lesson` or strict metadata filters, not pure similarity.
- **(C)** same retrieval risks as (B) at larger ops cost; hybrid/rerank helps large corpora ([Anthropic failure-rate reductions](https://www.anthropic.com/research/contextual-retrieval)) but is overkill when IDs already select the right lesson.

### Gaps
- Exact hallucination rates for Vedic sutra step lists under each option are not published; should be measured on this repo’s `golden_cases.json` / eval harness.

## How compatible are the options with Google ADK + Gemini?

### Takeaway
All three are compatible. (A) is the native ADK pattern already used (Agent + custom tools). (B) maps to first-party `FilesRetrieval` or keyed tools over Markdown/JSON. (C) is possible via custom tools calling Pinecone, but ADK’s documented first-party paths prefer local FilesRetrieval or Vertex AI Search—not Pinecone.

### Cited Findings
- ADK documents `FilesRetrieval` as an agent tool performing semantic vector search over local `.txt`/`.md`/source files with Gemini embeddings (`GoogleGenAIEmbedding`, default preview model; production note to pass GA `gemini-embedding-2`) — [ADK Files Retrieval](https://adk.dev/integrations/filesretrieval/).
- ADK enterprise document grounding uses `VertexAiSearchTool(data_store_id=...)` with Agent Search datastores — [ADK Grounding with Search](https://adk.dev/grounding/grounding_with_search/).
- Gemini File Search is a managed RAG tool in the Gemini API; a Google Codelab notes ADK may need a **custom wrapper** because a built-in FileSearch tool wrapper was not yet first-class at codelab time — [Gemini File Search Codelab](https://codelabs.developers.google.com/gemini-file-search-for-rag).
- Pinecone states RAG is a supported use case (embed, retrieve, pass to model; hybrid + metadata filters + rerankers) — [Pinecone Answers](https://www.pinecone.io/pinecone-answers/).
- This coach already follows the ADK tool pattern for deterministic maths (`calculate_sutra`, `get_lesson`) with explicit anti-fabrication instructions — repo `instructions.md` (local).

### Inferences
- Prefer ADK-native tools for (A)/(B). If hosted search is required later, **Vertex AI Search** aligns with Google ADK docs more cleanly than Pinecone.
- Pinecone remains compatible as a **custom Python tool** behind the agent, but adds a non-Google dependency and auth/secret surface.

### Gaps
- Current ADK version’s built-in Pinecone integration status was not found in official ADK docs during this research (treat as custom-tool integration unless docs change).

## When is Pinecone (option C) justified?

### Takeaway
Pinecone is justified when the knowledge corpus is **large, growing, multi-tenant or ACL-filtered**, and query volume needs managed vector infra—not when teaching five stable sutras that fit in context or load by ID.

### Cited Findings
- Anthropic: use RAG/contextual retrieval when the KB **exceeds** ~200k tokens; below that, full prompt — [Anthropic](https://www.anthropic.com/research/contextual-retrieval).
- Pinecone’s own product framing targets scale (e.g., Starter illustrative RAG at ~category-scoped forum chats; DRN examples at millions–billions of vectors and sustained QPS) — [Pinecone pricing](https://www.pinecone.io/pricing/); [DRN blog](https://www.pinecone.io/blog/dedicated-read-nodes-ga/).
- Decision guides: dedicated vector DBs earn their place when semantic retrieval, scale, and metadata-aware filtering are central; small/stable/structured data often fit SQL, keyword, in-memory, or prompt inclusion — [DronaHQ](https://www.dronahq.com/vector-database-rag/); [Westerwick](https://www.westerwick.co.za/insights/when-a-vector-database-is-overkill); [Iron Mind](https://iron-mind.ai/blog/why-we-dont-use-vector-search-for-ai-knowledge-base).
- Meteorit: RAG is right for large textual corpora with open-ended questions expecting citations—not for small stable docs, numeric source-of-truth questions, or heavy reasoning tasks — [Meteorit](https://meteorit.rs/blog/2025-11-14-when-not-to-use-rag).

### Inferences
- Justify Pinecone (or Vertex Vector Search) for Vedicmath-ai **only if** the product expands to: many user-uploaded materials, a large multi-author content library, cross-lesson semantic FAQ at high QPS, or tenant-isolated corpora with metadata filters.
- For the current five-sutra coach, Pinecone fails the “corpus too large for context / selective retrieval beats shipping everything” test.

### Gaps
- No official ADK+Pinecone reference architecture found; comparison to Vertex Vector Search 2.0 hybrid sample is qualitative only.

## What is the simplest option that can still improve measurable teaching quality?

### Takeaway
**Recommend (A): no RAG** — strengthen curated explanations in prompt/files and keep deterministic ADK tools as the source of truth. Use the existing eval harness for measurable teaching improvement. Add (B) only if prose volume or multi-file lookup becomes unwieldy; defer (C) until corpus/QPS justify hosted vectors.

### Cited Findings
- Learning RCTs show RAG tutors often fail to beat strong baselines or traditional instruction on achievement/engagement — [OSF 24tg7](https://doi.org/10.31219/osf.io/24tg7_v1); [OSF rdtg5](https://doi.org/10.31219/osf.io/rdtg5_v2); [EdWorkingPapers](https://edworkingpapers.com/sites/default/files/ai26-1598.pdf); psychology study shows RAG ≈ GPT-4 for retention — [DOI 10.1177/10711813241275509](https://doi.org/10.1177/10711813241275509).
- Small-KB guidance strongly favors prompt/tool grounding over vector RAG — [Anthropic](https://www.anthropic.com/research/contextual-retrieval); [Meteorit](https://meteorit.rs/blog/2025-11-14-when-not-to-use-rag); [Arslan](https://arslandg.substack.com/p/when-not-to-use-rag-and-what-to-use).
- Irrelevant retrieval increases hallucination rates dramatically — [Algebra University RAG study](https://doi.org/10.3390/app142210748).
- ADK already provides the right primitives for (A) and a documented path for (B) if needed later — [FilesRetrieval](https://adk.dev/integrations/filesretrieval/).
- Numeric/step correctness should come from tools/source-of-truth calls, not chunk retrieval — [Meteorit](https://meteorit.rs/blog/2025-11-14-when-not-to-use-rag).

### Inferences
- **Measurable teaching improvement** for this agent should be defined on: (1) tool-correct answers and sutra selection (existing eval checks), (2) pedagogy rubric items (hint-before-answer, age-appropriate language, no fabricated steps), (3) optional short learner quizzes—not on retrieval hit-rate.
- Practical (A) upgrade path: keep `calculate_sutra` / `get_lesson` mandatory for maths; add short curated “misconception → next prompt” snippets per sutra in Markdown/JSON loaded by ID; expand golden cases. That is retrieval-by-key, not vector RAG.
- **(B) as a later optional step:** ADK `FilesRetrieval` over a `data/lessons/` folder **or** a thin `lookup_explanation(sutra_id, topic)` tool over JSON—prefer ID lookup over pure semantic search for sutra safety.
- **(C) Pinecone:** not justified now; revisit if content library >> context window, multi-tenant filters, or high-QPS semantic FAQ become product requirements (then also compare Vertex AI Search for ADK fit).

### Gaps
- “Measurable teaching improvement” thresholds (e.g., target % on golden cases, learner quiz deltas) are product decisions not fixed by literature.
- Whether Gemini context caching in the team’s ADK deployment can match Anthropic’s published cache savings was not confirmed here.
