from app.services import ollama_service
from tests.conftest import VALID_GARDEN


def test_health_reports_ai_down(client, monkeypatch):
    async def down():
        return {
            "available": False,
            "model": "gemma3:4b",
            "model_installed": False,
            "detail": "Cannot reach Ollama",
        }

    monkeypatch.setattr(ollama_service, "get_status", down)
    res = client.get("/api/v1/health")
    assert res.status_code == 200  # the API itself is healthy
    body = res.json()
    assert body["status"] == "ok"
    assert body["ai"]["available"] is False


def test_garden_404_before_creation(client):
    res = client.get("/api/v1/garden")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "http_404"


def test_save_and_fetch_garden(client):
    res = client.put("/api/v1/garden", json=VALID_GARDEN)
    assert res.status_code == 200
    assert res.json() == {
        "id": "garden_001",
        "status": "saved",
        "recommended_next_step": "generate_planting_plan",
    }
    got = client.get("/api/v1/garden").json()
    assert got["location"] == "Ernakulam, Kerala, India"
    assert got["interests"] == ["herbs", "vegetables"]


def test_garden_update_overwrites(client, garden):
    client.put("/api/v1/garden", json={**VALID_GARDEN, "sunlight": "full", "space_sqm": 9})
    got = client.get("/api/v1/garden").json()
    assert got["sunlight"] == "full"
    assert got["space_sqm"] == 9


def test_invalid_garden_returns_validation_error(client):
    bad = {**VALID_GARDEN, "sunlight": "blazing", "space_sqm": -1, "location": " "}
    res = client.put("/api/v1/garden", json=bad)
    assert res.status_code == 422
    err = res.json()["error"]
    assert err["code"] == "validation_error"
    fields = {d["field"] for d in err["details"]}
    assert {"sunlight", "space_sqm", "location"} <= fields


def test_interests_are_cleaned(client):
    res = client.put("/api/v1/garden", json={**VALID_GARDEN, "interests": [" Herbs ", "herbs", ""]})
    assert res.status_code == 200
    assert client.get("/api/v1/garden").json()["interests"] == ["herbs"]
