# Hackathon evaluation evidence package (design)

This package must remain understandable **without** LangSmith dashboard access.

## Contents checklist

1. **Executive evaluation summary** — `reports/Phase-7B-Teaching-Intelligence-Eval-v2.md` + this tollgate report  
2. **Architecture diagram** — ADK tools + optional LangSmith (eval-only) + deterministic engines  
3. **Methodology** — offline vs replay vs live modes; arithmetic never LLM-judged  
4. **Datasets + versions** — `eval/datasets/catalog.json`  
5. **Deterministic math results** — existing engine pytest suites  
6. **ADK tool evaluation** — golden cases (live pending credits)  
7. **Teaching rubrics + calibration** — `rubrics.py`, `calibration/known_bad_cases.json`  
8. **Sanitized traces** — synthetic only; export via LangSmith when configured  
9. **Before/after charts** — generate from `runners.cli compare` markdown tables  
10. **Improvement register** — `IMPROVEMENT_REGISTER.md`  
11. **Failure analysis** — per-run `summary.json` failures lists  
12. **Git commit references** — each `manifest.json`  
13. **LangSmith IDs** — optional fields in manifests (`langsmith.project`)  
14. **Reproduction instructions** — commands in Tollgate 7B.5 report  
15. **Known limitations** — credits, offline≠live, privacy scope  

## Privacy for submission

- Synthetic learner prompts only  
- No real student identities  
- Secrets redacted (`observability/sanitize.py`)  
- No production tracing of learner conversations in 7B.5  
