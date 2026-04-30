# AGENTS Guide

This file gives coding agents a concise and reliable workflow for this repository.

## Scope

- Backend: FastAPI app with SQLite database in `backend/`
- Frontend: Vanilla HTML/CSS/JS (no build step) in `frontend/`
- YunoHost packaging: `manifest.toml`, `scripts/`, `conf/`

## Repository map

- `backend/main.py`: FastAPI app — all routes, DB init, CORS, API key middleware
- `backend/muscu.db`: SQLite database (LOCAL DEV ONLY — prod DB lives on server)
- `frontend/index.html`: Session list + session detail modal
- `frontend/calendar.html`: Monthly calendar view
- `frontend/progress.html`: Per-exercise progress charts
- `frontend/js/app.js`: Session CRUD, exercise logging, tags
- `frontend/js/calendar.js`: Calendar rendering, monthly stats
- `frontend/js/progress.js`: Chart.js charts, exercise stats
- `frontend/css/style.css`: All styles
- `manifest.toml`: YunoHost app manifest
- `scripts/`: YunoHost install/upgrade/remove/backup/restore scripts
- `conf/`: Template config files (nginx, systemd)

## Baseline requirements

- Python 3.10+ and pip
- No build step needed for frontend (static files served directly)
- See `backend/requirements.txt` for backend deps: `fastapi`, `uvicorn[standard]`

## Useful commands

Run from repository root unless noted.

- Install backend deps: `pip install -r backend/requirements.txt`
- Start backend dev server: `cd backend && uvicorn main:app --reload --port 8000`
- Open app locally: `http://localhost:8000`
- Syntax check: `python -m py_compile backend/main.py`
- Run tests (if present): `cd backend && pytest tests/ -v`

**⚠️ Before local dev:** set `const API = "http://localhost:8000"` in all 3 JS files:
`frontend/js/app.js`, `frontend/js/calendar.js`, `frontend/js/progress.js`

**⚠️ Before deploying / committing:** revert to `const API = ""` (relative paths for prod).

## Coding rules for agents

- Keep all code and code comments in English.
- Do not commit `const API = "http://localhost:8000"` — use `const API = ""` in prod.
- Do not commit `backend/muscu.db` (it is `.gitignore`d).
- All exercise names in the DB are stored without accents — do not insert accented names.
- Do not add `overflow-x: hidden` to `.modal-box` (clips the `···` buttons).
- Avoid introducing new Python dependencies unless required by the task.
- All API routes live in `backend/main.py`; only split if explicitly asked.
- All endpoints require `X-API-Key: <key>` header except `/config`.

## Editing and architecture guidance

- Database schema changes: update the `init_db()` function in `backend/main.py`.
- Frontend state is managed in plain JS — no framework, no build step.
- YunoHost packaging changes live in `manifest.toml`, `scripts/`, `conf/` — not application code.
- Keep edits minimal and focused; do not refactor unrelated areas.

## Validation checklist before finishing

1. Syntax-check backend: `python -m py_compile backend/main.py`
2. Verify imports: `cd backend && python -c "import main; print('main.py imports OK')"`
3. Run tests if present: `cd backend && pytest tests/ -v`
4. Confirm `const API = ""` (not localhost) in all 3 frontend JS files
5. Validate manifest: `python3 -c "import tomllib; tomllib.load(open('manifest.toml','rb'))"`
6. Ensure no secrets or environment-specific credentials are committed

## PR checklist for agents

- Use a clear, scoped title with intent (`feat:`, `fix:`, `docs:`, etc.)
- Summarize user-visible impact and technical changes
- List validation steps executed
- Mention risks, follow-ups, or known limitations if applicable
