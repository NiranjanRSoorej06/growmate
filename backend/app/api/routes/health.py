from fastapi import APIRouter

from app.core.monitoring import sentry_is_enabled
from app.schemas.health import HealthOut
from app.services import ollama_service

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthOut)
async def health() -> HealthOut:
    """The API is up if this answers. `ai` reports whether Gemma is usable.
    `sentry_enabled` reports whether error monitoring is actively sending events."""
    return HealthOut(
        status="ok", ai=await ollama_service.get_status(), sentry_enabled=sentry_is_enabled()
    )
