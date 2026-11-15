"""App-level LangSmith + Google ADK tracing wiring for Rishi."""

from __future__ import annotations

from backend.agents.vedic_math_coach.observability.langsmith import (
    ensure_langsmith_tracing,
    langsmith_available,
    langsmith_tracing_enabled,
    reset_langsmith_config_state_for_tests,
)


def test_tracing_off_without_flag(monkeypatch):
    reset_langsmith_config_state_for_tests()
    monkeypatch.delenv("LANGSMITH_TRACING", raising=False)
    monkeypatch.setenv("LANGSMITH_API_KEY", "lsv2_test")
    assert langsmith_tracing_enabled() is False
    status = ensure_langsmith_tracing()
    assert status["enabled"] is False


def test_tracing_off_without_api_key(monkeypatch):
    reset_langsmith_config_state_for_tests()
    monkeypatch.setenv("LANGSMITH_TRACING", "true")
    monkeypatch.delenv("LANGSMITH_API_KEY", raising=False)
    assert langsmith_tracing_enabled() is False


def test_sdk_google_adk_integration_importable():
    assert langsmith_available() is True


def test_ensure_with_key_configures_or_reports(monkeypatch):
    """With tracing opted in, configure is attempted; failures must not raise."""
    reset_langsmith_config_state_for_tests()
    monkeypatch.setenv("LANGSMITH_TRACING", "true")
    monkeypatch.setenv("LANGSMITH_API_KEY", "lsv2_fake_not_a_real_key")
    monkeypatch.setenv("LANGSMITH_ENDPOINT", "https://api.smith.langchain.com")
    monkeypatch.setenv("LANGSMITH_AGENT_ID", "vedicmath-ai-rishi")
    monkeypatch.setenv("LANGSMITH_AGENT_ENVIRONMENT", "local")
    status = ensure_langsmith_tracing()
    assert status["agent_id"] == "vedicmath-ai-rishi"
    assert status["agent_environment"] == "local"
    assert status["endpoint"] == "https://api.smith.langchain.com"
    # Fake key may still patch ADK wrappers successfully; either enabled or soft error.
    assert "enabled" in status
    assert status.get("error") is None or isinstance(status.get("error"), str)


def test_chat_turn_is_traceable_wrapped():
    from backend.agents.vedic_math_coach import session as session_mod

    assert callable(session_mod.chat_turn)
    # langsmith.traceable preserves the underlying coroutine via __wrapped__
    wrapped = getattr(session_mod.chat_turn, "__wrapped__", None)
    assert wrapped is session_mod._chat_turn_impl or wrapped is not None


def test_production_privacy_redacts_message(monkeypatch):
    from backend.agents.vedic_math_coach.observability import langsmith as ls

    reset_langsmith_config_state_for_tests()
    monkeypatch.setenv("LANGSMITH_AGENT_ENVIRONMENT", "production")
    assert ls.production_io_redaction_enabled() is True
    processed = ls.privacy_process_inputs(
        {"session_id": "kid-session-123", "message": "help me", "runner": object()}
    )
    assert "runner" not in processed
    assert processed["message"].startswith("[REDACTED_MESSAGE")
    assert processed["session_id"] != "kid-session-123"
    assert len(processed["session_id"]) == 16
