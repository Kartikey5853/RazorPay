from datetime import datetime
from pydantic import BaseModel, Field, field_validator

class JobCreate(BaseModel): title: str; description: str = ""; objective: str = ""; status: str = "draft"; deadline: datetime | None = None; budget: float | None = None; requirements: dict = Field(default_factory=dict); constraints: dict = Field(default_factory=dict); person_ids: list[str] = Field(default_factory=list)
class JobUpdate(BaseModel): title: str | None = None; description: str | None = None; objective: str | None = None; status: str | None = None; deadline: datetime | None = None; budget: float | None = None; requirements: dict | None = None; constraints: dict | None = None; current_action: str | None = None
class JobPersonCreate(BaseModel): person_id: str; role: str | None = None; status: str | None = None

def _normalize_status(val: str | None) -> str | None:
    if not val:
        return val
    s = val.strip().lower().replace("_", " ")
    if s in ("done", "completed", "complete"):
        return "Done"
    if s in ("in progress", "in_progress"):
        return "In Progress"
    if s in ("to do", "todo"):
        return "To Do"
    return val

class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    status: str = "To Do"
    priority: str | None = None
    sprint: str | None = None
    due_date: datetime | None = None
    parent_task_id: str | None = None
    person_ids: list[str] = Field(default_factory=list)
    subtasks: list[str] = Field(default_factory=list)

    @field_validator("due_date", mode="before")
    @classmethod
    def parse_due_date(cls, v):
        if v == "" or v is None:
            return None
        return v

    @field_validator("status", mode="before")
    @classmethod
    def parse_status(cls, v):
        return _normalize_status(v) or "To Do"

class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    sprint: str | None = None
    due_date: datetime | None = None
    parent_task_id: str | None = None
    job_id: str | None = None
    person_ids: list[str] | None = None

    @field_validator("due_date", mode="before")
    @classmethod
    def parse_due_date(cls, v):
        if v == "" or v is None:
            return None
        return v

    @field_validator("status", mode="before")
    @classmethod
    def parse_status(cls, v):
        return _normalize_status(v)

class TaskPersonCreate(BaseModel): person_id: str
class MilestoneCreate(BaseModel): title: str; date: datetime
class MilestoneUpdate(BaseModel): title: str | None = None; date: datetime | None = None

