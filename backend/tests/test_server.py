"""Tests for the production server that serves the API and the built frontend."""

import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<!doctype html><div id='root'></div>", encoding="utf-8")
    (tmp_path / "assets" / "app.js").write_text("console.log('app')", encoding="utf-8")
    (tmp_path / "favicon.svg").write_text("<svg/>", encoding="utf-8")
    (tmp_path.parent / "secret.txt").write_text("do not serve", encoding="utf-8")
    monkeypatch.setenv("FRONTEND_DIST", str(tmp_path))

    import backend.server

    return TestClient(importlib.reload(backend.server).site)


def test_api_is_served_under_api(client):
    response = client.get("/api/sutras/nikhilam/lesson", params={"a": 98, "b": 97})
    assert response.status_code == 200
    assert response.json()["result"] == 9506


def test_api_errors_pass_through(client):
    response = client.get("/api/sutras/nikhilam/lesson", params={"a": 50, "b": 97})
    assert response.status_code == 400


def test_answer_checking_works_through_the_prefix(client):
    response = client.post("/api/sutras/nikhilam/check", json={"question": "deviation_a", "answer": "2", "a": 98, "b": 97})
    assert response.json()["status"] == "correct"


def test_home_and_app_pages_return_the_frontend(client):
    for path in ("/", "/explore", "/sutras/nikhilam/practice"):
        response = client.get(path)
        assert response.status_code == 200
        assert "id='root'" in response.text


def test_built_files_are_served(client):
    assert client.get("/assets/app.js").text == "console.log('app')"
    assert "immutable" in client.get("/assets/app.js").headers["cache-control"]
    assert client.get("/favicon.svg").text == "<svg/>"


def test_files_outside_the_build_are_never_served(client):
    response = client.get("/..%2Fsecret.txt")
    assert "do not serve" not in response.text
