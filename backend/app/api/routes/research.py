from fastapi import APIRouter

from app.schemas.ai import ResearchRequest, ResearchResponse
from app.services import search_service

router = APIRouter(tags=["research"])


@router.post("/research", response_model=ResearchResponse)
async def research(req: ResearchRequest):
    return await search_service.search(req.query)
