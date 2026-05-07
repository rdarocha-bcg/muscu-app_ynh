import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from database import init_db
from routers import exercises, logs, sessions, tags
from routers import config as config_router

API_KEY = os.environ.get("MUSCU_API_KEY", "")

app = FastAPI(title="Muscu Tracker")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["X-API-Key", "Content-Type"],
)


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


app.include_router(config_router.router)
app.include_router(sessions.router)
app.include_router(logs.router)
app.include_router(tags.router)
app.include_router(exercises.router)

init_db()

_frontend_dir = os.environ.get(
    "MUSCU_FRONTEND_DIR", os.path.join(os.path.dirname(__file__), "../frontend")
)
app.mount("/", StaticFiles(directory=_frontend_dir, html=True), name="static")
