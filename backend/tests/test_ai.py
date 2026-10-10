import json

import httpx
import pytest

from app.core.config import settings
from app.core.errors import AIServiceError
from app.services import gardening_service, ollama_service

PLAN_REPLY = {
    "recommendations": [
        {
            "plant": "Green chilli",
            "reason": "Suits containers with enough sun.",
            "care_summary": "Well-draining mix.",
            "tasks": [
                {"title": "Check soil moisture", "frequency": "every day"},
                {"title": "Feed lightly", "frequency": "sometimes"},
            ],
        },
        {"plant": "Moon flower", "reason": "r", "care_summary": "c", "tasks": []},
        {"plant": "Mint", "reason": "r", "care_summary": "c", "tasks": []},
    ],
    "limitations": ["Verify locally."],
}


def test_extract_json_handles_fences_and_prose():
    assert gardening_service.extract_json('{"a": 1}') == {"a": 1}
    assert gardening_service.extract_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert gardening_service.extract_json('Sure! {"a": 1} Hope that helps') == {"a": 1}
    with pytest.raises(ValueError):
        gardening_service.extract_json("no json here")


def test_candidate_plants_respect_light_and_space(client):
    garden = {
        "location": "x",
        "garden_type": "balcony",
        "sunlight": "shade",
        "space_sqm": 1,
        "experience": "beginner",
        "interests": ["ornamentals"],
    }
    names = [p["name"] for p in gardening_service.candidate_plants(garden)]
    assert "Tomato" not in names  # needs full sun
    assert "Snake plant" in names


def test_planting_plan_success(client, garden, fake_ai):
    fake_ai.reply = json.dumps(PLAN_REPLY)
    res = client.post(
        "/api/v1/ai/planting-plan",
        json={"garden_id": garden["id"], "budget": 1000, "max_plants": 2},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["plan_id"].startswith("plan_")
    assert body["model"] == settings.ollama_model
    assert len(body["recommendations"]) == 2  # capped at max_plants
    first = body["recommendations"][0]
    assert first["from_catalog"] is True
    assert [t["frequency"] for t in first["tasks"]] == ["daily", "weekly"]  # normalised
    assert body["recommendations"][1]["from_catalog"] is False
    assert body["limitations"] == ["Verify locally."]


def test_planting_plan_requires_garden(client, fake_ai):
    res = client.post("/api/v1/ai/planting-plan", json={"garden_id": "nope"})
    assert res.status_code == 404


def test_planting_plan_validates_input(client, garden):
    res = client.post(
        "/api/v1/ai/planting-plan", json={"garden_id": garden["id"], "max_plants": 99}
    )
    assert res.status_code == 422


def test_malformed_ai_output_is_rejected_after_bounded_retry(client, garden, fake_ai):
    fake_ai.reply = "I think you should plant tomatoes!"
    res = client.post("/api/v1/ai/planting-plan", json={"garden_id": garden["id"]})
    assert res.status_code == 502
    assert res.json()["error"]["code"] == "ai_bad_response"
    assert fake_ai.calls == 2  # one retry, no more


def test_schema_mismatch_is_rejected(client, garden, fake_ai):
    fake_ai.reply = json.dumps({"recommendations": []})
    res = client.post("/api/v1/ai/planting-plan", json={"garden_id": garden["id"]})
    assert res.status_code == 502


def test_chat_success_forces_verification_when_causes_listed(client, garden, fake_ai):
    fake_ai.reply = json.dumps(
        {
            "answer": "Several things can cause this.",
            "possible_causes": ["Overwatering", "Nutrient deficiency"],
            "next_steps": ["Check drainage"],
            "requires_verification": False,
        }
    )
    res = client.post(
        "/api/v1/ai/chat",
        json={
            "garden_id": garden["id"],
            "message": "Why are my chilli leaves yellow?",
            "history": [{"role": "user", "content": "hi"}],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["possible_causes"] == ["Overwatering", "Nutrient deficiency"]
    assert body["requires_verification"] is True


def test_chat_without_garden_still_works(client, fake_ai):
    fake_ai.reply = json.dumps({"answer": "Water when the top soil is dry."})
    res = client.post("/api/v1/ai/chat", json={"message": "How often should I water?"})
    assert res.status_code == 200
    assert res.json()["next_steps"] == []


def test_chat_validates_message(client):
    assert client.post("/api/v1/ai/chat", json={"message": "   "}).status_code == 422
    assert client.post("/api/v1/ai/chat", json={"message": "x" * 1001}).status_code == 422


def test_chat_ai_unavailable_returns_503_and_other_endpoints_still_work(client, monkeypatch):
    async def down():
        return {"available": False, "model": "m", "model_installed": False, "detail": "down"}

    monkeypatch.setattr(ollama_service, "get_status", down)
    res = client.post("/api/v1/ai/chat", json={"message": "hello"})
    assert res.status_code == 503
    assert res.json()["error"]["code"] == "ai_unavailable"
    assert client.get("/api/v1/plants").status_code == 200


def test_model_not_installed(client, monkeypatch):
    async def missing():
        return {
            "available": True,
            "model": "gemma3:4b",
            "model_installed": False,
            "detail": "run ollama pull gemma3:4b",
        }

    monkeypatch.setattr(ollama_service, "get_status", missing)
    res = client.post("/api/v1/ai/chat", json={"message": "hello"})
    assert res.status_code == 503
    assert res.json()["error"]["code"] == "model_not_found"


def test_timeout_maps_to_504(client, monkeypatch):
    async def ok():
        return {"available": True, "model": "m", "model_installed": True, "detail": ""}

    class SlowClient:
        def __init__(self, *a, **k): ...
        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def post(self, *a, **k):
            raise httpx.ReadTimeout("slow")

    monkeypatch.setattr(ollama_service, "get_status", ok)
    monkeypatch.setattr(ollama_service.httpx, "AsyncClient", SlowClient)
    res = client.post("/api/v1/ai/chat", json={"message": "hello"})
    assert res.status_code == 504
    assert res.json()["error"]["code"] == "ai_timeout"


@pytest.mark.parametrize(
    ("model", "installed", "expected"),
    [
        ("gemma3:4b", ["gemma3:4b"], True),
        ("gemma3", ["gemma3:latest"], True),
        ("gemma3:4b", ["gemma3:12b"], False),
        ("gemma3:4b", [], False),
    ],
)
def test_model_is_installed(model, installed, expected):
    assert ollama_service.model_is_installed(model, installed) is expected


@pytest.mark.anyio
async def test_ensure_model_raises_typed_error(monkeypatch):
    async def down():
        return {"available": False, "model": "m", "model_installed": False, "detail": "down"}

    monkeypatch.setattr(ollama_service, "get_status", down)
    with pytest.raises(AIServiceError) as info:
        await ollama_service.ensure_model_available()
    assert info.value.code == "ai_unavailable"
