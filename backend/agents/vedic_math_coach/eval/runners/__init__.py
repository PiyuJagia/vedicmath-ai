"""Unified evaluation runners (Tollgate 7B.5)."""

from .compare import compare_manifests, render_markdown_table
from .offline import run_offline_suites

__all__ = ["run_offline_suites", "compare_manifests", "render_markdown_table"]
