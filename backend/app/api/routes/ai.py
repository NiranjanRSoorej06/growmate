import logging
import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.core.errors import ServiceError
from app.db import repositories as repo
from app.db.database import get_db
from app.schemas.ai import ChatRequest, ChatResponse, PlanRequest, PlanResponse
from app.services import gardening_service, weather_service

logger = logging.getLogger("growmate.ai")
router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/planting-plan", response_model=PlanResponse)
async def planting_plan(req: PlanRequest, db: sqlite3.Connection = Depends(get_db)):
    garden = repo.get_garden(db, req.garden_id)
    if garden is None:
        raise HTTPException(404, "Garden not found. Save a garden profile first.")

    weather_note = None
    if req.use_weather:
        try:
            weather = await weather_service.get_weather(garden["location"])
            weather_note = weather_service.summarise(weather)
        except ServiceError as exc:  # weather is optional: carry on without it
            logger.info("Weather skipped: %s", exc.code)

    plan = await gardening_service.generate_plan(garden, req, weather_note)
    repo.save_plan(db, plan.plan_id, req.garden_id, plan.model, plan.model_dump())
    return plan


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, db: sqlite3.Connection = Depends(get_db)):
    garden = repo.get_garden(db, req.garden_id) if req.garden_id else None
    if req.garden_id and garden is None:
        raise HTTPException(404, "Garden not found. Save a garden profile first.")
    plants = repo.list_plants(db)
    tasks = repo.list_tasks(db, status="open")
    return await gardening_service.answer_question(req, garden, plants, tasks)
