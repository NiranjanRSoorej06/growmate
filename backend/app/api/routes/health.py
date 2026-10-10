from fastapi import APIRouter

from app.schemas.health import HealthOut
from app.services import ollama_service

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthOut)
async def health() -> HealthOut:
    """The API is up if this answers. `ai` reports whether Gemma is usable."""
    return HealthOut(status="ok", ai=await ollama_service.get_status())
