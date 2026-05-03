from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from database import get_db

router = APIRouter()


class SetEntry(BaseModel):
    reps: Optional[int] = None
    weight: Optional[float] = None


class LogIn(BaseModel):
    exercise: str
    sets: list[SetEntry]


@router.get("/api/sessions/{sid}/logs")
def get_logs(sid: int):
    with get_db() as con:
        rows = con.execute("""
            SELECT l.id, e.name as exercise, l.set_number, l.reps, l.weight
            FROM log l JOIN exercise e ON e.id=l.exercise_id
            WHERE l.session_id=? ORDER BY l.id
        """, (sid,)).fetchall()
        return [dict(r) for r in rows]


@router.post("/api/sessions/{sid}/logs")
def add_log(sid: int, entry: LogIn):
    with get_db() as con:
        con.execute("INSERT OR IGNORE INTO exercise(name) VALUES(?)", (entry.exercise,))
        eid = con.execute("SELECT id FROM exercise WHERE name=?", (entry.exercise,)).fetchone()["id"]
        for i, s in enumerate(entry.sets, 1):
            con.execute(
                "INSERT INTO log(session_id, exercise_id, set_number, reps, weight) VALUES(?,?,?,?,?)",
                (sid, eid, i, s.reps, s.weight)
            )
    return {"ok": True}


@router.delete("/api/logs/{lid}")
def delete_log(lid: int):
    with get_db() as con:
        con.execute("DELETE FROM log WHERE id=?", (lid,))
    return {"ok": True}
