from datetime import datetime, timedelta
from typing import Annotated

from fastapi import FastAPI, Depends, HTTPException, status
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
    ProcessRequest,
    TaskCreate,
    TaskUpdate,
    TaskPersonCreate,
    MilestoneCreate,
    MilestoneUpdate,
)

from utils import serialize, activity, owned
from routers.auth import router as auth_router, current_user
from routers.call_assistant import router as call_assistant_router
from routers.live_call import router as live_call_router


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
    tasks = db.scalars(select(Task).where(Task.job_id == job_id).order_by(Task.created_at.desc())).all()
    return [serialize(t) for t in tasks]

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
    task = Task(job_id=job_id, **payload)
    db.add(task)
    db.flush()
    for pid in person_ids:
        db.add(TaskPerson(task_id=task.id, person_id=pid))
    
    activity(db, user.id, "TASK_CREATED", f"Task created - {task.title}", job_id=job_id)
    db.commit()
    db.refresh(task)
    return serialize(task)

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

    for key, value in payload.items():
        setattr(task, key, value)
        
    if person_ids is not None:
        db.query(TaskPerson).filter(TaskPerson.task_id == task_id).delete()
        for pid in person_ids:
            db.add(TaskPerson(task_id=task.id, person_id=pid))
    
    activity(db, user.id, "TASK_UPDATED", f"Task updated - {task.title}", job_id=task.job_id)
    db.commit()
    db.refresh(task)
    return serialize(task)

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
# PAYMENTS
# ============================================================

@app.post("/payments", status_code=201)
def create_payment(
    data: PaymentCreate,
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

    item = Payment(
        user_id=user.id,
        **data.model_dump(),
    )

    db.add(item)
    db.flush()

    activity(
        db,
        user.id,
        "PAYMENT_REQUESTED",
        "Payment requested",
        data.description,
        job_id=data.job_id,
        person_id=data.person_id,
    )

    db.commit()
    db.refresh(item)

    return serialize(item)


@app.get("/payments/{payment_id}")
def get_payment(
    payment_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return serialize(
        owned(
            db,
            Payment,
            payment_id,
            user.id,
        )
    )


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
