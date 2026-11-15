"""Opt-in gate for live Gemini tests (Phase 7B offline-first).

Live suites require both a configured AI Studio key and an explicit
`VEDIC_LIVE_EVAL=1` flag so depleted credits do not fail offline CI/regression.
"""

from __future__ import annotations

import os
from pathlib import Path

from backend.agents.gemini_connectivity import load_llm_env

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = REPO_ROOT / ".env"


def live_gemini_ready() -> bool:
    if not ENV_PATH.is_file():
        return False
    load_llm_env(ENV_PATH)
    opt_in = (os.getenv("VEDIC_LIVE_EVAL") or "").strip().lower()
    if opt_in not in {"1", "true", "yes", "on"}:
        return False
    flag = (os.getenv("GOOGLE_GENAI_USE_VERTEXAI") or "false").strip().lower()
    return bool(os.getenv("GOOGLE_API_KEY")) and flag in {"false", "0", "no"}


LIVE_SKIP_REASON = "Set VEDIC_LIVE_EVAL=1 with a funded GOOGLE_API_KEY to run live Gemini tests"
