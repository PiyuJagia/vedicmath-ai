# Google ADK agents

This folder holds [Google Agent Development Kit](https://adk.dev/) agents.
The first agent is `vedic_math_coach`. Mathematical engines will be attached as
tools in a later tollgate; they are not connected yet.

## Prerequisites

- Python 3.12 (see `.python-version` at the repo root)
- The project virtual environment with backend dependencies installed:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
  (or Vertex AI credentials — see `.env.example` at the repo root)

Copy `.env.example` to `.env` at the **repository root** and fill in values.
Never commit `.env`.

## Verify the install

```powershell
python -c "import google.adk; print(google.adk.__version__)"
adk --help
```

## Tollgate 2 — Gemini connectivity

With a repository-root `.env` containing `GOOGLE_API_KEY` and
`GOOGLE_GENAI_USE_VERTEXAI=false`:

```powershell
python -m pytest backend/tests/test_gemini_connectivity.py -v
```

The live test sends `Hello, can you hear me?` through ADK's Gemini wrapper
using model `gemini-3.8-flash`. It never prints the API key.

## Coach Agent (`vedic_math_coach`)

Package layout:

```text
vedic_math_coach/
  agent.py           # root_agent entry for ADK
  instructions.md    # persona + guardrail prompt
  personas.py
  session.py         # InMemorySessionService + chat helper
  config.py
  __init__.py
```

Personas: Boy Coach (tutor), Rabbit (visual hints), Hummingbird (encouragement).
Only one speaks per reply.

Maths tools (Tollgate 4B): `calculate_sutra`, `get_lesson`, `check_practice_answer`
in `vedic_math_coach/tools/`. They wrap the existing Python engines; the LLM must
not invent arithmetic or animation events.

Animation handoff (Tollgate 5A): typed FastAPI routes under `/coach/*` in
`vedic_math_coach/handoff/`. Backend builds `watch_animation` / `open_animation`
actions from session-owned `calculation_id` values; React must not parse LLM prose
for animation events.

| Route | Purpose |
|---|---|
| `POST /coach/sessions` | Mint a learner session id |
| `POST /coach/calculations` | Deterministic calc + optional Watch action |
| `POST /coach/animations` | Resolve Watch/Open from structured `intent` enum |
| `POST /coach/handoff` | Compose message + optional structured action |

Tollgate 6A live chat: `POST /coach/chat` runs the ADK Runner; React harness at
`/coach-handoff` (local DEV, `VITE_COACH_HANDOFF=true`, or admin). Scripted
Theory/Practice coaches stay on `demoCoach`.

```powershell
python -m pytest backend/tests/test_vedic_math_coach.py backend/tests/test_coach_tools.py backend/tests/test_animation_handoff.py backend/tests/test_coach_chat.py -v
cd frontend; npm test
```

## Running the ADK development UI

ADK's web UI is for **local development only**, not production.

```powershell
.\.venv\Scripts\Activate.ps1
# ensure .env exists at the repo root
adk web backend\agents --port 8080
```

Open http://127.0.0.1:8080 and select **vedic_math_coach**.

Use a port other than `8000` so it does not collide with the FastAPI app
(`uvicorn backend.main:app --reload`). ADK Web is unauthenticated and for
trusted local networks only.

CLI alternative:

```powershell
adk run backend\agents\vedic_math_coach
```

## Notes

- Mathematical algorithms live in `backend/*.py` and must stay deterministic;
  agents should call them as tools, not reimplement them.
- Do not put API keys in this folder. Use the repo-root `.env` (gitignored).

## Runtime reply guards

`vedic_math_coach/guards/` holds deterministic checks for a live reply:
`review_reply(reply, tool_responses, learner_texts)` reports numbers that no
tool or learner supplied, false equations, and replies where more than one
persona speaks. It does not change the reply. It isn't wired into `/coach/chat`
yet; that follows once the live-Rishi fixes on `handoff/chat_service.py` merge.

## MCP server

`backend/mcp_server/` exposes the same maths tools over MCP for other clients.
It is optional and not deployed. See its README.
