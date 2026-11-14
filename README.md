
# VedicMath AI

An AI for Good project designed to make Vedic Mathematics accessible through interactive learning.

## Current Features

- Nikhilam multiplication using Vedic Mathematics
- Beginner, Intermediate, and Advanced difficulty levels
- Step-by-step mathematical explanations
- Carrying and borrowing logic
- FastAPI backend with interactive API documentation

## Technology Stack

- Python 3.12
- FastAPI
- VedicPy (vendored source code)

## Getting Started

### 1. Clone the repository

git clone https://github.com/PiyuJagia/vedicmath-ai.git

cd vedicmath-ai

### 2. Create a virtual environment

python -m venv .venv

### 3. Activate the environment (Windows PowerShell)

.\.venv\Scripts\Activate.ps1

### 4. Install dependencies

pip install -r requirements.txt

### 5. Start the backend

python -m uvicorn backend.main:app --reload

### 6. Open the API documentation

http://127.0.0.1:8000/docs

### 7. Start the frontend (in a second terminal)

cd frontend

npm install

npm run dev

Open http://localhost:5173. The frontend reaches the backend through `/api`, so keep the backend running on port 8000.

### Tests

python -m pytest backend/tests

cd frontend; npm test

### Google ADK (local agent development)

The backend depends on [Google ADK](https://adk.dev/) (`google-adk` in
`backend/requirements.txt`) so we can later add a tool-invoking educational
coach. Agents themselves are not implemented yet; see
[`backend/agents/README.md`](backend/agents/README.md) for install checks and
how to run `adk web` once an agent exists.

Copy [`.env.example`](.env.example) to `.env` for local LLM credentials. Do not
commit `.env`.

### Reviewing the app

- In Settings, choose **Admin: unlock everything** to open locked Sutras, or **Start fresh progress** to replace the sample learner.
- Let's Learn More accepts `?example=2&moment=7` to jump to a specific animation frame.
- Progress, settings and the profile are saved only in your browser for development; the coach is a scripted demo, not live AI.

## Deploying (Render)

The app runs as two Render services that both deploy from `main`:

- **Backend** – the web service `vedicmath-ai` (https://vedicmath-ai.onrender.com), configured in the Render Dashboard. Build: `pip install -r backend/requirements.txt`. Start: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`. Python 3.12.10 comes from `.python-version`. Its `ALLOWED_ORIGINS` environment variable lists the frontend URL so browsers may call the API (CORS).
- **Frontend** – the static site `vedicmath-ai-web`, defined in `render.yaml`. It builds `frontend/` with `VITE_API_BASE` set to the backend URL and rewrites every page path to `index.html`.

To preview a production-style build on one local server: build the frontend (`cd frontend; npm run build`), then `python -m uvicorn backend.server:site --port 8000` and open http://localhost:8000 (the API is under `/api`).

## Example API Request

GET /multiply/nikhilam?a=98&b=97&difficulty=beginner

Expected result: 9506

## Third-Party Attribution

This project includes a locally maintained copy of VedicPy.

Original repository:
https://github.com/utkarsh0702/vedicpy

VedicPy is distributed under the BSD 3-Clause License.
The original license is preserved in backend/vendor/vedicpy/LICENSE.

## Versions

Release notes are in [CHANGELOG.md](CHANGELOG.md). The API version is 0.2.0.

## Project Status

Backend development in progress.

Planned features include an adaptive AI Coach, Sutra Explorer,
Math Lab, practice assessments, and Sanskrit Shloka learning.
