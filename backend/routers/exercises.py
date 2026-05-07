from typing import Optional

from fastapi import APIRouter, Query

from database import db

router = APIRouter()


@router.get("/api/exercises")
def list_exercises():
    with db() as con:
        rows = con.execute("SELECT name FROM exercise ORDER BY name").fetchall()
        return [r["name"] for r in rows]


@router.get("/api/exercises/frequent")
def frequent_exercises(limit: int = 5):
    with db() as con:
        rows = con.execute("""
            SELECT e.name, COUNT(DISTINCT l.session_id) as count
            FROM log l JOIN exercise e ON e.id=l.exercise_id
            GROUP BY e.id ORDER BY count DESC LIMIT ?
        """, (limit,)).fetchall()
        return [dict(r) for r in rows]


@router.get("/api/progress/{exercise}")
def get_progress(
    exercise: str,
    limit: Optional[int] = Query(None),
    offset: int = Query(0),
):
    with db() as con:
        rows = con.execute("""
            SELECT s.date, l.set_number, l.reps, l.weight
            FROM log l
            JOIN exercise e ON e.id=l.exercise_id
            JOIN session s ON s.id=l.session_id
            WHERE LOWER(e.name)=LOWER(?)
            ORDER BY s.date, l.set_number
        """, (exercise,)).fetchall()
        data = [dict(r) for r in rows]
        total = len(data)
        end = offset + limit if limit is not None else None
        data = data[offset:end]
        return {"data": data, "total": total, "limit": limit, "offset": offset}
