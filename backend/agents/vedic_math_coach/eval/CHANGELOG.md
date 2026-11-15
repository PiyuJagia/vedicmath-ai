# Evaluation infrastructure changelog

## 7B.5.1 — Evaluation infrastructure (this tollgate)

- Added dataset catalog (`datasets/catalog.json`) with versions and grading methods.
- Added unified runner (`runners/cli.py`) with offline / compare / live shell modes.
- Added immutable experiment manifests under `archive/runs/` (gitignored outputs).
- Added optional LangSmith ADK tracing (`observability/langsmith_trace.py`), disabled by default.
- Added privacy sanitizers for synthetic eval export.
- Added comparison utilities and improvement register.
- Prepared RAG dataset catalog entries without claiming live RAG teaching gains.

## 7B.1 — Teaching Intelligence Evaluation v2

- Offline fixtures, rubrics 0–4, hint disclosure oracles, calibration tests.

## 7A.x — Rishi identity

- Progressive hints, persona display name, teaching-quality cases.

## 6B.x — Golden ADK expansion

- Golden cases + live eval harness.
