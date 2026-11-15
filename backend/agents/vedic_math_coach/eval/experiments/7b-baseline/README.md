# Experiment family: `rishi-7b-baseline`

**Intent:** Freeze pre-RAG teaching/eval baseline (tools + instructions + offline fixtures).

**Configuration**
- Tools: `calculate_sutra`, `get_lesson`, `check_practice_answer`, `get_progressive_hint`
- Knowledge retrieval: **off** (`VEDIC_KNOWLEDGE_RAG` unset)
- Rubric: Phase 7B (`rubrics.py` PASS_THRESHOLD=3)
- Datasets: `teaching_v2_offline_fixtures`, `judge_calibration`

**Run**
```bash
python -m backend.agents.vedic_math_coach.eval.runners.cli offline --experiment-id rishi-7b-baseline
```

Immutable run artifacts land in `../archive/runs/rishi-7b-baseline/<run_id>/`.
