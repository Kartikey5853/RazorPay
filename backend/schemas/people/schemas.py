from pydantic import BaseModel, Field
class PersonCreate(BaseModel): name: str; type: str; email: str | None = None; phone: str | None = None; company: str | None = None; location: str | None = None; tags: list[str] = Field(default_factory=list); notes: str | None = None
class PersonUpdate(BaseModel): name: str | None = None; type: str | None = None; email: str | None = None; phone: str | None = None; company: str | None = None; location: str | None = None; tags: list[str] | None = None; notes: str | None = None
