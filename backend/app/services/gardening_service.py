"""Builds prompts, calls Gemma, and validates what comes back."""

import json
import logging
import re
from datetime import date
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.core.errors import AIServiceError
from app.schemas.ai import ChatRequest, ChatResponse, LLMChat, LLMPlan, PlanRequest, PlanResponse
from app.services import ollama_service

logger = logging.getLogger("growmate.gardening")

PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "gardener.txt"

DEFAULT_LIMITATION = "Verify these suggestions against your local growing conditions."


@lru_cache(maxsize=1)
def system_prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8").strip()


# ---------- catalog ----------
@lru_cache(maxsize=4)
def _load_catalog(path: str) -> tuple[dict, ...]:
    try:
        return tuple(json.loads(Path(path).read_text(encoding="utf-8")))
    except (OSError, ValueError):
        logger.warning("Plant catalog not found or invalid at %s", path)
        return ()


def load_catalog() -> list[dict]:
    return list(_load_catalog(settings.catalog_path))


def candidate_plants(garden: dict, limit: int = 14) -> list[dict]:
    """Pick catalog plants that fit the garden, favouring the user's interests."""
    catalog = load_catalog()
    container_types = {"balcony", "indoor", "patio", "rooftop"}
    needs_container = garden["garden_type"] in container_types

    def fits(plant: dict) -> bool:
        if garden["sunlight"] not in plant.get("sunlight", []):
            return False
        if needs_container and not plant.get("container_friendly", True):
            return False
        return plant.get("min_space_sqm", 0) <= garden["space_sqm"]

    interests = set(garden.get("interests", []))

    def score(plant: dict) -> tuple[int, int]:
        interest_hit = 0 if plant.get("category") in interests else 1
        difficulty_gap = 0
        if garden["experience"] == "beginner" and plant.get("difficulty") != "beginner":
            difficulty_gap = 1
        return (interest_hit, difficulty_gap)

    matches = sorted((p for p in catalog if fits(p)), key=score)
    if len(matches) < 4:  # too few: relax to everything, still ranked
        matches = sorted(catalog, key=score)
    return matches[:limit]


def _catalog_match(name: str) -> dict | None:
    lowered = name.strip().lower()
    for plant in load_catalog():
        cat = plant["name"].lower()
        if lowered == cat or lowered in cat or cat in lowered:
            return plant
    return None


# ---------- JSON handling ----------
def extract_json(text: str) -> dict:
    """Parse a JSON object from model output, tolerating code fences or stray prose."""
    text = text.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1).strip()
    try:
        value = json.loads(text)
    except ValueError:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            raise ValueError("No JSON object found in model output") from None
        value = json.loads(text[start : end + 1])
    if not isinstance(value, dict):
        raise ValueError("Model output is not a JSON object")
    return value


async def _ask_json(messages: list[dict], model_cls: type[BaseModel], attempts: int = 2):
    """Ask for JSON and validate it. Retries a bounded number of times on bad output."""
    convo = list(messages)
    for attempt in range(1, attempts + 1):
        raw = await ollama_service.chat(convo, json_mode=True)
        try:
            return model_cls.model_validate(extract_json(raw))
        except (ValueError, ValidationError) as exc:
            logger.warning("Model output rejected (attempt %d/%d): %s", attempt, attempts, exc)
            convo = convo + [
                {"role": "assistant", "content": raw[:2000]},
                {
                    "role": "user",
                    "content": "That reply did not match the required JSON schema. "
                    "Reply again with ONLY the JSON object.",
                },
            ]
    raise AIServiceError(
        "ai_bad_response",
        "The model's answer could not be read. Try again in a moment.",
        502,
    )


# ---------- prompts ----------
def _garden_block(garden: dict) -> str:
    interests = ", ".join(garden.get("interests") or []) or "none given"
    return (
        "Garden context (user-supplied data):\n"
        f"- Location: {garden['location']}\n"
        f"- Garden type: {garden['garden_type']}\n"
        f"- Sunlight: {garden['sunlight']}\n"
        f"- Space: {garden['space_sqm']} square metres\n"
        f"- Experience: {garden['experience']}\n"
        f"- Interests: {interests}"
    )


