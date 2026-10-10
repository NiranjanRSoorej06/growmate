import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.db import repositories as repo
from app.db.database import get_db
from app.schemas.garden import GardenIn, GardenOut, GardenSaved

router = APIRouter(tags=["garden"])


@router.get("/garden", response_model=GardenOut)
def get_garden(db: sqlite3.Connection = Depends(get_db)):
    garden = repo.get_garden(db)
    if garden is None:
        raise HTTPException(404, "No garden profile yet. Create one with PUT /garden.")
    return garden


@router.put("/garden", response_model=GardenSaved)
def save_garden(data: GardenIn, db: sqlite3.Connection = Depends(get_db)):
    garden = repo.upsert_garden(db, data)
    return GardenSaved(id=garden["id"])
