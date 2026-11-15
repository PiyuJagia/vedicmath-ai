"""Immutable experiment run manifests for Tollgate 7B.5."""

from __future__ import annotations

import hashlib
import json
import subprocess
import uuid
from datetime import datetime, timezone
from importlib import metadata as importlib_metadata
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[5]
EVAL_ROOT = Path(__file__).resolve().parents[1]
ARCHIVE_ROOT = EVAL_ROOT / "archive" / "runs"


def _sha256_file(path: Path) -> str | None:
    if not path.is_file():
        return None
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def _git_meta() -> dict[str, Any]:
    def run(args: list[str]) -> str | None:
        try:
            out = subprocess.check_output(args, cwd=REPO_ROOT, stderr=subprocess.DEVNULL, text=True)
            return out.strip()
        except Exception:  # noqa: BLE001
            return None

    branch = run(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    sha = run(["git", "rev-parse", "HEAD"])
    dirty = run(["git", "status", "--porcelain"])
    is_dirty = bool(dirty)
    patch_ref = None
    if is_dirty:
        # Stable-ish fingerprint of uncommitted work for reproducibility notes
        patch_ref = hashlib.sha256((dirty or "").encode("utf-8")).hexdigest()[:16]
    return {
        "git_branch": branch,
        "git_commit": sha,
        "working_tree_dirty": is_dirty,
        "dirty_patch_fingerprint": patch_ref,
    }


def _pkg_version(name: str) -> str | None:
    try:
        return importlib_metadata.version(name)
    except Exception:  # noqa: BLE001
        return None


def file_hash(rel_or_abs: str | Path) -> str | None:
    path = Path(rel_or_abs)
    if not path.is_absolute():
        path = EVAL_ROOT / path
    return _sha256_file(path)


def new_run_ids(experiment_id: str) -> tuple[str, str, Path]:
    run_id = f"{experiment_id}-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}-{uuid.uuid4().hex[:8]}"
    out_dir = ARCHIVE_ROOT / experiment_id / run_id
    out_dir.mkdir(parents=True, exist_ok=False)
    return experiment_id, run_id, out_dir


def build_manifest(
    *,
    experiment_id: str,
    run_id: str,
    mode: str,
    dataset_ids: list[str],
    rubric_version: str,
    summary: dict[str, Any],
    langsmith: dict[str, Any] | None = None,
    knowledge_pack_version: str | None = None,
    model_id: str | None = None,
    errors: list[str] | None = None,
    limitations: list[str] | None = None,
    duration_seconds: float | None = None,
) -> dict[str, Any]:
    from backend.agents.vedic_math_coach.config import GEMINI_MODEL

    instructions = EVAL_ROOT.parent / "instructions.md"
    return {
        "experiment_id": experiment_id,
        "run_id": run_id,
        "executed_at_utc": datetime.now(timezone.utc).isoformat(),
        **_git_meta(),
        "adk_version": _pkg_version("google-adk"),
        "langsmith_sdk_version": _pkg_version("langsmith"),
        "gemini_model": model_id or GEMINI_MODEL,
        "model_parameters": None,
        "agent_instruction_sha256": _sha256_file(instructions),
        "prompt_version": "instructions.md",
        "knowledge_pack_version": knowledge_pack_version,
        "dataset_ids": dataset_ids,
        "dataset_catalog_sha256": _sha256_file(EVAL_ROOT / "datasets" / "catalog.json"),
        "evaluator_rubric_version": rubric_version,
        "rubrics_sha256": _sha256_file(EVAL_ROOT / "rubrics.py"),
        "evaluation_mode": mode,
        "cases_attempted": summary.get("cases_attempted", summary.get("total")),
        "cases_completed": summary.get(
            "cases_completed",
            (
                (summary.get("passed") or 0) + (summary.get("failed") or 0)
                if summary.get("passed") is not None or summary.get("failed") is not None
                else summary.get("total")
            ),
        ),
        "cases_skipped": summary.get("cases_skipped", summary.get("skipped") or 0),
        "cases_failed": summary.get("cases_failed", summary.get("failed")),
        "per_category": summary.get("by_category") or summary.get("categories"),
        "summary": summary,
        "langsmith": langsmith or {"enabled": False},
        "duration_seconds": duration_seconds,
        "token_usage": summary.get("token_usage"),
        "estimated_cost_usd": summary.get("estimated_cost_usd"),
        "errors": errors or [],
        "limitations": limitations or [],
        "schema_version": "7B.5.1",
    }


def write_manifest(out_dir: Path, manifest: dict[str, Any]) -> Path:
    path = out_dir / "manifest.json"
    # Immutable: refuse overwrite
    if path.exists():
        raise FileExistsError(f"Manifest already exists: {path}")
    path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return path
