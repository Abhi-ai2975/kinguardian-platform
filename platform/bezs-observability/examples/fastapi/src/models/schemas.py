# schemas.py — Pydantic models for request/response bodies.
from datetime import datetime
from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    user_id: str
    email: str


class NoteCreate(BaseModel):
    title: str
    body: str


class NoteUpdate(BaseModel):
    title: str | None = None
    body: str | None = None


class Note(BaseModel):
    id: str
    title: str
    body: str
    user_id: str
    created_at: datetime
    updated_at: datetime
