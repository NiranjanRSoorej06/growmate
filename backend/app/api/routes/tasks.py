import sqlite3
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.db import repositories as repo
from app.db.database import get_db
from app.schemas.task import TaskIn, TaskOut, TaskPatch

router = APIRouter(tags=["tasks"])


@router.get("/tasks", response_model=list[TaskOut])
def list_tasks(
    status: Literal["all", "open", "done"] = "all",
    plant_id: int | None = Query(default=None),
    db: sqlite3.Connection = Depends(get_db),
):
    return repo.list_tasks(db, status=status, plant_id=plant_id)


@router.post("/tasks", response_model=TaskOut, status_code=201)
def create_task(data: TaskIn, db: sqlite3.Connection = Depends(get_db)):
    if data.plant_id is not None and repo.get_plant(db, data.plant_id) is None:
        raise HTTPException(404, "Plant not found.")
    return repo.create_task(db, data)


@router.patch("/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: int, patch: TaskPatch, db: sqlite3.Connection = Depends(get_db)):
    task = repo.update_task(db, task_id, patch)
    if task is None:
        raise HTTPException(404, "Task not found.")
    return task


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, db: sqlite3.Connection = Depends(get_db)):
    if not repo.delete_task(db, task_id):
        raise HTTPException(404, "Task not found.")
    return Response(status_code=204)
