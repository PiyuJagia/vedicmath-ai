"""CORS lets the separately hosted frontend call the API, and nobody else."""

import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://frontend.example.com, http://localhost:5173")
    import backend.main

    yield TestClient(importlib.reload(backend.main).app)
    monkeypatch.delenv("ALLOWED_ORIGINS")
    importlib.reload(backend.main)


def test_allowed_origin_can_read_lessons(client):
    response = client.get(
        "/sutras/nikhilam/lesson",
        params={"a": 98, "b": 97},
        headers={"Origin": "https://frontend.example.com"},
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://frontend.example.com"
    assert response.json()["result"] == 9506


def test_allowed_origin_can_post_answers(client):
    preflight = client.options(
        "/sutras/nikhilam/check",
        headers={
            "Origin": "https://frontend.example.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] == "https://frontend.example.com"


def test_other_origins_are_not_allowed(client):
    response = client.get(
        "/sutras/nikhilam/lesson",
        params={"a": 98, "b": 97},
        headers={"Origin": "https://somewhere-else.example.com"},
    )
    assert "access-control-allow-origin" not in response.headers


def test_default_allows_only_local_development(monkeypatch):
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    import backend.main

    module = importlib.reload(backend.main)
    assert module.ALLOWED_ORIGINS == ["http://localhost:5173", "http://127.0.0.1:5173"]
