# Production image: build the React frontend, then serve it with the FastAPI backend.

FROM node:24-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY --from=frontend /app/frontend/dist ./frontend/dist

# Render provides PORT; 10000 is its default.
CMD ["sh", "-c", "uvicorn backend.server:site --host 0.0.0.0 --port ${PORT:-10000}"]
