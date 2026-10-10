from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Frequency = Literal["once", "daily", "every_2_days", "weekly", "biweekly", "monthly"]

FREQUENCY_DAYS: dict[str, int] = {
    "daily": 1,
    "every_2_days": 2,
    "weekly": 7,
    "biweekly": 14,
    "monthly": 30,
}


class TaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    frequency: Frequency = "once"
    plant_id: int | None = None
    due_date: date | None = None

    @field_validator("title")
    @classmethod
    def _strip_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Task title cannot be empty")
        return v


class TaskPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    completed: bool | None = None
    due_date: date | None = None


class TaskOut(BaseModel):
    id: int
    title: str
    frequency: str
    plant_id: int | None = None
    plant_name: str | None = None
    due_date: str | None = None
    completed: bool
    completed_at: str | None = None
    created_at: str
