from fastapi import APIRouter

from app.api.routes import ai, garden, health, journal, plants, research, tasks, weather

api_router = APIRouter(prefix="/api/v1")
for module in (health, garden, plants, ai, tasks, journal, weather, research):
    api_router.include_router(module.router)
