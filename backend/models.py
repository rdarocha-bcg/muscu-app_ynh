from typing import Optional

from pydantic import BaseModel


class SessionIn(BaseModel):
    date: str
    notes: Optional[str] = None
    tags: list[str] = []


class SetEntry(BaseModel):
    reps: Optional[int] = None
    weight: Optional[float] = None


class LogIn(BaseModel):
    exercise: str
    sets: list[SetEntry]
