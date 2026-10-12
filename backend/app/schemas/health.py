from pydantic import BaseModel


class AIStatus(BaseModel):
    available: bool
    model: str
    model_installed: bool
    detail: str


class HealthOut(BaseModel):
    status: str
    ai: AIStatus
    sentry_enabled: bool
