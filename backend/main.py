from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3, os, json
from migrations.runner import run_migrations

API_KEY = os.environ.get("MUSCU_API_KEY", "")

app = FastAPI(title="Muscu Tracker")
app.add_middleware(CORSMiddleware, allow_origins=[], allow_credentials=False,
                   allow_methods=["GET", "POST", "PATCH", "DELETE"],
                   allow_headers=["X-API-Key", "Content-Type"])

@app.middleware("http")
async def api_key_guard(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        # Fail-safe: reject all /api/ requests if MUSCU_API_KEY is not set or wrong
        if not API_KEY or request.headers.get("X-API-Key") != API_KEY:
            return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return await call_next(request)

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    import logging
    logging.exception("Unhandled exception on %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

@app.get("/config")
def get_config():
    return {"api_key": API_KEY}

DB = os.environ.get("MUSCU_DB_PATH", os.path.join(os.path.dirname(__file__), "muscu.db"))

def db():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con

def init_db():
    run_migrations(DB)


init_db()

def session_row(r):
    d = dict(r)
    d["tags"] = json.loads(d.get("tags") or "[]")
    return d

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

# Sessions
@app.get("/api/sessions")
def list_sessions(tag: Optional[str] = Query(None), limit: Optional[int] = Query(None), offset: int = Query(0)):
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
            sessions = [s for s in sessions if tag.lower() in [t.lower() for t in s["tags"]]]
        total = len(sessions)
        end = offset + limit if limit is not None else None
        sessions = sessions[offset:end]
        return {"data": sessions, "total": total, "limit": limit, "offset": offset}

@app.post("/api/sessions")
def create_session(s: SessionIn):
    with db() as con:
        cur = con.execute("INSERT INTO session(date, notes, tags) VALUES(?,?,?)",
                          (s.date, s.notes, json.dumps(s.tags)))
        return {"id": cur.lastrowid, "date": s.date, "notes": s.notes, "tags": s.tags}

@app.get("/api/tags")
def list_tags():
    with db() as con:
        rows = con.execute("SELECT tags FROM session").fetchall()
        all_tags = set()
        for r in rows:
            all_tags.update(json.loads(r["tags"] or "[]"))
        return sorted(all_tags)

@app.patch("/api/sessions/{sid}")
def update_session(sid: int, s: SessionIn):
    with db() as con:
        con.execute("UPDATE session SET date=?, notes=?, tags=? WHERE id=?",
                    (s.date, s.notes, json.dumps(s.tags), sid))
    return {"ok": True}

@app.delete("/api/sessions/{sid}")
def delete_session(sid: int):
    with db() as con:
        con.execute("DELETE FROM session WHERE id=?", (sid,))
    return {"ok": True}

# Logs
@app.get("/api/sessions/{sid}/logs")
def get_logs(sid: int):
    with db() as con:
        rows = con.execute("""
            SELECT l.id, e.name as exercise, l.set_number, l.reps, l.weight
            FROM log l JOIN exercise e ON e.id=l.exercise_id
            WHERE l.session_id=? ORDER BY l.id
        """, (sid,)).fetchall()
        return [dict(r) for r in rows]

@app.post("/api/sessions/{sid}/logs")
def add_log(sid: int, entry: LogIn):
    with db() as con:
        con.execute("INSERT OR IGNORE INTO exercise(name) VALUES(?)", (entry.exercise,))
        eid = con.execute("SELECT id FROM exercise WHERE name=?", (entry.exercise,)).fetchone()["id"]
        for i, s in enumerate(entry.sets, 1):
            con.execute(
                "INSERT INTO log(session_id, exercise_id, set_number, reps, weight) VALUES(?,?,?,?,?)",
                (sid, eid, i, s.reps, s.weight)
            )
    return {"ok": True}

@app.delete("/api/logs/{lid}")
def delete_log(lid: int):
    with db() as con:
        con.execute("DELETE FROM log WHERE id=?", (lid,))
    return {"ok": True}

# Exercises
@app.get("/api/exercises")
def list_exercises():
    with db() as con:
        rows = con.execute("SELECT name FROM exercise ORDER BY name").fetchall()
        return [r["name"] for r in rows]

# Frequent exercises
@app.get("/api/exercises/frequent")
def frequent_exercises(limit: int = 5):
    with db() as con:
        rows = con.execute("""
            SELECT e.name, COUNT(DISTINCT l.session_id) as count
            FROM log l JOIN exercise e ON e.id=l.exercise_id
            GROUP BY e.id ORDER BY count DESC LIMIT ?
        """, (limit,)).fetchall()
        return [dict(r) for r in rows]

# Progress
@app.get("/api/progress/{exercise}")
def get_progress(exercise: str, limit: Optional[int] = Query(None), offset: int = Query(0)):
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

_frontend_dir = os.environ.get("MUSCU_FRONTEND_DIR", os.path.join(os.path.dirname(__file__), "../frontend"))
app.mount("/", StaticFiles(directory=_frontend_dir, html=True), name="static")
