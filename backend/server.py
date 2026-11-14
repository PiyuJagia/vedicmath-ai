"""Production entry point: the API under /api and the built frontend at /.

Run locally after `npm run build` in frontend/:

    python -m uvicorn backend.server:site --port 8000
"""

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

from backend.main import app as api


DIST = Path(
    os.environ.get("FRONTEND_DIST", Path(__file__).resolve().parent.parent / "frontend" / "dist")
).resolve()

site = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
site.mount("/api", api)


@site.get("/{path:path}", include_in_schema=False)
def frontend(path: str):
    candidate = (DIST / path).resolve()
    if path and candidate.is_file() and DIST in candidate.parents:
        headers = {"Cache-Control": "public, max-age=31536000, immutable"} if path.startswith("assets/") else None
        return FileResponse(candidate, headers=headers)

    # Every other path is a page of the single-page app.
    index = DIST / "index.html"
    if not index.is_file():
        raise HTTPException(status_code=404, detail="Frontend build not found. Run npm run build in frontend/.")
    return FileResponse(index, headers={"Cache-Control": "no-cache"})
