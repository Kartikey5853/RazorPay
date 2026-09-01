from datetime import datetime
from pydantic import BaseModel, Field
class JobCreate(BaseModel): title: str; description: str = ""; objective: str = ""; status: str = "draft"; deadline: datetime | None = None; budget: float | None = None; requirements: dict = Field(default_factory=dict); constraints: dict = Field(default_factory=dict); person_ids: list[str] = Field(default_factory=list)
class JobUpdate(BaseModel): title: str | None = None; description: str | None = None; objective: str | None = None; status: str | None = None; deadline: datetime | None = None; budget: float | None = None; requirements: dict | None = None; constraints: dict | None = None; current_action: str | None = None
class JobPersonCreate(BaseModel): person_id: str; role: str | None = None; status: str | None = None
