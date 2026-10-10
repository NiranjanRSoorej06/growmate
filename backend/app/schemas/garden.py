from typing import Literal

from pydantic import BaseModel, Field, field_validator

GardenType = Literal["balcony", "backyard", "rooftop", "indoor", "patio", "community"]
Sunlight = Literal["full", "partial", "shade"]
Experience = Literal["beginner", "intermediate", "advanced"]


class GardenIn(BaseModel):
    location: str = Field(min_length=2, max_length=120)
    garden_type: GardenType
    sunlight: Sunlight
    space_sqm: float = Field(gt=0, le=10000)
    experience: Experience
    interests: list[str] = Field(default_factory=list, max_length=8)

    @field_validator("location")
    @classmethod
    def _strip_location(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Location must be at least 2 characters")
        return v

    @field_validator("interests")
    @classmethod
    def _clean_interests(cls, values: list[str]) -> list[str]:
        cleaned: list[str] = []
        for v in values:
            v = v.strip().lower()
            if not v:
                continue
            if len(v) > 30:
                raise ValueError("Each interest must be 30 characters or fewer")
            if v not in cleaned:
                cleaned.append(v)
        return cleaned


class GardenOut(GardenIn):
    id: str
    updated_at: str


class GardenSaved(BaseModel):
    id: str
    status: Literal["saved"] = "saved"
    recommended_next_step: str = "generate_planting_plan"
