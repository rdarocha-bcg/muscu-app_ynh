from fastapi import APIRouter

from database import get_db

router = APIRouter()


@router.get("/api/exercises")
def list_exercises():
    with get_db() as con:
        rows = con.execute("SELECT name FROM exercise ORDER BY name").fetchall()
        return [r["name"] for r in rows]


@router.get("/api/exercises/frequent")
def frequent_exercises(limit: int = 5):
    with get_db() as con:
        rows = con.execute("""
            SELECT e.name, COUNT(DISTINCT l.session_id) as count
            FROM log l JOIN exercise e ON e.id=l.exercise_id
            GROUP BY e.id ORDER BY count DESC LIMIT ?
        """, (limit,)).fetchall()
        return [dict(r) for r in rows]


@router.get("/api/progress/{exercise}")
def get_progress(exercise: str):
    with get_db() as con:
        rows = con.execute("""
            SELECT s.date, l.set_number, l.reps, l.weight
            FROM log l
            JOIN exercise e ON e.id=l.exercise_id
            JOIN session s ON s.id=l.session_id
            WHERE LOWER(e.name)=LOWER(?)
            ORDER BY s.date, l.set_number
        """, (exercise,)).fetchall()
        return [dict(r) for r in rows]
