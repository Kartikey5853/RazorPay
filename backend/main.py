import os
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import (
    User,
    Person,
    Job,
    JobPerson,
    Action,
    Activity,
    Conversation,
    Message,
    Call,
    Payment,
    Task,
    TaskPerson,
    Milestone,
    CalendarEvent,
)
from schemas import (
    PersonCreate,
    PersonUpdate,
    JobCreate,
    JobUpdate,
    JobPersonCreate,
    ActionCreate,
    CallCreate,
    MessageCreate,
    PaymentCreate,
    PaymentUpdate,
    ProcessRequest,
    PaymentVerifyRequest,
    TaskCreate,
    TaskUpdate,
    TaskPersonCreate,
    MilestoneCreate,
    MilestoneUpdate,
    CalendarEventCreate,
    CalendarEventUpdate,
    EmailCreate,
)

from utils import serialize, activity, owned
from routers.auth import router as auth_router, current_user
from routers.call_assistant import router as call_assistant_router
from routers.live_call import router as live_call_router
from routers.marcus import router as marcus_router
from services import razorpay_service
from models.entities import uid


# ============================================================
# DATABASE
# ============================================================

Base.metadata.create_all(bind=engine)


# ============================================================
# APP CONFIGURATION
# ============================================================

app = FastAPI(
    title="Ergon API",
    version="1.0.0",
)
app.include_router(call_assistant_router)
app.include_router(live_call_router)
app.include_router(marcus_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


# Helper functions moved to utils.py and routers.auth


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "ok"
    }


# Auth endpoints moved to routers/auth.py


# ============================================================
# DASHBOARD
# ============================================================

