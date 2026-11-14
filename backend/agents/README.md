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
Only one speaks per reply. Calculation tools and animations are not connected yet.

```powershell
python -m pytest backend/tests/test_vedic_math_coach.py -v
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
