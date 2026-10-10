import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Query

from app.db import repositories as repo
from app.db.database import get_db
from app.schemas.weather import WeatherOut
from app.services import weather_service

router = APIRouter(tags=["weather"])


@router.get("/weather", response_model=WeatherOut)
async def weather(
    location: str | None = Query(default=None, min_length=2, max_length=120),
    db: sqlite3.Connection = Depends(get_db),
):
    """Weather for `location`, or for the saved garden's location if omitted."""
    if location is None:
        garden = repo.get_garden(db)
        if garden is None:
            raise HTTPException(404, "Save a garden profile or pass ?location=.")
        location = garden["location"]
    return await weather_service.get_weather(location)