@app.get("/dashboard/summary")
def dashboard(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    active_jobs = (
        db.scalar(
            select(func.count())
            .select_from(Job)
            .where(
                Job.user_id == user.id,
                Job.status == "active",
            )
        )
        or 0
    )

    people_count = (
        db.scalar(
            select(func.count())
            .select_from(Person)
            .where(Person.user_id == user.id)
        )
        or 0
    )

    pending_actions = (
        db.scalar(
            select(func.count())
            .select_from(Action)
            .where(
                Action.user_id == user.id,
                Action.status.in_(["pending", "scheduled"]),
            )
        )
        or 0
    )

    activities = db.scalars(
        select(Activity)
        .where(Activity.user_id == user.id)
        .order_by(Activity.created_at.desc())
        .limit(10)
    ).all()

    return {
        "active_jobs": active_jobs,
        "people": people_count,
        "pending_actions": pending_actions,
        "activities": [
            serialize(item)
            for item in activities
        ],
    }


# ============================================================
# PEOPLE
# ============================================================

@app.get("/people")
def list_people(
    search: str | None = None,
    type: str | None = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    query = select(Person).where(
        Person.user_id == user.id
    )

    if type:
        query = query.where(
            Person.type == type.lower()
        )

    if search:
        term = f"%{search}%"

        query = query.where(
            or_(
                Person.name.ilike(term),
                Person.email.ilike(term),
                Person.company.ilike(term),
                Person.phone.ilike(term),
            )
        )

    people = db.scalars(
        query.order_by(Person.created_at.desc())
    ).all()

    return [
        serialize(person)
        for person in people
    ]


@app.post("/people", status_code=201)
def create_person(
    data: PersonCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    item = Person(
        user_id=user.id,
        **data.model_dump(),
    )

    db.add(item)

    activity(
        db,
        user.id,
        "PERSON_ADDED",
        f"Person added — {item.name}",
        person_id=item.id,
    )

    db.commit()
    db.refresh(item)

    return serialize(item)


@app.get("/people/{person_id}")
def get_person(
    person_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    item = owned(db, Person, person_id, user.id)
    result = serialize(item)

    # Jobs
    job_links = db.scalars(select(JobPerson).where(JobPerson.person_id == person_id)).all()
    job_ids = [link.job_id for link in job_links]
    jobs = db.scalars(select(Job).where(Job.id.in_(job_ids))).all()
    result["jobs"] = [serialize(job) for job in jobs]

    # Tasks
    task_links = db.scalars(select(TaskPerson).where(TaskPerson.person_id == person_id)).all()
    task_ids = [link.task_id for link in task_links]
    tasks = db.scalars(select(Task).where(Task.id.in_(task_ids))).all()
    
    tasks_data = []
    for t in tasks:
        td = serialize(t)
        job = db.get(Job, t.job_id)
        if job:
            td["job_title"] = job.title
        tasks_data.append(td)
    result["tasks"] = tasks_data

    # Calls
    calls = db.scalars(select(Call).where(Call.person_id == person_id).order_by(Call.created_at.desc())).all()
    result["calls"] = [serialize(c) for c in calls]

    # Messages/Conversations
    # Get all conversations for this person, then their messages
    convs = db.scalars(select(Conversation).where(Conversation.person_id == person_id)).all()
    messages = []
    for conv in convs:
        msgs = db.scalars(select(Message).where(Message.conversation_id == conv.id)).all()
        messages.extend([serialize(m) for m in msgs])
    
    # Sort messages chronologically
    messages.sort(key=lambda x: x["created_at"], reverse=True)
    result["messages"] = messages

    # Payments
    payments = db.scalars(select(Payment).where(Payment.person_id == person_id).order_by(Payment.created_at.desc())).all()
    result["payments"] = [serialize(p) for p in payments]

    # Calendar Events
    calendar_events = db.scalars(select(CalendarEvent).where(CalendarEvent.person_id == person_id).order_by(CalendarEvent.start_at.asc())).all()
    result["calendar_events"] = [serialize(ce) for ce in calendar_events]

    return result


@app.patch("/people/{person_id}")
def update_person(
    person_id: str,
    data: PersonUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    item = owned(
        db,
        Person,
        person_id,
        user.id,
    )

    for key, value in data.model_dump(
        exclude_unset=True
    ).items():
        setattr(item, key, value)

    activity(
        db,
        user.id,
        "PERSON_UPDATED",
        f"Person updated — {item.name}",
        person_id=item.id,
    )

    db.commit()
    db.refresh(item)

    return serialize(item)


@app.delete("/people/{person_id}", status_code=204)
def delete_person(
    person_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    item = owned(
        db,
        Person,
        person_id,
        user.id,
    )
    db.delete(item)
    db.commit()

from pydantic import BaseModel
class CallSave(BaseModel):
    person_id: str | None = None
    job_id: str | None = None
    duration_seconds: int | None = None
    transcript: str | None = None
    summary: str | None = None
    extracted_data: dict | None = None

@app.post("/calls")
def save_call(
    data: CallSave,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    call = Call(
        user_id=user.id,
        person_id=data.person_id,
        job_id=data.job_id,
        status="completed",
        duration_seconds=data.duration_seconds,
        transcript=data.transcript,
        summary=data.summary,
        extracted_data=data.extracted_data,
        ended_at=datetime.utcnow()
    )
    db.add(call)
    db.commit()
    db.refresh(call)
    
    if data.person_id:
        person = db.get(Person, data.person_id)
        if person:
            activity(db, user.id, "AI_CALL_COMPLETED", f"AI Call Completed — {person.name} ({data.duration_seconds}s)", person_id=person.id, job_id=data.job_id)

    # Automatically create pending actions if actions were extracted
    if data.extracted_data and isinstance(data.extracted_data, dict):
        raw_actions = data.extracted_data.get("actions", [])
        if raw_actions:
            from services.action_service import create_pending_actions_from_call
            create_pending_actions_from_call(db, user, call, raw_actions)

    return serialize(call)

@app.get("/people/{person_id}/activities")
def person_activities(
    person_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned(
        db,
        Person,
        person_id,
        user.id,
    )

    activities = db.scalars(
        select(Activity)
        .where(
            Activity.person_id == person_id,
            Activity.user_id == user.id,
        )
        .order_by(Activity.created_at.desc())
    ).all()

    return [
        serialize(item)
        for item in activities
    ]


# ============================================================
# JOBS
# ============================================================

@app.get("/jobs")
def list_jobs(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    jobs = db.scalars(
        select(Job)
        .where(Job.user_id == user.id)
        .order_by(Job.created_at.desc())
    ).all()

    return [
        serialize(job)
        for job in jobs
    ]


@app.post("/jobs", status_code=201)
def create_job(
    data: JobCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    payload = data.model_dump()

    person_ids = payload.pop(
        "person_ids"
    )

    item = Job(
        user_id=user.id,
        **payload,
    )

    db.add(item)
    db.flush()

    for person_id in person_ids:
        owned(
            db,
            Person,
            person_id,
            user.id,
        )

        db.add(
            JobPerson(
                job_id=item.id,
                person_id=person_id,
            )
        )

    activity(
        db,
        user.id,
        "JOB_CREATED",
        f"Job created — {item.title}",
        job_id=item.id,
    )

    db.commit()
    db.refresh(item)

    return serialize(item)


@app.get("/jobs/{job_id}")
def get_job(
    job_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    item = owned(
        db,
        Job,
        job_id,
        user.id,
    )

    result = serialize(item)

    links = db.scalars(
        select(JobPerson)
        .where(JobPerson.job_id == job_id)
    ).all()

    result["people"] = [
        serialize(
            owned(
                db,
                Person,
                link.person_id,
                user.id,
            )
        )
        | {
            "role": link.role,
            "job_person_status": link.status,
        }
        for link in links
    ]
    
    tasks = db.scalars(select(Task).where(Task.job_id == job_id).order_by(Task.created_at.desc())).all()
    result["tasks"] = []
    for task in tasks:
        task_data = serialize(task)
        task_links = db.scalars(select(TaskPerson).where(TaskPerson.task_id == task.id)).all()
        task_people = []
        for tl in task_links:
            try:
                task_people.append(serialize(owned(db, Person, tl.person_id, user.id)))
            except:
                pass
        task_data["people"] = task_people
        result["tasks"].append(task_data)

    milestones = db.scalars(select(Milestone).where(Milestone.job_id == job_id).order_by(Milestone.date.asc())).all()
    result["milestones"] = [serialize(m) for m in milestones]
    
    payments = db.scalars(select(Payment).where(Payment.job_id == job_id).order_by(Payment.created_at.desc())).all()
    result["payments"] = [serialize(p) for p in payments]

    calls = db.scalars(select(Call).where(Call.job_id == job_id).order_by(Call.created_at.desc())).all()
    result["calls"] = [serialize(c) for c in calls]
    
    calendar_events = db.scalars(select(CalendarEvent).where(CalendarEvent.job_id == job_id).order_by(CalendarEvent.start_at.asc())).all()
    result["calendar_events"] = [serialize(ce) for ce in calendar_events]

    return result


@app.patch("/jobs/{job_id}")
def update_job(
    job_id: str,
    data: JobUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    item = owned(
        db,
        Job,
        job_id,
        user.id,
    )

    for key, value in data.model_dump(
        exclude_unset=True
    ).items():
        setattr(item, key, value)

    if (
        item.status == "completed"
        and not item.completed_at
    ):
        item.completed_at = datetime.utcnow()

    activity(
        db,
        user.id,
        "JOB_UPDATED",
        f"Job updated — {item.title}",
        job_id=item.id,
    )

    db.commit()
    db.refresh(item)

    return serialize(item)


@app.post("/jobs/{job_id}/people", status_code=201)
def add_job_person(
    job_id: str,
    data: JobPersonCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned(
        db,
        Job,
        job_id,
        user.id,
    )

    owned(
        db,
        Person,
        data.person_id,
        user.id,
    )

    link = JobPerson(
        job_id=job_id,
        **data.model_dump(),
    )

    db.add(link)
    db.commit()

    return serialize(link)


@app.delete(
    "/jobs/{job_id}/people/{person_id}",
    status_code=204,
)
def remove_job_person(
    job_id: str,
    person_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned(
        db,
        Job,
        job_id,
        user.id,
    )

    link = db.scalar(
        select(JobPerson).where(
            JobPerson.job_id == job_id,
            JobPerson.person_id == person_id,
        )
    )

    if not link:
        raise HTTPException(
            status_code=404,
            detail="Association not found",
        )

    db.delete(link)
    db.commit()

# ============================================================
# TASKS & MILESTONES
# ============================================================

@app.get("/jobs/{job_id}/tasks")
def get_tasks(
    job_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned(db, Job, job_id, user.id)
    tasks = db.scalars(select(Task).where(Task.job_id == job_id).order_by(Task.created_at.asc())).all()
    results = []
    for t in tasks:
        td = serialize(t)
        task_links = db.scalars(select(TaskPerson).where(TaskPerson.task_id == t.id)).all()
        td["people"] = []
        for tl in task_links:
            try:
                td["people"].append(serialize(owned(db, Person, tl.person_id, user.id)))
            except Exception:
                pass
        results.append(td)
    return results

@app.post("/jobs/{job_id}/tasks", status_code=201)
def create_task(
    job_id: str,
    data: TaskCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned(db, Job, job_id, user.id)
    payload = data.model_dump()
    person_ids = payload.pop("person_ids", [])
    subtasks = payload.pop("subtasks", [])
    task = Task(job_id=job_id, **payload)
    db.add(task)
    db.flush()
    for pid in person_ids:
        if pid:
            db.add(TaskPerson(task_id=task.id, person_id=pid))
    for st_title in subtasks:
        if isinstance(st_title, str) and st_title.strip():
            db.add(Task(job_id=job_id, title=st_title.strip(), status="To Do", parent_task_id=task.id))
    
    activity(db, user.id, "TASK_CREATED", f"Task created - {task.title}", job_id=job_id)
    db.commit()
    db.refresh(task)
    td = serialize(task)
    task_links = db.scalars(select(TaskPerson).where(TaskPerson.task_id == task.id)).all()
    td["people"] = []
    for tl in task_links:
        try:
            td["people"].append(serialize(owned(db, Person, tl.person_id, user.id)))
        except Exception:
            pass
    return td

@app.patch("/tasks/{task_id}")
def update_task(
    task_id: str,
    data: TaskUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    owned(db, Job, task.job_id, user.id)
    
    payload = data.model_dump(exclude_unset=True)
    person_ids = payload.pop("person_ids", None)
    new_job_id = payload.pop("job_id", None)
    if new_job_id is not None and new_job_id != task.job_id:
        owned(db, Job, new_job_id, user.id)
        task.job_id = new_job_id
        subtasks = db.scalars(select(Task).where(Task.parent_task_id == task.id)).all()
        for st in subtasks:
            st.job_id = new_job_id

    for key, value in payload.items():
        setattr(task, key, value)
        
    if person_ids is not None:
        db.query(TaskPerson).filter(TaskPerson.task_id == task_id).delete()
        for pid in person_ids:
            if pid:
                db.add(TaskPerson(task_id=task.id, person_id=pid))
    
    activity(db, user.id, "TASK_UPDATED", f"Task updated - {task.title}", job_id=task.job_id)
    db.commit()
    db.refresh(task)
    td = serialize(task)
    task_links = db.scalars(select(TaskPerson).where(TaskPerson.task_id == task.id)).all()
    td["people"] = []
    for tl in task_links:
        try:
            td["people"].append(serialize(owned(db, Person, tl.person_id, user.id)))
        except Exception:
            pass
    return td

@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(
    task_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    owned(db, Job, task.job_id, user.id)
    
    # Delete child subtasks first to satisfy foreign key constraints
    subtasks = db.scalars(select(Task).where(Task.parent_task_id == task_id)).all()
    for st in subtasks:
        db.query(TaskPerson).filter(TaskPerson.task_id == st.id).delete()
        db.delete(st)

    # delete task_people as well (cascade or manual)
    db.query(TaskPerson).filter(TaskPerson.task_id == task_id).delete()
    db.delete(task)
    db.commit()

@app.post("/jobs/{job_id}/milestones", status_code=201)
def create_milestone(
    job_id: str,
    data: MilestoneCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned(db, Job, job_id, user.id)
    milestone = Milestone(job_id=job_id, **data.model_dump())
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return serialize(milestone)

@app.patch("/milestones/{milestone_id}")
def update_milestone(
    milestone_id: str,
    data: MilestoneUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    milestone = db.get(Milestone, milestone_id)
    if not milestone:
        raise HTTPException(status_code=404)
    owned(db, Job, milestone.job_id, user.id)
    
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(milestone, key, value)
    
    db.commit()
    db.refresh(milestone)
    return serialize(milestone)

@app.delete("/milestones/{milestone_id}", status_code=204)
def delete_milestone(
    milestone_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    milestone = db.get(Milestone, milestone_id)
    if not milestone:
        raise HTTPException(status_code=404)
    owned(db, Job, milestone.job_id, user.id)
    db.delete(milestone)
    db.commit()

@app.post("/emails/send")
def send_email(
    data: EmailCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if data.person_id:
        owned(db, Person, data.person_id, user.id)
    if data.job_id:
        owned(db, Job, data.job_id, user.id)

    # Send email via SMTP
    from services.email_service import send_smtp_email
    try:
        send_smtp_email(to_email=data.email, subject=data.subject, body=data.body, from_email=user.email)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to send email via SMTP: {str(e)}")
    
    activity(
        db, 
        user.id, 
        "EMAIL_SENT", 
        f"Email sent to {data.email}: {data.subject}",
        description=data.body,
        person_id=data.person_id,
        job_id=data.job_id
    )
    
    db.commit()
    return {"status": "success", "message": "Email sent."}


# ============================================================
# MARCUS ACTION CENTER / PENDING ACTIONS
# ============================================================

class ActionUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    payload: dict | None = None

class ActionConfirmRequest(BaseModel):
    overrides: dict | None = None

class ExtractActionsRequest(BaseModel):
    transcript: str
    call_id: str | None = None
    person_id: str | None = None
    job_id: str | None = None

@app.get("/actions/pending")
def get_pending_actions(
    type: str | None = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    query = select(Action).where(
        Action.user_id == user.id,
        Action.status == "pending"
    ).order_by(Action.created_at.desc())

    if type:
        query = query.where(Action.type == type)

    actions = db.scalars(query).all()
    results = []
    for act in actions:
        d = serialize(act)
        d["action_type"] = act.type
        if act.person_id:
            p = db.get(Person, act.person_id)
            if p:
                d["person_name"] = p.name
                if not d.get("payload", {}).get("email") and p.email:
                    if "payload" not in d or not isinstance(d["payload"], dict):
                        d["payload"] = {}
                    d["payload"]["email"] = p.email
        if act.job_id:
            j = db.get(Job, act.job_id)
            if j:
                d["job_title"] = j.title
        results.append(d)
    return results

@app.get("/actions/summary")
def get_actions_summary(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    all_pending = db.scalars(
        select(Action).where(
            Action.user_id == user.id,
            Action.status == "pending"
        )
    ).all()

    emails_count = sum(1 for a in all_pending if a.type == "email")
    reminders_count = sum(1 for a in all_pending if a.type in ("reminder", "payment_reminder"))
    tasks_count = sum(1 for a in all_pending if a.type == "task")
    followups_count = sum(1 for a in all_pending if a.type == "follow_up")

    return {
        "total_pending": len(all_pending),
        "emails_count": emails_count,
        "reminders_count": reminders_count,
        "tasks_count": tasks_count,
        "followups_count": followups_count,
    }

@app.patch("/actions/{action_id}")
def update_action(
    action_id: str,
    data: ActionUpdateRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    action = db.get(Action, action_id)
    if not action or action.user_id != user.id:
        raise HTTPException(status_code=404, detail="Action not found")
    
    if data.title is not None:
        action.title = data.title
    if data.description is not None:
        action.description = data.description
    if data.payload is not None:
        merged = dict(action.payload or {})
        merged.update(data.payload)
        action.payload = merged
    
    db.commit()
    db.refresh(action)
    d = serialize(action)
    d["action_type"] = action.type
    return d

@app.post("/actions/{action_id}/confirm")
def confirm_action_endpoint(
    action_id: str,
    data: ActionConfirmRequest | None = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    from services.action_service import confirm_action
    try:
        overrides = data.overrides if data else None
        res = confirm_action(db, user, action_id, overrides=overrides)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to execute action: {str(e)}")

@app.post("/actions/{action_id}/dismiss")
def dismiss_action_endpoint(
    action_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    from services.action_service import dismiss_action
    try:
        res = dismiss_action(db, user, action_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/actions/extract-from-transcript")
def extract_actions_from_transcript(
    data: ExtractActionsRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    from google import genai
    from routers.live_call import SUMMARY_MODEL, CallSummary
    from services.action_service import create_pending_actions_from_call

    prompt = f"""Analyze this completed business call and extract all concrete post-call action items:
1. reminder: Meeting or time-based reminder (title, date, time, reason)
2. email: Commitments to send proposal, quotation, documents, portfolio, or follow-up email (title, person, subject, body)
3. task: Actionable work to be completed (title, job, due_date)
4. payment_reminder: Promised payments or payment dates (title, amount, due_date, reason)
5. follow_up: General follow-ups (title, date, reason)

Do not execute these actions; extract them accurately into `actions`.

TRANSCRIPT:
{data.transcript}"""

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    response = client.models.generate_content(model=SUMMARY_MODEL, contents=prompt, config={"response_mime_type": "application/json", "response_schema": CallSummary})
    if response.parsed is None:
        raise HTTPException(status_code=502, detail="Gemini could not analyze transcript")
    
    class MockCall:
        id = data.call_id
        person_id = data.person_id
        job_id = data.job_id
        extracted_data = {}

    created = create_pending_actions_from_call(db, user, MockCall, [a.model_dump() for a in response.parsed.actions])
    return {
        "summary": response.parsed.summary,
        "actions": [serialize(a) for a in created]
    }


# ============================================================
# JOB ACTIONS
# ============================================================

@app.post("/jobs/{job_id}/actions", status_code=201)
def job_action(
    job_id: str,
    data: ActionCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned(
        db,
        Job,
        job_id,
        user.id,
    )

    item = Action(
        user_id=user.id,
        job_id=job_id,
        **data.model_dump(),
    )

    db.add(item)

    activity_type = (
        "ACTION_COMPLETED"
        if item.status == "completed"
        else "ACTION_CREATED"
    )

    activity(
        db,
        user.id,
        activity_type,
        item.title,
        job_id=job_id,
        person_id=item.person_id,
        action_id=item.id,
    )

    db.commit()
    db.refresh(item)

    return serialize(item)


@app.get("/jobs/{job_id}/actions")
def job_actions(
    job_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned(
        db,
        Job,
        job_id,
        user.id,
    )

    actions = db.scalars(
        select(Action)
        .where(Action.job_id == job_id)
    ).all()

    return [
        serialize(item)
        for item in actions
    ]


@app.get("/jobs/{job_id}/activities")
def job_activities(
    job_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned(
        db,
        Job,
        job_id,
        user.id,
    )

    activities = db.scalars(
        select(Activity)
        .where(Activity.job_id == job_id)
        .order_by(Activity.created_at.desc())
    ).all()

    return [
        serialize(item)
        for item in activities
    ]


# ============================================================
# AI / JOB PLANNING
# ============================================================

@app.post("/jobs/{job_id}/ai/plan")
def ai_plan(
    job_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    item = owned(
        db,
        Job,
        job_id,
        user.id,
    )

    item.ai_plan = {
        "steps": [
            {
                "title": "Review requirements",
                "status": "pending",
            },
            {
                "title": "Contact associated people",
                "status": "pending",
            },
            {
                "title": "Follow up on responses",
                "status": "pending",
            },
        ]
    }

    item.current_action = "Review requirements"

    activity(
        db,
        user.id,
        "AI_PLAN_CREATED",
        f"AI plan created — {item.title}",
        job_id=job_id,
    )

    db.commit()

    return item.ai_plan


@app.get("/jobs/{job_id}/ai/next-action")
def next_action(
    job_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    item = owned(
        db,
        Job,
        job_id,
        user.id,
    )

    return {
        "title": (
            item.current_action
            or "Review job requirements"
        ),
        "job_id": job_id,
    }


# ============================================================
# ACTIVITIES
# ============================================================

@app.get("/activities")
def activities(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    items = db.scalars(
        select(Activity)
        .where(Activity.user_id == user.id)
        .order_by(Activity.created_at.desc())
    ).all()

    return [
        serialize(item)
        for item in items
    ]


# ============================================================
# CALLS
# ============================================================

@app.post("/calls", status_code=201)
def create_call(
    data: CallCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if data.person_id:
        owned(
            db,
            Person,
            data.person_id,
            user.id,
        )

    if data.job_id:
        owned(
            db,
            Job,
            data.job_id,
            user.id,
        )

    action = Action(
        user_id=user.id,
        job_id=data.job_id,
        person_id=data.person_id,
        type="call",
        status="scheduled",
        title="Call scheduled",
        scheduled_at=data.scheduled_at,
    )

    db.add(action)
    db.flush()

    item = Call(
        user_id=user.id,
        action_id=action.id,
        **data.model_dump(),
    )

    db.add(item)

    activity(
        db,
        user.id,
        "CALL_SCHEDULED",
        "Call scheduled",
        job_id=data.job_id,
        person_id=data.person_id,
        action_id=action.id,
    )

    db.commit()
    db.refresh(item)

    return serialize(item)


@app.get("/calls/{call_id}")
def get_call(
    call_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return serialize(
        owned(
            db,
            Call,
            call_id,
            user.id,
        )
    )


# ============================================================
# MESSAGES
# ============================================================

@app.post("/messages", status_code=201)
def create_message(
    data: MessageCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned(
        db,
        Person,
        data.person_id,
        user.id,
    )

    conversation = db.scalar(
        select(Conversation).where(
            Conversation.user_id == user.id,
            Conversation.person_id == data.person_id,
            Conversation.channel == data.channel,
        )
    )

    if not conversation:
        conversation = Conversation(
            user_id=user.id,
            person_id=data.person_id,
            job_id=data.job_id,
            channel=data.channel,
        )

        db.add(conversation)
        db.flush()

    message = Message(
        conversation_id=conversation.id,
        sender_type="human",
        content=data.content,
    )

    db.add(message)

    activity(
        db,
        user.id,
        "MESSAGE_SENT",
        "Message sent",
        job_id=data.job_id,
        person_id=data.person_id,
    )

    db.commit()
    db.refresh(message)

    return serialize(message)


# ============================================================
# GENERIC ACTIONS
# ============================================================

@app.post("/actions", status_code=201)
def create_action(
    data: ActionCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    item = Action(
        user_id=user.id,
        **data.model_dump(),
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return serialize(item)


# ============================================================
# AI PROCESSING
# ============================================================

@app.post("/ai/process")
def process(
    data: ProcessRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return {
        "processed": True,
        "summary": "Conversation queued for processing",
        "input": data.model_dump(),
    }


# ============================================================
# SETTINGS
# ============================================================

from fastapi import Body

@app.get("/settings")
def settings(
    user: User = Depends(current_user),
):
    return {
        "name": user.name,
        "email": user.email,
        "business_name": user.business_name,
        "timezone": user.timezone,
    }


@app.patch("/settings")
def update_settings(
    data: dict = Body(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    for key in (
        "name",
        "business_name",
        "timezone",
    ):
        if key in data:
            setattr(
                user,
                key,
                data[key],
            )

    db.commit()
    db.refresh(user)

    return {
        "name": user.name,
        "email": user.email,
        "business_name": user.business_name,
        "timezone": user.timezone,
    }


# ============================================================
# CALENDAR
# ============================================================

@app.get("/calendar/events")
def list_calendar_events(
    start: str | None = None,
    end: str | None = None,
    person_id: str | None = None,
    job_id: str | None = None,
    event_type: str | None = None,
    status: str | None = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    query = select(CalendarEvent).where(CalendarEvent.user_id == user.id)

    if start:
        query = query.where(CalendarEvent.start_at >= datetime.fromisoformat(start))
    
    if end:
        query = query.where(CalendarEvent.start_at <= datetime.fromisoformat(end))

    if person_id:
        query = query.where(CalendarEvent.person_id == person_id)

    if job_id:
        query = query.where(CalendarEvent.job_id == job_id)

    if event_type:
        query = query.where(CalendarEvent.event_type == event_type)

    if status:
        query = query.where(CalendarEvent.status == status)

    events = db.scalars(query.order_by(CalendarEvent.start_at.asc())).all()

    result = []
    for event in events:
        event_dict = serialize(event)
        
        if event.person_id:
            person = db.get(Person, event.person_id)
            if person:
                event_dict["person_name"] = person.name
        
        if event.job_id:
            job = db.get(Job, event.job_id)
            if job:
                event_dict["job_title"] = job.title
                
        result.append(event_dict)

    return result

@app.post("/calendar/events", status_code=201)
def create_calendar_event(
    data: CalendarEventCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    item = CalendarEvent(
        user_id=user.id,
        **data.model_dump(exclude_unset=True)
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    
    event_dict = serialize(item)
    if item.person_id:
        person = db.get(Person, item.person_id)
        if person:
            event_dict["person_name"] = person.name
    
    if item.job_id:
        job = db.get(Job, item.job_id)
        if job:
            event_dict["job_title"] = job.title

    return event_dict

@app.get("/calendar/events/{event_id}")
def get_calendar_event(
    event_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    item = owned(db, CalendarEvent, event_id, user.id)
    event_dict = serialize(item)
    
    if item.person_id:
        person = db.get(Person, item.person_id)
        if person:
            event_dict["person_name"] = person.name
    
    if item.job_id:
        job = db.get(Job, item.job_id)
        if job:
            event_dict["job_title"] = job.title
            
    return event_dict

@app.patch("/calendar/events/{event_id}")
def update_calendar_event(
    event_id: str,
    data: CalendarEventUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    item = owned(db, CalendarEvent, event_id, user.id)

    payload = data.model_dump(exclude_unset=True)
    for key, value in payload.items():
        setattr(item, key, value)
        
    if "status" in payload and payload["status"] == "completed" and not item.completed_at:
        item.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(item)
    
    event_dict = serialize(item)
    if item.person_id:
        person = db.get(Person, item.person_id)
        if person:
            event_dict["person_name"] = person.name
    
    if item.job_id:
        job = db.get(Job, item.job_id)
        if job:
            event_dict["job_title"] = job.title
            
    return event_dict

@app.delete("/calendar/events/{event_id}", status_code=204)
def delete_calendar_event(
    event_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    item = owned(db, CalendarEvent, event_id, user.id)
    db.delete(item)
    db.commit()

# ==========================================
# PAYMENTS
# ==========================================

@app.get("/payments")
def get_payments(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    job_id: str | None = None,
    person_id: str | None = None,
    status: str | None = None
):
    query = select(Payment).where(Payment.user_id == user.id)
    if job_id: query = query.where(Payment.job_id == job_id)
    if person_id: query = query.where(Payment.person_id == person_id)
    if status: query = query.where(Payment.status == status)
    
    payments = db.execute(query.order_by(Payment.due_at.asc())).scalars().all()
    results = []
    for p in payments:
        p_dict = serialize(p)
        if p.person_id:
            person = db.execute(select(Person).where(Person.id == p.person_id)).scalar_one_or_none()
            if person: p_dict['person_name'] = person.name
        if p.job_id:
            job = db.execute(select(Job).where(Job.id == p.job_id)).scalar_one_or_none()
            if job: p_dict['job_title'] = job.title
        results.append(p_dict)
    return results

@app.get("/payments/{payment_id}")
def get_payment(payment_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    payment = owned(db, Payment, payment_id, user.id)
    p_dict = serialize(payment)
    if payment.person_id:
        person = db.execute(select(Person).where(Person.id == payment.person_id)).scalar_one_or_none()
        if person: p_dict['person_name'] = person.name
    if payment.job_id:
        job = db.execute(select(Job).where(Job.id == payment.job_id)).scalar_one_or_none()
        if job: p_dict['job_title'] = job.title
    return p_dict

@app.post("/payments")
def create_payment(
    data: PaymentCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    payment_id = uid()

    person = owned(db, Person, data.person_id, user.id) if data.person_id else None
    if data.job_id:
        owned(db, Job, data.job_id, user.id)
    
    razorpay_link_id = None
    razorpay_url = None
    
    if not razorpay_service.is_configured():
        raise HTTPException(status_code=500, detail="Razorpay integration is not configured on the backend.")

    customer = {}
    if person:
        customer["name"] = person.name
        if person.email:
            customer["email"] = person.email
        if person.phone:
            customer["contact"] = person.phone
            
    expire_by = None
    if data.due_at:
        expire_by = int(data.due_at.timestamp())
        
    try:
        link = razorpay_service.create_payment_link(
            amount=data.amount,
            currency=data.currency or "INR",
            reference_id=payment_id,
            description=data.description or data.title,
            customer=customer,
            expire_by=expire_by
        )
        razorpay_link_id = link.get("id")
        razorpay_url = link.get("short_url")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create Razorpay link: {str(e)}")

    payment = Payment(
        id=payment_id,
        user_id=user.id,
        title=data.title,
        amount=data.amount,
        currency=data.currency or "INR",
        description=data.description,
        due_at=data.due_at,
        status="requested",
        person_id=data.person_id,
        job_id=data.job_id,
        provider="razorpay",
        provider_link_id=razorpay_link_id,
        metadata_={"payment_link_url": razorpay_url}
    )
    
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    if payment.due_at:
        cal_event = CalendarEvent(
            user_id=user.id,
            title=payment.title,
            event_type="Payment Due",
            start_at=payment.due_at,
            amount=payment.amount,
            currency=payment.currency,
            person_id=payment.person_id,
            job_id=payment.job_id,
            payment_id=payment.id
        )
        db.add(cal_event)
        
    person_name_display = person.name if person else "Unknown"
    activity(db, user.id, "payment_created", f"Payment request created for {person_name_display} — {payment.currency} {payment.amount}", job_id=payment.job_id, person_id=payment.person_id)
    db.commit()
    return serialize(payment)

@app.post("/payments/{payment_id}/create-link")
def create_missing_payment_link(
    payment_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Create a Razorpay link for legacy payments that were saved without one."""
    payment = owned(db, Payment, payment_id, user.id)
    if payment.status in ["paid", "cancelled", "expired"]:
        raise HTTPException(status_code=400, detail=f"Cannot create a link for a {payment.status} payment.")

    metadata = dict(payment.metadata_ or {})
    if metadata.get("payment_link_url"):
        return serialize(payment)
    if not razorpay_service.is_configured():
        raise HTTPException(status_code=500, detail="Razorpay integration is not configured on the backend.")

    person = owned(db, Person, payment.person_id, user.id) if payment.person_id else None
    customer = {}
    if person:
        customer["name"] = person.name
        if person.email:
            customer["email"] = person.email
        if person.phone:
            customer["contact"] = person.phone

    try:
        link = razorpay_service.create_payment_link(
            amount=float(payment.amount),
            currency=payment.currency or "INR",
            reference_id=payment.id,
            description=payment.description or payment.title,
            customer=customer,
            expire_by=int(payment.due_at.timestamp()) if payment.due_at else None,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to create Razorpay link: {exc}")

    payment.provider = "razorpay"
    payment.provider_link_id = link.get("id")
    payment.status = "requested"
    metadata["payment_link_url"] = link.get("short_url")
    payment.metadata_ = metadata
    db.commit()
    db.refresh(payment)
    return serialize(payment)

@app.patch("/payments/{payment_id}")
def update_payment(
    payment_id: str,
    data: PaymentUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    payment = owned(db, Payment, payment_id, user.id)
    update_data = data.dict(exclude_unset=True)
    
    status_changed = "status" in update_data and update_data["status"] != payment.status
    due_at_changed = "due_at" in update_data and update_data["due_at"] != payment.due_at
    
    if status_changed and update_data["status"] == "cancelled" and payment.provider_link_id and payment.provider == "razorpay":
        try:
            if razorpay_service.is_configured():
                razorpay_service.cancel_payment_link(payment.provider_link_id)
        except Exception as e:
            print(f"Failed to cancel Razorpay link: {e}")
            
    for key, val in update_data.items():
        setattr(payment, key, val)
        
    if payment.status == "paid" and not payment.paid_at:
        payment.paid_at = datetime.utcnow()
        activity(db, user.id, "payment_paid", f"Payment marked as paid: {payment.title}", job_id=payment.job_id, person_id=payment.person_id)
        
    db.commit()
    
    # Handle calendar event updates
    cal_event = db.execute(select(CalendarEvent).where(CalendarEvent.payment_id == payment.id)).scalar_one_or_none()
    if cal_event:
        if status_changed and payment.status == "paid":
            cal_event.status = "completed"
            cal_event.completed_at = datetime.utcnow()
        elif status_changed and payment.status == "cancelled":
            cal_event.status = "cancelled"
        if due_at_changed and payment.due_at:
            cal_event.start_at = payment.due_at
        cal_event.amount = payment.amount
        cal_event.currency = payment.currency
        cal_event.title = payment.title
    elif payment.due_at and payment.status != "cancelled":
        cal_event = CalendarEvent(
            user_id=user.id,
            title=payment.title,
            event_type="Payment Due",
            start_at=payment.due_at,
            amount=payment.amount,
            currency=payment.currency,
            person_id=payment.person_id,
            job_id=payment.job_id,
            payment_id=payment.id
        )
        db.add(cal_event)
        
    db.commit()
    return serialize(payment)

@app.delete("/payments/{payment_id}", status_code=204)
def delete_payment(
    payment_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    payment = owned(db, Payment, payment_id, user.id)
    cal_event = db.execute(select(CalendarEvent).where(CalendarEvent.payment_id == payment.id)).scalar_one_or_none()
    if cal_event:
        db.delete(cal_event)
        
    if payment.provider_link_id and payment.provider == "razorpay" and payment.status not in ["paid", "cancelled", "expired"]:
        try:
            if razorpay_service.is_configured():
                razorpay_service.cancel_payment_link(payment.provider_link_id)
        except Exception as e:
            pass
            
    db.delete(payment)
    db.commit()

@app.post("/payments/{payment_id}/create-order")
def create_payment_order(
    payment_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    payment = owned(db, Payment, payment_id, user.id)
    if payment.status in ["paid", "cancelled", "expired"]:
        raise HTTPException(status_code=400, detail=f"Cannot create order for payment in status {payment.status}")
        
    try:
        order = razorpay_service.create_order(
            amount=payment.amount,
            currency=payment.currency or "INR",
            receipt=f"receipt_{payment.id}"
        )
        payment.provider_link_id = order.get("id") # we use provider_link_id to store order_id in this case
        payment.provider = "razorpay"
        db.commit()
        return {"order_id": order.get("id"), "amount": order.get("amount"), "currency": order.get("currency")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/payments/{payment_id}/verify-signature")
def verify_payment_signature_endpoint(
    payment_id: str,
    data: PaymentVerifyRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    payment = owned(db, Payment, payment_id, user.id)
    
    try:
        razorpay_service.verify_payment_signature(
            data.razorpay_order_id,
            data.razorpay_payment_id,
            data.razorpay_signature
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    payment.status = "paid"
    payment.paid_at = datetime.utcnow()
    payment.provider_payment_id = data.razorpay_payment_id
    
    cal_event = db.execute(select(CalendarEvent).where(CalendarEvent.payment_id == payment.id)).scalar_one_or_none()
    if cal_event:
        cal_event.status = "completed"
        cal_event.completed_at = datetime.utcnow()
        
    person_name = "Unknown"
    if payment.person_id:
        person = db.get(Person, payment.person_id)
        if person:
            person_name = person.name
            
    activity(db, payment.user_id, "payment_paid", f"{person_name} paid {payment.currency} {payment.amount}", job_id=payment.job_id, person_id=payment.person_id)
    db.commit()
    
    return {"status": "success"}

@app.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")
    
    try:
        razorpay_service.verify_webhook_signature(body, signature)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid signature")
        
    payload = await request.json()
    event = payload.get("event")
    
    if event in ["payment_link.paid", "payment_link.partially_paid", "payment_link.cancelled", "payment_link.expired"]:
        p_link = payload["payload"]["payment_link"]["entity"]
        reference_id = p_link.get("reference_id", "")
        
        if reference_id:
            payment_id = reference_id.replace("ERGON-PAY-", "")
            payment = db.get(Payment, payment_id)
            if not payment:
                print(f"[RAZORPAY WEBHOOK] ergon_payment_id = {payment_id} | payment_found = False")
                return {"status": "ok"}
                
            print(f"[RAZORPAY WEBHOOK]")
            print(f"event = {event}")
            print(f"reference_id = {reference_id}")
            print(f"razorpay_payment_link_id = {p_link.get('id')}")
            print(f"ergon_payment_id = {payment_id}")
            print(f"payment_found = True")
 
                
            old_status = payment.status
            new_status = None
            
            if event == "payment_link.paid":
                new_status = "paid"
                # Store order_id if available
                payment.provider_payment_id = p_link.get("order_id")
            elif event == "payment_link.partially_paid":
                new_status = "partially_paid"
            elif event == "payment_link.cancelled":
                new_status = "cancelled"
            elif event == "payment_link.expired":
                new_status = "expired"
                
            print(f"status_before = {old_status}")
            print(f"status_after = {new_status or old_status}")
            
            if new_status and old_status != new_status:
                payment.status = new_status
                if new_status == "paid":
                    payment.paid_at = datetime.utcnow()
                    
                cal_event = db.execute(select(CalendarEvent).where(CalendarEvent.payment_id == payment.id)).scalar_one_or_none()
                if cal_event:
                    if new_status == "paid":
                        cal_event.status = "completed"
                        cal_event.completed_at = datetime.utcnow()
                    elif new_status == "cancelled":
                        cal_event.status = "cancelled"
                
                person_name = "Unknown"
                if payment.person_id:
                    person = db.get(Person, payment.person_id)
                    if person:
                        person_name = person.name
                        
                action_text = f"Payment marked as {new_status}"
                if new_status == "paid":
                    action_text = f"{person_name} paid {payment.currency} {payment.amount}"
                elif new_status == "expired":
                    action_text = f"Payment request for {person_name} expired"
                elif new_status == "cancelled":
                    action_text = f"Payment request for {person_name} cancelled"
                
                activity(db, payment.user_id, f"payment_{new_status}", action_text, job_id=payment.job_id, person_id=payment.person_id)
                db.commit()
                
    return {"status": "ok"}
