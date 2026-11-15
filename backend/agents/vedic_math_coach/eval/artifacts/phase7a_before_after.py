"""Capture Phase 7A before/after style live samples (post-implementation)."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = "http://127.0.0.1:8010"
OUT = Path(__file__).with_name("phase7a_conversations.json")

CASES = [
    {
        "id": "rishi_intro",
        "message": "Namaste! Introduce yourself briefly as Rishi.",
        "context": {"screen": "theory", "sutra_id": "nikhilam", "difficulty": "beginner"},
    },
    {
        "id": "rabbit_level1_hint",
        "message": "As Rabbit only, give a level-1 hint about the deviation of 98 from base 100. Do not state the deviation digit.",
        "context": {
            "screen": "practice",
            "sutra_id": "nikhilam",
            "difficulty": "beginner",
            "problem_label": "98 × 93",
            "question_key": "deviation_a",
            "hint_level": 1,
        },
    },
    {
        "id": "rabbit_level2_hint",
        "message": "As Rabbit only, level-2 hint for the same deviation step. Still do not state the answer digit.",
        "context": {
            "screen": "practice",
            "sutra_id": "nikhilam",
            "difficulty": "beginner",
            "problem_label": "98 × 93",
            "question_key": "deviation_a",
            "hint_level": 2,
        },
    },
    {
        "id": "rabbit_level3_hint",
        "message": "As Rabbit only, level-3 guided step for deviation of 98. Do not blurt the final product.",
        "context": {
            "screen": "practice",
            "sutra_id": "nikhilam",
            "difficulty": "beginner",
            "problem_label": "98 × 93",
            "question_key": "deviation_a",
            "hint_level": 3,
        },
    },
    {
        "id": "unsupported_anurupyena",
        "message": "Please open the Anurupyena animation in this app for 23×14.",
        "context": {"screen": "theory", "sutra_id": "urdhva", "difficulty": "beginner"},
    },
    {
        "id": "concise_why_base",
        "message": "Why do we use base 100 for 98×97? Keep it short.",
        "context": {
            "screen": "theory",
            "sutra_id": "nikhilam",
            "difficulty": "beginner",
            "problem_label": "98 × 97",
            "frame_index": 0,
            "step_title": "Choose a base",
        },
    },
]


def post(path: str, payload: dict) -> tuple[int, dict]:
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read().decode())


def main() -> None:
    _, sess = post("/coach/sessions", {})
    session_id = sess["session_id"]
    out = {"generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "session_id": session_id, "cases": []}
    for case in CASES:
        # Fresh session per case for cleaner persona samples
        _, sess = post("/coach/sessions", {})
        sid = sess["session_id"]
        code, body = post(
            "/coach/chat",
            {"session_id": sid, "message": case["message"], "context": case.get("context")},
        )
        out["cases"].append(
            {
                "id": case["id"],
                "message": case["message"],
                "http_status": code,
                "speaker": (body.get("message") or {}).get("character"),
                "text": (body.get("message") or {}).get("text"),
                "tools_used": body.get("tools_used"),
                "actions": [a.get("type") for a in (body.get("actions") or [])],
            }
        )
        print(case["id"], code, (body.get("message") or {}).get("character", {}).get("id"))
    OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
