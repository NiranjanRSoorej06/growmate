from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class PlantIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    category: str | None = Field(default=None, max_length=40)
    notes: str | None = Field(default=None, max_length=500)
    care_summary: str | None = Field(default=None, max_length=600)
    source: Literal["manual", "catalog", "ai"] = "manual"
    planted_on: date | None = None

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Plant name cannot be empty")
        return v


class PlantOut(BaseModel):
    id: int
    name: str
    category: str | None = None
    notes: str | None = None
    care_summary: str | None = None
    source: str
    planted_on: str | None = None
    created_at: str