def build_plan_prompt(
    garden: dict, req: PlanRequest, candidates: list[dict], weather_note: str | None
) -> str:
    lines = [_garden_block(garden), ""]
    lines.append(f"Today: {date.today():%d %B %Y}. Season requested: {req.season}.")
    if req.budget is not None:
        lines.append(
            f"Budget: {req.budget:g} in the local currency for seeds, pots and soil. "
            "Stay within it."
        )
    if weather_note:
        lines.append(f"Current weather: {weather_note}")
    lines.append("")
    if candidates:
        lines.append("Candidate plants from the GrowMate catalog (prefer these):")
        for p in candidates:
            lines.append(f"- {p['name']} ({p['category']}, {p['difficulty']}): {p['care_summary']}")
        lines.append("")
    lines.append(
        f"Recommend at most {req.max_plants} plants that suit this garden and the time of year. "
        "Explain why each fits. Give 1-3 concrete care tasks per plant."
    )
    lines.append(
        'Allowed task frequencies: "once", "daily", "every_2_days", "weekly", '
        '"biweekly", "monthly".'
    )
    lines.append("Reply with ONLY JSON in this shape:")
    lines.append(
        '{"recommendations": [{"plant": "name", "reason": "why it suits this garden", '
        '"care_summary": "short care guidance", '
        '"tasks": [{"title": "action the user can do", "frequency": "weekly"}]}], '
        '"limitations": ["what the user should verify"]}'
    )
    return "\n".join(lines)


def build_chat_prompt(garden: dict | None, plants: list[dict], tasks: list[dict], msg: str) -> str:
    parts = []
    if garden:
        parts.append(_garden_block(garden))
    if plants:
        parts.append("Plants in the garden: " + ", ".join(p["name"] for p in plants[:20]))
    if tasks:
        parts.append("Open tasks: " + "; ".join(t["title"] for t in tasks[:10]))
    context = "\n".join(parts) if parts else "Garden context: none provided."
    return (
        f"{context}\n\nQuestion from the user:\n{msg}\n\n"
        "Reply with ONLY JSON in this shape:\n"
        '{"answer": "short, practical answer", '
        '"possible_causes": ["only if diagnosing a problem, else empty"], '
        '"next_steps": ["small actions the user can do outdoors"], '
        '"requires_verification": true}'
    )


# ---------- public operations ----------
async def generate_plan(
    garden: dict, req: PlanRequest, weather_note: str | None = None
) -> PlanResponse:
    candidates = candidate_plants(garden)
    messages = [
        {"role": "system", "content": system_prompt()},
        {"role": "user", "content": build_plan_prompt(garden, req, candidates, weather_note)},
    ]
    plan: LLMPlan = await _ask_json(messages, LLMPlan)

    recommendations = []
    for rec in plan.recommendations[: req.max_plants]:
        rec.from_catalog = _catalog_match(rec.plant) is not None
        recommendations.append(rec)

    return PlanResponse(
        plan_id=f"plan_{uuid4().hex[:8]}",
        model=settings.ollama_model,
        recommendations=recommendations,
        limitations=plan.limitations[:5] or [DEFAULT_LIMITATION],
        weather_used=weather_note is not None,
    )


async def answer_question(
    req: ChatRequest, garden: dict | None, plants: list[dict], tasks: list[dict]
) -> ChatResponse:
    messages = [{"role": "system", "content": system_prompt()}]
    for turn in req.history[-6:]:
        messages.append({"role": turn.role, "content": turn.content})
    messages.append(
        {"role": "user", "content": build_chat_prompt(garden, plants, tasks, req.message)}
    )
    result: LLMChat = await _ask_json(messages, LLMChat)

    # An uncertain diagnosis is never presented as fact.
    verify = result.requires_verification or bool(result.possible_causes)
    return ChatResponse(
        answer=result.answer,
        possible_causes=result.possible_causes,
        next_steps=result.next_steps,
        requires_verification=verify,
        model=settings.ollama_model,
    )
