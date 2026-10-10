from app.schemas.weather import WeatherDay
from app.services import weather_service


def test_research_not_configured(client):
    res = client.post("/api/v1/research", json={"query": "yellow chilli leaves"})
    assert res.status_code == 503
    assert res.json()["error"]["code"] == "research_not_configured"


def test_research_validates_query(client):
    assert client.post("/api/v1/research", json={"query": "a"}).status_code == 422


def test_weather_needs_location_or_garden(client):
    assert client.get("/api/v1/weather").status_code == 404


def test_weather_failure_does_not_break_plan(client, garden, fake_ai, monkeypatch):
    import json

    from app.core.errors import ServiceError

    async def boom(_):
        raise ServiceError("weather_unavailable", "down", 503)

    monkeypatch.setattr(weather_service, "get_weather", boom)
    fake_ai.reply = json.dumps(
        {"recommendations": [{"plant": "Mint", "reason": "r", "care_summary": "c"}]}
    )
    res = client.post(
        "/api/v1/ai/planting-plan", json={"garden_id": garden["id"], "use_weather": True}
    )
    assert res.status_code == 200
    assert res.json()["weather_used"] is False


def test_weather_advice_rules():
    rainy = WeatherDay(
        date="2026-10-10", rain_probability=80, rain_mm=10, temp_max_c=28, temp_min_c=24
    )
    assert any("Rain" in a for a in weather_service.build_advice(28, 70, rainy))
    hot = WeatherDay(date="2026-10-10", temp_max_c=38, temp_min_c=27, rain_probability=0)
    assert any("hot" in a.lower() for a in weather_service.build_advice(37, 40, hot))
    calm = WeatherDay(date="2026-10-10", temp_max_c=28, temp_min_c=22, rain_probability=10)
    assert weather_service.build_advice(27, 60, calm) == ["Good conditions for outdoor work today."]
