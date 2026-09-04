from datetime import datetime
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from models import Activity

from sqlalchemy.orm import class_mapper

def serialize(obj):
    data = {}
    for prop in class_mapper(obj.__class__).column_attrs:
        data[prop.key] = getattr(obj, prop.key)
        
    if "metadata_" in data:
        data["metadata"] = data.pop("metadata_")
        
    data.pop("password_hash", None)
    for key, value in list(data.items()):
        if isinstance(value, datetime):
            data[key] = value.isoformat()
        elif hasattr(value, "__float__"):
            data[key] = float(value)
    return data

def activity(db, user_id, kind, title, description=None, job_id=None, person_id=None, action_id=None):
    db.add(
        Activity(
            user_id=user_id,
            type=kind,
            title=title,
            description=description,
            job_id=job_id,
            person_id=person_id,
            action_id=action_id,
        )
    )

def owned(db, model, item_id, user_id):
    item = db.get(model, item_id)
    if not item or getattr(item, "user_id", user_id) != user_id:
        raise HTTPException(status_code=404, detail="Resource not found")
    return item
