from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import RegisterRequest, LoginRequest
from utils import serialize

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

SECRET = "change-this-in-production"
ALGORITHM = "HS256"

def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Session = Depends(get_db),
):
    try:
        user_id = jwt.decode(credentials.credentials, SECRET, algorithms=[ALGORITHM])["sub"]
    except (JWTError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.post("/register", status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.scalar(select(User).where(User.email == data.email))
    if existing_user:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        name=data.name,
        email=data.email,
        password_hash=pwd_context.hash(data.password),
        business_name=data.business_name,
        timezone=data.timezone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = jwt.encode({"sub": user.id, "exp": datetime.utcnow() + timedelta(days=7)}, SECRET, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer", "user": serialize(user)}

@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email))
    if not user or not pwd_context.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = jwt.encode({"sub": user.id, "exp": datetime.utcnow() + timedelta(days=7)}, SECRET, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer", "user": serialize(user)}
