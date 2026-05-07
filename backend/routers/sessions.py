import json
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from database import db

router = APIRouter()


def session_row(r):
    d = dict(r)
    d["tags"] = json.loads(d.get("tags") or "[]")
    return d


class SessionIn(BaseModel):
    date: str
    notes: Optional[str] = None
    tags: list[str] = []


@router.get("/api/sessions")
def list_sessions(
    tag: Optional[str] = Query(None),
    limit: Optional[int] = Query(None),
    offset: int = Query(0),
):
    with db() as con:
        rows = con.execute("""
            SELECT s.*, COUNT(DISTINCT l.exercise_id) AS exercise_count
            FROM session s
            LEFT JOIN log l ON l.session_id = s.id
            GROUP BY s.id
            ORDER BY s.date DESC
        """).fetchall()
        sessions = [session_row(r) for r in rows]
        if tag:
            sessions = [
                s for s in sessions if tag.lower() in [t.lower() for t in s["tags"]]
            ]
        total = len(sessions)
        end = offset + limit if limit is not None else None
        sessions = sessions[offset:end]
        return {"data": sessions, "total": total, "limit": limit, "offset": offset}


@router.post("/api/sessions")
def create_session(s: SessionIn):
    with db() as con:
        cur = con.execute(
            "INSERT INTO session(date, notes, tags) VALUES(?,?,?)",
            (s.date, s.notes, json.dumps(s.tags)),
        )
        return {"id": cur.lastrowid, "date": s.date, "notes": s.notes, "tags": s.tags}


@router.patch("/api/sessions/{sid}")
def update_session(sid: int, s: SessionIn):
    with db() as con:
        con.execute(
            "UPDATE session SET date=?, notes=?, tags=? WHERE id=?",
            (s.date, s.notes, json.dumps(s.tags), sid),
        )
    return {"ok": True}


@router.delete("/api/sessions/{sid}")
def delete_session(sid: int):
    with db() as con:
        con.execute("DELETE FROM session WHERE id=?", (sid,))
    return {"ok": True}
