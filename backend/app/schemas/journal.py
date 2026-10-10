from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Health = Literal["thriving", "okay", "struggling"]


class JournalIn(BaseModel):
    plant_id: int
    note: str = Field(min_length=1, max_length=1000)
    height_cm: float | None = Field(default=None, ge=0, le=3000)
    health: Health = "okay"
    observed_on: date | None = None

    @field_validator("note")
    @classmethod
    def _strip_note(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Observation cannot be empty")
        return v


class JournalOut(BaseModel):
    id: int
    plant_id: int
    plant_name: str
    note: str
    height_cm: float | None = None
    health: str
    observed_on: str
    created_at: str
