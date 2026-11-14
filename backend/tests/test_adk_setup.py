"""Smoke checks that Google ADK is installed for future agent work.

These tests do not call an LLM and do not construct an agent.
"""

import importlib


def test_google_adk_imports():
    adk = importlib.import_module("google.adk")
    assert hasattr(adk, "__version__")
    assert adk.__version__


def test_adk_agent_and_tool_modules_import():
    # Core surfaces Phase 2 will use; import only — no network, no LLM.
    importlib.import_module("google.adk.agents")
    importlib.import_module("google.adk.tools")
