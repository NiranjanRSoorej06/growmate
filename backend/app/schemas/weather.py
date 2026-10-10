from pydantic import BaseModel


class WeatherDay(BaseModel):
    date: str
    temp_max_c: float | None = None
    temp_min_c: float | None = None
    rain_mm: float | None = None
    rain_probability: int | None = None


class WeatherOut(BaseModel):
    place: str
    temperature_c: float | None = None
    humidity: int | None = None
    days: list[WeatherDay]
    advice: list[str]
    source: str = "Open-Meteo"
