"""Live teaching-archetype simulations for the Rishi Teaching Intelligence audit.

Produces transcripts under eval/artifacts/. Not a pytest gate — run manually:
  python -m backend.agents.vedic_math_coach.eval.teaching_simulations
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

from fastapi.testclient import TestClient

from backend.agents.gemini_connectivity import load_llm_env
from backend.agents.vedic_math_coach.handoff.runtime import reset_runtime_for_tests
from backend.agents.vedic_math_coach.tools.store import clear_store
from backend.main import app

REPO = Path(__file__).resolve().parents[4]
ENV = REPO / ".env"
OUT = Path(__file__).with_name("artifacts") / "teaching_simulations.json"

ARCHETYPES: list[dict] = [
    {
        "id": "learner_a_beginner",
        "label": "Learner A — Beginner",
        "turns": [
            {
                "message": "What is Nikhilam?",
                "context": {"screen": "theory", "sutra_id": "nikhilam", "difficulty": "beginner"},
            },
            {
                "message": "Why do we use 100? What does base mean?",
                "context": {
                    "screen": "theory",
                    "sutra_id": "nikhilam",
                    "difficulty": "beginner",
                    "problem_label": "98 × 97",
                    "frame_index": 0,
                    "step_title": "Choose a base",
                },
            },
            {
                "message": "Why are we subtracting? I still don't understand. Can you explain it another way?",
                "context": {
                    "screen": "theory",
                    "sutra_id": "nikhilam",
                    "difficulty": "beginner",
                    "problem_label": "98 × 97",
                    "frame_index": 1,
                },
            },
            {
                "message": "Can you show me a verified example with calculate_sutra?",
                "context": {"screen": "theory", "sutra_id": "nikhilam", "difficulty": "beginner"},
            },
            {
                "message": "What should I learn next?",
                "context": {"screen": "theory", "sutra_id": "nikhilam", "difficulty": "beginner"},
            },
        ],
    },
    {
        "id": "learner_b_struggling",
        "label": "Learner B — Struggling",
        "turns": [
            {
                "message": "My answer was wrong. Why is my answer wrong? I put 2 for the deviation of 98.",
                "context": {
                    "screen": "practice",
                    "sutra_id": "nikhilam",
                    "difficulty": "beginner",
                    "problem_label": "98 × 93",
                    "question_key": "deviation_a",
                    "learner_answer": "2",
                    "check_status": "incorrect",
                    "hint_level": 0,
                },
            },
            {
                "message": "I don't get it. This is too hard. Can you give me a hint instead of the answer?",
                "context": {
                    "screen": "practice",
                    "sutra_id": "nikhilam",
                    "difficulty": "beginner",
                    "check_status": "incorrect",
                    "hint_level": 1,
                    "learner_answer": "2",
                },
            },
            {
                "message": "As Rabbit only, give a short visual hint about deviation from the base. Do not give the final product.",
                "context": {
                    "screen": "practice",
                    "sutra_id": "nikhilam",
                    "difficulty": "beginner",
                    "hint_level": 2,
                },
            },
            {
                "message": "I keep making the same mistake with the sign. Help me without telling me the answer number.",
                "context": {
                    "screen": "practice",
                    "sutra_id": "nikhilam",
                    "difficulty": "beginner",
                    "check_status": "incorrect",
                    "hint_level": 2,
                },
            },
            {
                "message": "I finally got it right after struggling. Cheer me as Hummingbird only.",
                "context": {
                    "screen": "practice",
                    "sutra_id": "nikhilam",
                    "difficulty": "beginner",
                    "check_status": "correct",
                },
            },
        ],
    },
    {
        "id": "learner_c_advanced",
        "label": "Learner C — Advanced",
        "turns": [
            {
                "message": "Why does this Nikhilam trick always work? Prove why 98×97 works algebraically, using calculate_sutra for the verified product.",
                "context": {"screen": "theory", "sutra_id": "nikhilam", "difficulty": "advanced"},
            },
            {
                "message": "What's the difference between Nikhilam and Urdhva? When should I use each?",
                "context": {"screen": "theory", "sutra_id": "nikhilam", "difficulty": "advanced"},
            },
            {
                "message": "Give me something harder — use calculate_sutra for nikhilam advanced a=9998 b=9997.",
                "context": {"screen": "practice", "sutra_id": "nikhilam", "difficulty": "advanced"},
            },
            {
                "message": "What happens if the number is outside the base range, like nikhilam beginner 50×97?",
                "context": {"screen": "theory", "sutra_id": "nikhilam", "difficulty": "beginner"},
            },
            {
                "message": "Can I solve 23×14 using another Sutra than Urdhva?",
                "context": {"screen": "theory", "sutra_id": "urdhva", "difficulty": "beginner"},
            },
        ],
    },
]


def _ready() -> bool:
    if not ENV.is_file():
        return False
    load_llm_env(ENV)
    flag = (os.getenv("GOOGLE_GENAI_USE_VERTEXAI") or "false").strip().lower()
    return bool(os.getenv("GOOGLE_API_KEY")) and flag in {"false", "0", "no"}


def run() -> dict:
    if not _ready():
        raise SystemExit("Live Gemini .env not configured")
    load_llm_env(ENV)
    clear_store()
    reset_runtime_for_tests()
    client = TestClient(app)
    report: dict = {"generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "archetypes": []}

    for arch in ARCHETYPES:
        session_id = client.post("/coach/sessions").json()["session_id"]
        turns_out = []
        for turn in arch["turns"]:
            payload = {
                "session_id": session_id,
                "message": turn["message"],
                "context": turn.get("context"),
            }
            t0 = time.time()
            response = client.post("/coach/chat", json=payload)
            elapsed = round(time.time() - t0, 2)
            body = response.json() if response.status_code == 200 else {"error": response.text[:500]}
            turns_out.append(
                {
                    "message": turn["message"],
                    "context": turn.get("context"),
                    "http_status": response.status_code,
                    "elapsed_s": elapsed,
                    "speaker": (body.get("message") or {}).get("character", {}).get("id")
                    if response.status_code == 200
                    else None,
                    "text": (body.get("message") or {}).get("text") if response.status_code == 200 else None,
                    "tools_used": body.get("tools_used") if response.status_code == 200 else [],
                    "calculation": body.get("calculation") if response.status_code == 200 else None,
                    "actions": [a.get("type") for a in (body.get("actions") or [])]
                    if response.status_code == 200
                    else [],
                    "error": body.get("error") if response.status_code != 200 else None,
                }
            )
        report["archetypes"].append({"id": arch["id"], "label": arch["label"], "session_id": session_id, "turns": turns_out})

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote {OUT}")
    return report


if __name__ == "__main__":
    run()
