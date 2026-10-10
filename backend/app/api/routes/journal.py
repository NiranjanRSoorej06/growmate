import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Query

from app.db import repositories as repo
from app.db.database import get_db
from app.schemas.journal import JournalIn, JournalOut

router = APIRouter(tags=["journal"])


@router.post("/journal", response_model=JournalOut, status_code=201)
def add_entry(data: JournalIn, db: sqlite3.Connection = Depends(get_db)):
    if repo.get_plant(db, data.plant_id) is None:
        raise HTTPException(404, "Plant not found.")
    return repo.create_entry(db, data)


@router.get("/journal", response_model=list[JournalOut])
def list_entries(
    plant_id: int | None = Query(default=None),
    db: sqlite3.Connection = Depends(get_db),
):
    return repo.list_entries(db, plant_id=plant_id)
