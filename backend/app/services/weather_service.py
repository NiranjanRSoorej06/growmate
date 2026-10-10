"""Optional weather context from Open-Meteo (no API key needed)."""

import httpx

from app.core.config import settings
from app.core.errors import ServiceError
from app.schemas.weather import WeatherDay, WeatherOut

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"


def _candidates(location: str) -> list[str]:
    parts = [p.strip() for p in location.split(",") if p.strip()]
    seen: list[str] = []
    for c in [location.strip(), *parts]:
        if c and c not in seen:
            seen.append(c)
    return seen


def build_advice(
    temperature: float | None, humidity: int | None, today: WeatherDay | None
) -> list[str]:
    advice: list[str] = []
    if today:
        rainy = (today.rain_probability or 0) >= 60 or (today.rain_mm or 0) >= 5
        if rainy:
            advice.append("Rain is likely today. Skip watering and check that pots drain freely.")
        if today.temp_max_c is not None and today.temp_max_c >= 35:
            advice.append("It will be hot. Water early or in the evening and shade young plants.")
        if today.temp_min_c is not None and today.temp_min_c <= 5:
            advice.append("Cold night ahead. Bring tender plants indoors or cover them.")
    if humidity is not None and humidity >= 85:
        advice.append("Humidity is high. Give plants space for airflow and watch for fungus.")
    if not advice:
        advice.append("Good conditions for outdoor work today.")
    return advice


async def get_weather(location: str) -> WeatherOut:
    timeout = settings.external_timeout
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            place = None
            for name in _candidates(location):
                geo = await client.get(GEOCODE_URL, params={"name": name, "count": 1})
                geo.raise_for_status()
                results = geo.json().get("results") or []
                if results:
                    place = results[0]
                    break
            if place is None:
                raise ServiceError(
                    "location_not_found", f"Could not find '{location}' for weather.", 404
                )

            fc = await client.get(
                FORECAST_URL,
                params={
                    "latitude": place["latitude"],
                    "longitude": place["longitude"],
                    "current": "temperature_2m,relative_humidity_2m",
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,"
                    "precipitation_probability_max",
                    "timezone": "auto",
                    "forecast_days": 3,
                },
            )
            fc.raise_for_status()
            data = fc.json()
    except ServiceError:
        raise
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise ServiceError(
            "weather_unavailable", "Weather data is unavailable right now.", 503
        ) from exc

    daily = data.get("daily", {})
    dates = daily.get("time", [])
    days = [
        WeatherDay(
            date=d,
            temp_max_c=(daily.get("temperature_2m_max") or [None] * len(dates))[i],
            temp_min_c=(daily.get("temperature_2m_min") or [None] * len(dates))[i],
            rain_mm=(daily.get("precipitation_sum") or [None] * len(dates))[i],
            rain_probability=(daily.get("precipitation_probability_max") or [None] * len(dates))[i],
        )
        for i, d in enumerate(dates)
    ]
    current = data.get("current", {})
    temperature = current.get("temperature_2m")
    humidity = current.get("relative_humidity_2m")
    label = ", ".join(
        x for x in [place.get("name"), place.get("admin1"), place.get("country")] if x
    )
    return WeatherOut(
        place=label,
        temperature_c=temperature,
        humidity=humidity,
        days=days,
        advice=build_advice(temperature, humidity, days[0] if days else None),
    )


def summarise(weather: WeatherOut) -> str:
    today = weather.days[0] if weather.days else None
    bits = [f"{weather.temperature_c}°C now" if weather.temperature_c is not None else ""]
    if today and today.rain_probability is not None:
        bits.append(f"{today.rain_probability}% chance of rain today")
    if today and today.temp_max_c is not None:
        bits.append(f"high {today.temp_max_c}°C")
    return ", ".join(b for b in bits if b) or "no details available"
