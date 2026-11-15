# LangSmith setup — VedicMath AI (Rishi)

## Stack (verified)

- Agent framework: **Google ADK** (not LangChain)
- Model: **Gemini** via AI Studio (`gemini-3.8-flash`)
- Official tracing: `langsmith.integrations.google_adk.configure_google_adk`
- Skills installed: `langsmith-trace`, `langsmith-dataset`, `langsmith-evaluator`

## Environment

```env
LANGSMITH_TRACING=true
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
LANGSMITH_API_KEY=<secret>
LANGSMITH_AGENT_ID=vedicmath-ai-rishi
LANGSMITH_AGENT_ENVIRONMENT=local
# Logical label only — at configure time we clear env conflict with agent addressing:
LANGSMITH_PROJECT=vedicmath-ai-rishi
```

Production Render should use `LANGSMITH_AGENT_ENVIRONMENT=production` and
`VEDIC_LANGSMITH_REDACT_IO=true` (or rely on production environment auto-redaction
for custom `rishi_chat_turn` spans).

Tracing is **off** unless both `LANGSMITH_TRACING=true` and `LANGSMITH_API_KEY` are set.
Configuration failures never break coaching.

## Agent association

Create/select the LangSmith **agent** `vedicmath-ai-rishi` and environments
(`local`, `production`). Environment variables alone do not register an agent;
they address an existing agent destination.

**Important:** LangSmith will drop traces if both `LANGSMITH_PROJECT` and
`LANGSMITH_AGENT_ID`/`LANGSMITH_AGENT_ENVIRONMENT` are active destinations.
Our runtime clears `LANGSMITH_PROJECT` during `configure_google_adk(...)` and
uses **agent addressing** only. Keep `LANGSMITH_PROJECT` as a human label.

Do not pass `project_name` together with agent addressing in code.

If ingest returns **403 Forbidden**, the API key lacks permission, the agent
does not exist in the workspace, or the key is for a different org — fix in
LangSmith UI before expecting visible traces.

## What is traced

When enabled, ADK wrappers capture:

- Runner / agent invocations
- Gemini LLM calls (latency, errors)
- Tool calls (`calculate_sutra`, `get_lesson`, `check_practice_answer`,
  `get_progressive_hint`, optional knowledge search)
- Custom parent span `rishi_chat_turn` (inputs/outputs privacy-filtered in production)

## Privacy

- Never commit API keys.
- Production custom spans hash session ids and redact message/reply text when
  `LANGSMITH_AGENT_ENVIRONMENT=production` or `VEDIC_LANGSMITH_REDACT_IO=true`.
- ADK/LLM child spans may still contain model I/O depending on LangSmith SDK
  settings — treat production tracing as sensitive and restrict workspace access.
- Do not trace real children's private profiles or cross-session histories.

## Local verify

1. Set env vars in `.env`.
2. Start API: `uvicorn backend.main:app --reload --port 8000`
3. `POST /coach/chat` with a synthetic session id and math question.
4. Confirm a trace appears for agent `vedicmath-ai-rishi` / environment `local`.

## Install dependency

```bash
pip install "langsmith[google-adk]>=0.14.17"
```
