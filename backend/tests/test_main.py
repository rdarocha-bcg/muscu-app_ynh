"""
Tests for muscu-app FastAPI backend.
Run with: cd backend && python -m pytest tests/ -v
"""
import os
import pytest
import tempfile


@pytest.fixture()
def client(tmp_path):
    db_file = tmp_path / "test.db"
    os.environ["MUSCU_API_KEY"] = "test-key"
    os.environ["MUSCU_DB_PATH"] = str(db_file)

    # Force re-import so module picks up new env vars
    import importlib
    import sys
    for key in list(sys.modules.keys()):
        if key == "main":
            del sys.modules[key]

    import main as app_module
    app_module.init_db()

    from fastapi.testclient import TestClient
    with TestClient(app_module.app) as c:
        yield c


HEADERS = {"X-API-Key": "test-key"}


@pytest.fixture()
def auth_headers():
    return HEADERS


class TestAuth:
    def test_api_requires_key(self, client):
        r = client.get("/api/sessions")
        assert r.status_code == 401

    def test_api_wrong_key(self, client):
        r = client.get("/api/sessions", headers={"X-API-Key": "wrong"})
        assert r.status_code == 401

    def test_api_valid_key(self, client):
        r = client.get("/api/sessions", headers=HEADERS)
        assert r.status_code == 200

    def test_config_no_auth_required(self, client):
        """GET /config must not require auth (fetched before API_KEY is known)."""
        r = client.get("/config")
        assert r.status_code == 200
        assert "api_key" in r.json()


class TestSessions:
    def test_list_empty(self, client):
        r = client.get("/api/sessions", headers=HEADERS)
        body = r.json()
        assert body["data"] == []
        assert body["total"] == 0

    def test_create_and_list(self, client):
        r = client.post("/api/sessions", headers=HEADERS,
                        json={"date": "2024-01-15", "notes": "Test", "tags": ["push"]})
        assert r.status_code == 200
        session_id = r.json()["id"]

        sessions = client.get("/api/sessions", headers=HEADERS).json()["data"]
        assert len(sessions) == 1
        assert sessions[0]["id"] == session_id
        assert sessions[0]["date"] == "2024-01-15"
        assert "push" in sessions[0]["tags"]

    def test_exercise_count_in_sessions(self, client):
        r = client.post("/api/sessions", headers=HEADERS,
                        json={"date": "2024-01-15", "notes": "", "tags": []})
        sid = r.json()["id"]
        client.post(f"/api/sessions/{sid}/logs", headers=HEADERS,
                    json={"exercise": "Squat", "sets": [{"reps": 5, "weight": 100}]})
        client.post(f"/api/sessions/{sid}/logs", headers=HEADERS,
                    json={"exercise": "Bench", "sets": [{"reps": 5, "weight": 80}]})

        sessions = client.get("/api/sessions", headers=HEADERS).json()["data"]
        assert sessions[0]["exercise_count"] == 2

    def test_delete_session(self, client):
        r = client.post("/api/sessions", headers=HEADERS,
                        json={"date": "2024-01-15", "notes": "", "tags": []})
        sid = r.json()["id"]
        client.delete(f"/api/sessions/{sid}", headers=HEADERS)
        body = client.get("/api/sessions", headers=HEADERS).json()
        assert body["data"] == []

    def test_tag_filter(self, client):
        client.post("/api/sessions", headers=HEADERS,
                    json={"date": "2024-01-15", "notes": "", "tags": ["push"]})
        client.post("/api/sessions", headers=HEADERS,
                    json={"date": "2024-01-16", "notes": "", "tags": ["pull"]})

        push = client.get("/api/sessions?tag=push", headers=HEADERS).json()["data"]
        assert len(push) == 1
        assert "push" in push[0]["tags"]

    def test_sessions_pagination(self, client, auth_headers):
        for i in range(1, 4):
            client.post("/api/sessions", headers=auth_headers,
                        json={"date": f"2024-01-{i:02d}", "notes": "", "tags": []})

        body = client.get("/api/sessions?limit=2", headers=auth_headers).json()
        assert body["total"] == 3
        assert len(body["data"]) == 2
        assert body["limit"] == 2
        assert body["offset"] == 0

    def test_sessions_offset(self, client, auth_headers):
        for i in range(1, 4):
            client.post("/api/sessions", headers=auth_headers,
                        json={"date": f"2024-01-{i:02d}", "notes": "", "tags": []})

        body = client.get("/api/sessions?offset=2", headers=auth_headers).json()
        assert body["total"] == 3
        assert len(body["data"]) == 1


class TestLogs:
    def _create_session(self, client):
        r = client.post("/api/sessions", headers=HEADERS,
                        json={"date": "2024-01-15", "notes": "", "tags": []})
        return r.json()["id"]

    def test_log_exercise(self, client):
        sid = self._create_session(client)
        r = client.post(f"/api/sessions/{sid}/logs", headers=HEADERS,
                        json={"exercise": "Deadlift", "sets": [{"reps": 3, "weight": 150}]})
        assert r.status_code == 200

        logs = client.get(f"/api/sessions/{sid}/logs", headers=HEADERS).json()
        assert len(logs) == 1
        assert logs[0]["exercise"] == "Deadlift"

    def test_delete_log(self, client):
        sid = self._create_session(client)
        client.post(f"/api/sessions/{sid}/logs", headers=HEADERS,
                    json={"exercise": "Squat", "sets": [{"reps": 5, "weight": 100}]})
        logs = client.get(f"/api/sessions/{sid}/logs", headers=HEADERS).json()
        lid = logs[0]["id"]
        client.delete(f"/api/logs/{lid}", headers=HEADERS)
        logs_after = client.get(f"/api/sessions/{sid}/logs", headers=HEADERS).json()
        assert logs_after == []


class TestExercises:
    def test_exercises_list(self, client):
        client.post("/api/sessions", headers=HEADERS,
                    json={"date": "2024-01-15", "notes": "", "tags": []})
        sessions = client.get("/api/sessions", headers=HEADERS).json()["data"]
        sid = sessions[0]["id"]
        client.post(f"/api/sessions/{sid}/logs", headers=HEADERS,
                    json={"exercise": "OHP", "sets": [{"reps": 5, "weight": 50}]})

        exercises = client.get("/api/exercises", headers=HEADERS).json()
        assert "OHP" in exercises

    def test_frequent_exercises(self, client):
        r = client.get("/api/exercises/frequent", headers=HEADERS)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
