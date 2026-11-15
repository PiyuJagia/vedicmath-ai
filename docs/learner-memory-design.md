# Learner memory design (Phase 5)

## Goal

Durable, privacy-safe learner history that personalizes Rishi without inventing mastery.

## Current implementation (safe milestone)

| Layer | Status |
|---|---|
| ADK chat session | In-memory per backend process (`InMemorySessionService`) |
| Browser chat history | `sessionStorage` via `coachClient` |
| Local progress | `localStorage` via `ProgressContext` (visits/levels) |
| Live coaching context | `CoachLearningContext` + optional `progress_note` |

**Not claimed:** cross-device sync, multi-user authorization, or durable Postgres mastery.

## Blockers for full durable memory

1. **No Render Postgres** instance in the workspace today.
2. **No real authentication** — display name is not identity. Client-supplied IDs alone are unsafe for authorization.
3. Render **ephemeral filesystem** — SQLite on disk would not survive restarts.

## Target schema (when Postgres + auth exist)

- `learners` — opaque server id, created at signup/login
- `learner_preferences` — coaching style, accessibility
- `learning_events` — append-only verified attempts, visits, hint uses
- `sutra_mastery` — inferred from events (never written by the LLM)
- `conversation_sessions` — session ids correlated to learner
- `calculation_records` — verified engine calculations

## Privacy / child-focused controls

- Prefer opaque tokens over PII in traces
- Retention/deletion endpoints once auth exists
- LangSmith: keep `LANGSMITH_PROJECT` unset; use agent env `local` / `production`
- Do not paste full history into every prompt — summarize selectively

## Interim personalization rule

Rishi may use:
- Current screen / sutra / difficulty / verified `check_status`
- Short `progress_note` from local ProgressContext
- Same-session ADK memory

Rishi must not invent prior session mastery.
