"""Optional MCP server: same engine results as the ADK tools, answers withheld by default."""

from __future__ import annotations

import asyncio
import json
import subprocess
import sys
from pathlib import Path

import pytest

pytest.importorskip("mcp")

from backend.agents.vedic_math_coach.tools.store import clear_store  # noqa: E402
from backend.mcp_server.server import build_server  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(autouse=True)
def _clean_store():
    clear_store()
    yield
    clear_store()


def _call(server, name: str, arguments: dict) -> dict:
    result = asyncio.run(server.call_tool(name, arguments))
    assert not result.is_error, result
    return result.structured_content


def test_lists_the_four_maths_tools(monkeypatch):
    monkeypatch.delenv("VEDIC_KNOWLEDGE_RAG", raising=False)
    tools = asyncio.run(build_server("t").list_tools())
    assert {tool.name for tool in tools} == {
        "calculate_sutra",
        "get_lesson",
        "check_practice_answer",
        "get_progressive_hint",
    }


def test_knowledge_search_follows_the_agent_flag(monkeypatch):
    monkeypatch.setenv("VEDIC_KNOWLEDGE_RAG", "1")
    tools = asyncio.run(build_server("t").list_tools())
    assert "search_vedic_math_knowledge" in {tool.name for tool in tools}


def test_calculation_comes_from_the_engine_and_feeds_get_lesson():
    server = build_server("t")
    calc = _call(server, "calculate_sutra", {"sutra": "nikhilam", "a": 98, "b": 97})
    assert calc["ok"] and calc["result"] == 9506
    lesson = _call(server, "get_lesson", {"calculation_id": calc["calculation_id"]})
    assert lesson["ok"]


def test_wrong_answer_never_reveals_the_correct_value():
    server = build_server("t")
    args = {"sutra": "nikhilam", "question_key": "left_part", "answer": "94", "a": 98, "b": 97}
    checked = _call(server, "check_practice_answer", args)
    assert checked["status"] == "incorrect"
    assert "correct_answer" not in checked


def test_unsupported_sutra_is_a_clear_error():
    server = build_server("t")
    response = _call(server, "calculate_sutra", {"sutra": "paravartya", "a": 12, "b": 3})
    assert response["ok"] is False and response["code"] == "unsupported_sutra"


def test_stdio_entry_point_keeps_stdout_clean():
    """A stray print on stdout would corrupt the MCP stream."""
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "test", "version": "0"}},
    }
    proc = subprocess.run(
        [sys.executable, "-m", "backend.mcp_server"],
        input=json.dumps(request) + "\n",
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
        timeout=60,
    )
    lines = [line for line in proc.stdout.splitlines() if line.strip()]
    assert lines, proc.stderr
    for line in lines:
        assert json.loads(line)["jsonrpc"] == "2.0"
