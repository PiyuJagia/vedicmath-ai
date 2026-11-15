"""HTTP-based teaching simulations against a running FastAPI server."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from pathlib import Path

from backend.agents.vedic_math_coach.eval.teaching_simulations import ARCHETYPES

BASE = "http://127.0.0.1:8010"
OUT = Path(__file__).with_name("artifacts") / "teaching_simulations.json"


def post(path: str, payload: dict | None = None) -> tuple[int, dict]:
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        headers={"Content-Type": "application/json"} if payload is not None else {},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as error:
        body = error.read().decode()
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"error": body[:500]}
        return error.code, parsed


def main() -> None:
    report = {"generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "base": BASE, "archetypes": []}
    for arch in ARCHETYPES:
        status, sess = post("/coach/sessions", {})
        if status != 200:
            raise SystemExit(f"sessions failed: {status} {sess}")
        session_id = sess["session_id"]
        turns_out = []
        for turn in arch["turns"]:
            payload = {"session_id": session_id, "message": turn["message"], "context": turn.get("context")}
            t0 = time.time()
            code, body = post("/coach/chat", payload)
            elapsed = round(time.time() - t0, 2)
            ok = code == 200
            turns_out.append(
                {
                    "message": turn["message"],
                    "context": turn.get("context"),
                    "http_status": code,
                    "elapsed_s": elapsed,
                    "speaker": (body.get("message") or {}).get("character", {}).get("id") if ok else None,
                    "text": (body.get("message") or {}).get("text") if ok else None,
                    "tools_used": body.get("tools_used") if ok else [],
                    "calculation": body.get("calculation") if ok else None,
                    "actions": [a.get("type") for a in (body.get("actions") or [])] if ok else [],
                    "error": None if ok else body,
                }
            )
            print(f"[{arch['id']}] {code} {elapsed}s speaker={turns_out[-1]['speaker']} tools={turns_out[-1]['tools_used']}")
        report["archetypes"].append({"id": arch["id"], "label": arch["label"], "session_id": session_id, "turns": turns_out})

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
