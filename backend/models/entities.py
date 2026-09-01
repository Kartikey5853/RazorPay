import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Numeric, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column
from database import Base

def uid(): return str(uuid.uuid4())
def now(): return datetime.utcnow()

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    business_name: Mapped[str] = mapped_column(String, default="")
    timezone: Mapped[str] = mapped_column(String, default="UTC")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)

class Person(Base):
    __tablename__ = "people"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    company: Mapped[str | None] = mapped_column(String, nullable=True)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)

class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text, default="")
    objective: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String, default="draft")
    deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    budget: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    requirements: Mapped[dict] = mapped_column(JSON, default=dict)
    constraints: Mapped[dict] = mapped_column(JSON, default=dict)
    ai_plan: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    current_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

class JobPerson(Base):
    __tablename__ = "job_people"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id"), index=True)
    person_id: Mapped[str] = mapped_column(ForeignKey("people.id"), index=True)
    role: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

class Action(Base):
    __tablename__ = "actions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid); user_id: Mapped[str] = mapped_column(ForeignKey("users.id")); job_id: Mapped[str | None] = mapped_column(ForeignKey("jobs.id"), nullable=True); person_id: Mapped[str | None] = mapped_column(ForeignKey("people.id"), nullable=True)
    type: Mapped[str] = mapped_column(String); status: Mapped[str] = mapped_column(String, default="pending"); title: Mapped[str] = mapped_column(String); description: Mapped[str | None] = mapped_column(Text, nullable=True); scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict); result: Mapped[dict | None] = mapped_column(JSON, nullable=True); error: Mapped[str | None] = mapped_column(Text, nullable=True); created_at: Mapped[datetime] = mapped_column(DateTime, default=now); started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True); completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

class Activity(Base):
    __tablename__ = "activities"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid); user_id: Mapped[str] = mapped_column(ForeignKey("users.id")); job_id: Mapped[str | None] = mapped_column(ForeignKey("jobs.id"), nullable=True); person_id: Mapped[str | None] = mapped_column(ForeignKey("people.id"), nullable=True); action_id: Mapped[str | None] = mapped_column(ForeignKey("actions.id"), nullable=True)
    type: Mapped[str] = mapped_column(String); title: Mapped[str] = mapped_column(String); description: Mapped[str | None] = mapped_column(Text, nullable=True); metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict); created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

class Conversation(Base):
    __tablename__ = "conversations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid); user_id: Mapped[str] = mapped_column(ForeignKey("users.id")); job_id: Mapped[str | None] = mapped_column(ForeignKey("jobs.id"), nullable=True); person_id: Mapped[str] = mapped_column(ForeignKey("people.id")); channel: Mapped[str] = mapped_column(String); status: Mapped[str] = mapped_column(String, default="open"); created_at: Mapped[datetime] = mapped_column(DateTime, default=now); updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)
class Message(Base):
    __tablename__ = "messages"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid); conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id")); sender_type: Mapped[str] = mapped_column(String); sender_id: Mapped[str | None] = mapped_column(String, nullable=True); content: Mapped[str] = mapped_column(Text); status: Mapped[str] = mapped_column(String, default="sent"); metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict); created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
class Call(Base):
    __tablename__ = "calls"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid); user_id: Mapped[str] = mapped_column(ForeignKey("users.id")); job_id: Mapped[str | None] = mapped_column(ForeignKey("jobs.id"), nullable=True); person_id: Mapped[str | None] = mapped_column(ForeignKey("people.id"), nullable=True); action_id: Mapped[str | None] = mapped_column(ForeignKey("actions.id"), nullable=True); conversation_id: Mapped[str | None] = mapped_column(ForeignKey("conversations.id"), nullable=True); provider: Mapped[str] = mapped_column(String, default="manual"); provider_call_id: Mapped[str | None] = mapped_column(String, nullable=True); status: Mapped[str] = mapped_column(String, default="scheduled"); started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True); ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True); duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True); transcript: Mapped[str | None] = mapped_column(Text, nullable=True); summary: Mapped[str | None] = mapped_column(Text, nullable=True); extracted_data: Mapped[dict | None] = mapped_column(JSON, nullable=True); created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
class Payment(Base):
    __tablename__ = "payments"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid); user_id: Mapped[str] = mapped_column(ForeignKey("users.id")); job_id: Mapped[str | None] = mapped_column(ForeignKey("jobs.id"), nullable=True); person_id: Mapped[str | None] = mapped_column(ForeignKey("people.id"), nullable=True); action_id: Mapped[str | None] = mapped_column(ForeignKey("actions.id"), nullable=True); amount: Mapped[float] = mapped_column(Numeric); currency: Mapped[str] = mapped_column(String, default="INR"); status: Mapped[str] = mapped_column(String, default="pending"); provider: Mapped[str] = mapped_column(String, default="manual"); provider_payment_id: Mapped[str | None] = mapped_column(String, nullable=True); provider_link_id: Mapped[str | None] = mapped_column(String, nullable=True); description: Mapped[str | None] = mapped_column(Text, nullable=True); due_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True); paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True); metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict); created_at: Mapped[datetime] = mapped_column(DateTime, default=now); updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)
class Integration(Base):
    __tablename__ = "integrations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid); user_id: Mapped[str] = mapped_column(ForeignKey("users.id")); provider: Mapped[str] = mapped_column(String); type: Mapped[str] = mapped_column(String); status: Mapped[str] = mapped_column(String, default="disconnected"); credentials: Mapped[dict] = mapped_column(JSON, default=dict); metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict); created_at: Mapped[datetime] = mapped_column(DateTime, default=now); updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)
class File(Base):
    __tablename__ = "files"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid); user_id: Mapped[str] = mapped_column(ForeignKey("users.id")); person_id: Mapped[str | None] = mapped_column(ForeignKey("people.id"), nullable=True); job_id: Mapped[str | None] = mapped_column(ForeignKey("jobs.id"), nullable=True); name: Mapped[str] = mapped_column(String); url: Mapped[str] = mapped_column(String); mime_type: Mapped[str] = mapped_column(String); size: Mapped[int | None] = mapped_column(Integer, nullable=True); metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict); created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
