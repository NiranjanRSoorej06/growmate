from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.task import Frequency

_FREQ_ALIASES = {
    "every day": "daily",
    "everyday": "daily",
    "each day": "daily",
    "every 2 days": "every_2_days",
    "every two days": "every_2_days",
    "every other day": "every_2_days",
    "every week": "weekly",
    "once a week": "weekly",
    "every 2 weeks": "biweekly",
    "every two weeks": "biweekly",
    "fortnightly": "biweekly",
    "every month": "monthly",
    "once a month": "monthly",
    "one-time": "once",
    "one time": "once",
}
_VALID_FREQ = {"once", "daily", "every_2_days", "weekly", "biweekly", "monthly"}


def normalise_frequency(value: object) -> str:
    text = str(value or "").strip().lower().replace("-", " ").strip()
    text = _FREQ_ALIASES.get(text, text.replace(" ", "_"))
    return text if text in _VALID_FREQ else "weekly"


def _text_list(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        raise ValueError("Expected a list of strings")
    return [str(v).strip() for v in value if str(v).strip()]


# ---------- planting plan ----------
class PlanRequest(BaseModel):
    garden_id: str = Field(min_length=1, max_length=64)
    season: str = Field(default="current", max_length=40)
    budget: float | None = Field(default=None, ge=0, le=10_000_000)
    max_plants: int = Field(default=5, ge=1, le=10)
    use_weather: bool = False


class TaskSuggestion(BaseModel):
    title: str = Field(min_length=1)
    frequency: Frequency = "weekly"

    @field_validator("title", mode="before")
    @classmethod
    def _title(cls, v: object) -> str:
        return str(v or "").strip()[:120]

    @field_validator("frequency", mode="before")
    @classmethod
    def _freq(cls, v: object) -> str:
        return normalise_frequency(v)


class Recommendation(BaseModel):
    plant: str = Field(min_length=1)
    reason: str = Field(min_length=1)
    care_summary: str = Field(min_length=1)
    tasks: list[TaskSuggestion] = Field(default_factory=list)
    from_catalog: bool = False

    @field_validator("plant", mode="before")
    @classmethod
    def _plant(cls, v: object) -> str:
        return str(v or "").strip()[:80]

    @field_validator("reason", "care_summary", mode="before")
    @classmethod
    def _long_text(cls, v: object) -> str:
        return str(v or "").strip()[:600]

    @field_validator("tasks", mode="before")
    @classmethod
    def _tasks(cls, v: object) -> list:
        if v is None:
            return []
        if not isinstance(v, list):
            raise ValueError("tasks must be a list")
        return v[:4]


class LLMPlan(BaseModel):
    """What we require from the model, before we add ids and metadata."""

    recommendations: list[Recommendation] = Field(min_length=1)
    limitations: list[str] = Field(default_factory=list)

    @field_validator("limitations", mode="before")
    @classmethod
    def _limitations(cls, v: object) -> list[str]:
        return _text_list(v)


class PlanResponse(BaseModel):
    plan_id: str
    model: str
    recommendations: list[Recommendation]
    limitations: list[str]
    weather_used: bool = False


# ---------- chat ----------
class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    garden_id: str | None = Field(default=None, max_length=64)
    message: str = Field(min_length=1, max_length=1000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=10)

    @field_validator("message")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        return v


class LLMChat(BaseModel):
    answer: str = Field(min_length=1)
    possible_causes: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    requires_verification: bool = True

    @field_validator("answer", mode="before")
    @classmethod
    def _answer(cls, v: object) -> str:
        return str(v or "").strip()

    @field_validator("possible_causes", "next_steps", mode="before")
    @classmethod
    def _lists(cls, v: object) -> list[str]:
        return _text_list(v)[:8]


class ChatResponse(LLMChat):
    model: str


# ---------- research ----------
class ResearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=200)

    @field_validator("query")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Query must be at least 3 characters")
        return v


class ResearchResult(BaseModel):
    title: str
    link: str
    snippet: str = ""
    date: str | None = None


class ResearchResponse(BaseModel):
    query: str
    results: list[ResearchResult]
    note: str = "Web results are not verified by GrowMate. Check the source before acting."
