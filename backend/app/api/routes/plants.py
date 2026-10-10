import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Response

from app.db import repositories as repo
from app.db.database import get_db
from app.schemas.plant import PlantIn, PlantOut

router = APIRouter(tags=["plants"])


@router.get("/plants", response_model=list[PlantOut])
def list_plants(db: sqlite3.Connection = Depends(get_db)):
    return repo.list_plants(db)


@router.post("/plants", response_model=PlantOut, status_code=201)
def add_plant(data: PlantIn, db: sqlite3.Connection = Depends(get_db)):
    return repo.create_plant(db, data)


@router.get("/plants/{plant_id}", response_model=PlantOut)
def get_plant(plant_id: int, db: sqlite3.Connection = Depends(get_db)):
    plant = repo.get_plant(db, plant_id)
    if plant is None:
        raise HTTPException(404, "Plant not found.")
    return plant


@router.delete("/plants/{plant_id}", status_code=204)
def delete_plant(plant_id: int, db: sqlite3.Connection = Depends(get_db)):
    if not repo.delete_plant(db, plant_id):
        raise HTTPException(404, "Plant not found.")
    return Response(status_code=204)
