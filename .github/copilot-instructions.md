# muscu-app — Copilot Instructions

Self-hosted workout tracker. **FastAPI + SQLite** backend, **vanilla HTML/CSS/JS** frontend. Deployed on YunoHost via systemd + nginx.

## Stack

- **Backend**: Python, FastAPI, SQLite (no ORM — raw `sqlite3`)
- **Frontend**: Vanilla JS (no framework), Chart.js for progress charts
- **Auth**: `X-API-Key` header on all API routes (key served by `/config`)
- **Deploy**: `scp` to `remi@remidarocha.fr`, systemd service `muscu` on port 8765

## Project layout

```
backend/
  main.py          # App factory, middleware, static mount
  database.py       # db(), init_db → migrations runner
  routers/         # sessions, logs, exercises, tags, config
  migrations/      # runner + versions/*.sql
  requirements.txt
frontend/
  index.html       # Session list + session detail modal
  calendar.html    # Monthly calendar view
  progress.html    # Per-exercise progress charts
  css/style.css
  js/
    app.js         # Sessions CRUD, exercise logging, tags
    calendar.js    # Calendar rendering, monthly stats
    progress.js    # Chart.js charts, exercise stats
```

## Database schema

```sql
session  (id INTEGER PK, date TEXT, notes TEXT, tags TEXT)  -- tags = JSON array
exercise (id INTEGER PK, name TEXT UNIQUE)
log      (id INTEGER PK, session_id → session, exercise_id → exercise,
          set_number INTEGER, reps INTEGER, weight REAL)
```

## API

All endpoints require `X-API-Key` header (except `/config`).

| Method | Path | Body | Notes |
|--------|------|------|-------|
| GET | `/config` | — | Returns `{"api_key":"…"}`, no auth |
| GET | `/api/sessions` | — | `?tag=`, `?limit=`, `?offset=` — response `{data,total,limit,offset}` |
| POST | `/api/sessions` | `{date, notes, tags[]}` | Returns `{id}` |
| PATCH | `/api/sessions/{id}` | `{date, notes, tags[]}` | |
| DELETE | `/api/sessions/{id}` | — | Cascades to logs |
| GET | `/api/sessions/{id}/logs` | — | |
| POST | `/api/sessions/{id}/logs` | `{exercise, sets:[{reps,weight}]}` | |
| DELETE | `/api/logs/{id}` | — | |
| GET | `/api/tags` | — | All distinct tags |
| GET | `/api/exercises` | — | All names, sorted |
| GET | `/api/exercises/frequent` | — | Top 5 most used |
| GET | `/api/progress/{exercise}` | — | `?limit=`, `?offset=` — response `{data,total,limit,offset}` |

## Critical gotchas — always keep in mind

### `const API` in JS files
- **Local dev**: `const API = "http://localhost:8000"` in all 3 JS files
- **Production**: `const API = ""` (relative paths) — **must revert before deploying**
- Files affected: `frontend/js/app.js`, `calendar.js`, `progress.js`

### Exercise names — no accents in DB
- All exercises stored without accents (ASCII only)
- `progress.js` uses NFD normalization to match accented input to ASCII names
- If an accented name is POSTed, a duplicate entry is created — avoid this

### CSS: no `overflow-x: hidden` on `.modal-box`
- This clips the `···` action buttons
- Fix overflow issues via `table-layout: fixed` on `.sets-table` instead

### YunoHost SSO
- SSO blocks API routes unless nginx config includes `access_by_lua_block {}`
- Never edit `/etc/ssowat/conf.json` directly — changes are overwritten
- Use `/etc/ssowat/conf.json.persistent` for persistent overrides

## Local dev workflow

```bash
cd backend
./venv/bin/uvicorn main:app --reload --port 8000
# frontend served at http://localhost:8000
```

## Deploy commands

```bash
# Frontend only
scp frontend/index.html frontend/calendar.html frontend/progress.html \
    remi@remidarocha.fr:/home/remi/muscu-app/frontend/
scp frontend/js/app.js frontend/js/calendar.js frontend/js/progress.js \
    remi@remidarocha.fr:/home/remi/muscu-app/frontend/js/
scp frontend/css/style.css remi@remidarocha.fr:/home/remi/muscu-app/frontend/css/

# Backend (exclude local DB and venv)
rsync -avz --exclude='muscu.db' --exclude='venv' --exclude='__pycache__' \
    backend/ remi@remidarocha.fr:/home/remi/muscu-app/backend/
ssh remi@remidarocha.fr "sudo systemctl restart muscu"

## Production paths

| Resource | Path |
|----------|------|
| Service | `/etc/systemd/system/muscu.service` |
| Nginx config | `/etc/nginx/conf.d/muscu.remidarocha.fr.d/app.conf` |
| Database | `/home/remi/muscu-app/backend/muscu.db` |
| API key | `MUSCU_API_KEY` env var (set in systemd `Environment=`) |
