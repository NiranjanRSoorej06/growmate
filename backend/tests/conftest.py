import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services import gardening_service

VALID_GARDEN = {
    "location": "Ernakulam, Kerala, India",
    "garden_type": "balcony",
    "sunlight": "partial",
    "space_sqm": 4,
    "experience": "beginner",
    "interests": ["herbs", "vegetables"],
}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "database_path", str(tmp_path / "test.db"))
    monkeypatch.setattr(settings, "serpapi_key", "")
    gardening_service._load_catalog.cache_clear()
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def garden(client):
    res = client.put("/api/v1/garden", json=VALID_GARDEN)
    assert res.status_code == 200
    return res.json()


@pytest.fixture()
def plant(client):
    return client.post("/api/v1/plants", json={"name": "Green chilli"}).json()


@pytest.fixture()
def fake_ai(monkeypatch):
    """Replace the Ollama call. Set `fake_ai.reply` to the text the 'model' returns."""

    class Fake:
        reply = "{}"
        calls = 0

    fake = Fake()

    async def _chat(messages, **kwargs):
        fake.calls += 1
        return fake.reply

    monkeypatch.setattr("app.services.ollama_service.chat", _chat)
    return fake
