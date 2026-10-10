"""Optional gardening research via SerpApi. Results are untrusted data."""

import httpx

from app.core.config import settings
from app.core.errors import ServiceError
from app.schemas.ai import ResearchResponse, ResearchResult

SERPAPI_URL = "https://serpapi.com/search.json"


async def search(query: str) -> ResearchResponse:
    if not settings.serpapi_key:
        raise ServiceError(
            "research_not_configured",
            "Research is off. Add SERPAPI_KEY to your .env file to enable it.",
            503,
        )
    try:
        async with httpx.AsyncClient(timeout=settings.external_timeout) as client:
            resp = await client.get(
                SERPAPI_URL,
                params={
                    "engine": "google",
                    "q": f"{query} gardening",
                    "num": 5,
                    "api_key": settings.serpapi_key,
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        # Do not include the exception text: it can contain the request URL and API key.
        raise ServiceError(
            "research_unavailable", "The research service is unavailable right now.", 503
        ) from exc

    results = [
        ResearchResult(
            title=str(item.get("title", ""))[:200],
            link=str(item["link"]),
            snippet=str(item.get("snippet", ""))[:400],
            date=item.get("date"),
        )
        for item in (data.get("organic_results") or [])[:5]
        if item.get("link")
    ]
    return ResearchResponse(query=query, results=results)
