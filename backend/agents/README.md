# Google ADK agents

This folder is reserved for [Google Agent Development Kit](https://adk.dev/)
agents that will call our existing Python Sutra engines as tools.

No conversational agent is implemented yet. The package is here so Phase 2 can
add agents without rearranging the backend.

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

## Running the ADK development UI (after an agent exists)

ADK's web UI is for **local development only**, not production.

1. Create an agent subfolder under this package, for example
   `backend/agents/coach_agent/`, with `__init__.py` and `agent.py` that
   define `root_agent` (Phase 2).
2. Start the development UI against this folder (from the repo root):

```powershell
adk web backend\agents --port 8080
```

Or from inside `backend\agents`:

```powershell
cd backend\agents
adk web . --port 8080
```

3. Open http://127.0.0.1:8080, pick the agent in the UI, and chat.

Use a port other than `8000` so it does not collide with the FastAPI app
(`uvicorn backend.main:app --reload`). ADK Web is unauthenticated and for
trusted local networks only.

CLI alternative:

```powershell
adk run backend\agents\coach_agent
```

## Notes

- Mathematical algorithms live in `backend/*.py` and must stay deterministic;
  agents should call them as tools, not reimplement them.
- Do not put API keys in this folder. Use the repo-root `.env` (gitignored).
