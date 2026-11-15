"""CLI entry point for VedicMath coach evaluations.

Examples:
  python -m backend.agents.vedic_math_coach.eval.runners.cli offline --experiment-id rishi-7b-baseline
  python -m backend.agents.vedic_math_coach.eval.runners.cli compare --baseline PATH --candidate PATH
  python -m backend.agents.vedic_math_coach.eval.runners.cli live --help
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from backend.agents.vedic_math_coach.eval.observability.langsmith_trace import (
    maybe_configure_langsmith,
)
from backend.agents.vedic_math_coach.eval.runners.compare import (
    compare_manifests,
    load_manifest,
    render_markdown_table,
)
from backend.agents.vedic_math_coach.eval.runners.manifest import (
    build_manifest,
    new_run_ids,
    write_manifest,
)
from backend.agents.vedic_math_coach.eval.runners.offline import run_offline_suites


def _cmd_offline(args: argparse.Namespace) -> int:
    experiment_id = args.experiment_id
    _, run_id, out_dir = new_run_ids(experiment_id)

    langsmith = {"enabled": False}
    if args.with_langsmith:
        langsmith = maybe_configure_langsmith(
            experiment_id=experiment_id,
            run_id=run_id,
            metadata={"mode": "offline"},
            tags=["offline"],
        )

    summary = run_offline_suites(
        include_knowledge=not args.skip_knowledge,
        include_rag_retrieval=args.include_rag_retrieval,
    )
    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    knowledge_version = None
    try:
        from backend.knowledge.schemas import CONTENT_VERSION

        knowledge_version = CONTENT_VERSION
    except Exception:  # noqa: BLE001
        knowledge_version = None

    manifest = build_manifest(
        experiment_id=experiment_id,
        run_id=run_id,
        mode="offline",
        dataset_ids=[
            "teaching_v2_offline_fixtures",
            "judge_calibration",
        ],
        rubric_version="7B.1",
        summary=summary,
        langsmith=langsmith,
        knowledge_pack_version=knowledge_version,
        duration_seconds=summary.get("duration_seconds"),
        limitations=summary.get("limitations"),
    )
    write_manifest(out_dir, manifest)
    print(json.dumps({"run_id": run_id, "out_dir": str(out_dir), "pass_rate": summary.get("pass_rate")}, indent=2))
    return 0


def _cmd_compare(args: argparse.Namespace) -> int:
    baseline = load_manifest(Path(args.baseline))
    candidate = load_manifest(Path(args.candidate))
    comparison = compare_manifests(baseline, candidate)
    md = render_markdown_table(comparison)
    if args.out:
        Path(args.out).write_text(md, encoding="utf-8")
        print(f"Wrote {args.out}")
    else:
        print(md)
    return 0 if comparison["compatible"] or args.allow_incompatible else 2


def _cmd_live(args: argparse.Namespace) -> int:
    """Live ADK evaluation requires explicit opt-in; does not auto-retry on 402."""
    if (os.getenv("VEDIC_LIVE_EVAL") or "").strip().lower() not in {"1", "true", "yes", "on"}:
        print(
            "Live mode refused: set VEDIC_LIVE_EVAL=1 with a funded GOOGLE_API_KEY.\n"
            "Do not repeatedly call Gemini when AI Studio returns 402 RESOURCE_EXHAUSTED.",
            file=sys.stderr,
        )
        return 3

    experiment_id = args.experiment_id
    _, run_id, out_dir = new_run_ids(experiment_id)
    langsmith = {"enabled": False}
    mode = "live"
    if args.with_langsmith:
        mode = "live-langsmith"
        langsmith = maybe_configure_langsmith(
            experiment_id=experiment_id,
            run_id=run_id,
            metadata={"mode": mode, "traffic": "synthetic_eval_only"},
            tags=["live", "synthetic-eval"],
        )

    # Record infrastructure pending rather than inventing scores
    summary = {
        "mode": mode,
        "total": 0,
        "passed": 0,
        "failed": 0,
        "skipped": 31,
        "pass_rate": None,
        "status": "pending_or_blocked",
        "message": (
            "Live golden execution is orchestrated via pytest "
            "(test_coach_eval.py / test_teaching_quality_eval.py) with VEDIC_LIVE_EVAL=1. "
            "This CLI records the experiment shell; run pytest for case scores when credits exist."
        ),
        "pytest_hint": (
            "python -m pytest backend/tests/test_coach_eval.py "
            "backend/tests/test_teaching_quality_eval.py -q"
        ),
    }
    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    manifest = build_manifest(
        experiment_id=experiment_id,
        run_id=run_id,
        mode=mode,
        dataset_ids=["golden_adk_cases", "teaching_quality_cases"],
        rubric_version="7B.1",
        summary=summary,
        langsmith=langsmith,
        limitations=[
            "Live scores require funded Gemini credits.",
            "402 RESOURCE_EXHAUSTED must be labeled infrastructure failure, not teaching failure.",
            "Synthetic traffic only — no production learner traces.",
        ],
        errors=[],
    )
    write_manifest(out_dir, manifest)
    print(json.dumps({"run_id": run_id, "out_dir": str(out_dir), "status": summary["status"]}, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="VedicMath AI evaluation runner (Tollgate 7B.5)")
    sub = parser.add_subparsers(dest="command", required=True)

    offline = sub.add_parser("offline", help="Deterministic offline suites")
    offline.add_argument("--experiment-id", default="rishi-7b-baseline")
    offline.add_argument("--skip-knowledge", action="store_true")
    offline.add_argument(
        "--include-rag-retrieval",
        action="store_true",
        help="Include offline lexical RAG retrieval suite (not live teaching claim)",
    )
    offline.add_argument(
        "--with-langsmith",
        action="store_true",
        help="Attempt LangSmith configure (still offline; usually unused)",
    )
    offline.set_defaults(func=_cmd_offline)

    compare = sub.add_parser("compare", help="Compare two manifest.json files")
    compare.add_argument("--baseline", required=True)
    compare.add_argument("--candidate", required=True)
    compare.add_argument("--out")
    compare.add_argument("--allow-incompatible", action="store_true")
    compare.set_defaults(func=_cmd_compare)

    live = sub.add_parser("live", help="Live ADK shell (opt-in; no auto 402 retries)")
    live.add_argument("--experiment-id", default="rishi-live")
    live.add_argument("--with-langsmith", action="store_true")
    live.set_defaults(func=_cmd_live)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
