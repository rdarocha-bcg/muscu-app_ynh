# muscu-app

Self-hosted workout tracker. FastAPI backend + SQLite + vanilla HTML/CSS/JS frontend.
Live at: https://muscu.remidarocha.fr (YunoHost SSO, user: remi)

---

## Local Development

```bash
cd muscu-app/backend
./venv/bin/uvicorn main:app --reload --port 8000
# open http://localhost:8000
```

**⚠️ Before local dev:** set `const API = "http://localhost:8000"` in all 3 JS files:
- `frontend/js/app.js`
- `frontend/js/calendar.js`
- `frontend/js/progress.js`

**⚠️ Before deploying:** revert to `const API = ""` (relative paths for prod).

---

## Deploy

Frontend only (most changes):
```bash
scp frontend/index.html frontend/calendar.html frontend/progress.html remi@remidarocha.fr:/home/remi/muscu-app/frontend/
scp frontend/js/app.js frontend/js/calendar.js frontend/js/progress.js remi@remidarocha.fr:/home/remi/muscu-app/frontend/js/
scp frontend/css/style.css remi@remidarocha.fr:/home/remi/muscu-app/frontend/css/
```

Backend (Python changes):
```bash
scp backend/main.py remi@remidarocha.fr:/home/remi/muscu-app/backend/main.py
ssh remi@remidarocha.fr "sudo systemctl restart muscu"
```

---

## Architecture

```
muscu-app/
├── backend/
│   ├── main.py          # FastAPI app, all routes, DB init
│   ├── muscu.db         # SQLite — LOCAL DEV ONLY (prod is on server)
│   └── requirements.txt # fastapi, uvicorn[standard]
└── frontend/
    ├── index.html       # Sessions list + session detail modal
    ├── calendar.html    # Monthly calendar view
    ├── progress.html    # Per-exercise progress charts
    ├── css/style.css
    └── js/
        ├── app.js       # Sessions CRUD, exercise logging, tags
        ├── calendar.js  # Calendar rendering, monthly stats
        └── progress.js  # Chart.js charts, exercise stats
```

**Production:**
- Service: `/etc/systemd/system/muscu.service` (user=remi, port 8765)
- Nginx: `/etc/nginx/conf.d/muscu.remidarocha.fr.d/app.conf`
- Database: `/home/remi/muscu-app/backend/muscu.db`
- API key env var: `MUSCU_API_KEY` (in systemd service Environment=)

---

## API Reference

All endpoints require header `X-API-Key: <key>` (except `/config`).

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/config` | — | Returns `{"api_key": "..."}` — no auth required |
| GET | `/api/sessions` | — | List all sessions (optional `?tag=` filter) |
| POST | `/api/sessions` | `{date, notes, tags[]}` | Create session → `{id}` |
| PATCH | `/api/sessions/{id}` | `{date, notes, tags[]}` | Update session |
| DELETE | `/api/sessions/{id}` | — | Delete session + all its logs |
| GET | `/api/sessions/{id}/logs` | — | List exercises for a session |
| POST | `/api/sessions/{id}/logs` | `{exercise, sets:[{reps,weight}]}` | Log exercise sets |
| DELETE | `/api/logs/{id}` | — | Delete one log entry |
| GET | `/api/tags` | — | All distinct tags across sessions |
| GET | `/api/exercises` | — | All exercise names (sorted) |
| GET | `/api/exercises/frequent` | — | Top 5 most-used exercises |
| GET | `/api/progress/{exercise}` | — | All sets for an exercise across sessions |

---

## Database Schema

```sql
session (id, date TEXT, notes TEXT, tags TEXT)  -- tags stored as JSON array
exercise (id, name TEXT UNIQUE)
log (id, session_id → session, exercise_id → exercise, set_number, reps, weight)
```

---

## OpenClaw Integration

Skill slug: `wger-openclaw` (on openclaw server at 192.168.1.237)
Skill file: `/home/remidr/.openclaw/workspace/skills/wger-openclaw/SKILL.md`
Env vars set in openclaw.json: `MUSCU_URL`, `MUSCU_API_KEY`
Telegram exec approvals: `channels.telegram.execApprovals.approvers: ["6893089468"]`

**Known issue:** agent responds "Logué" before the async exec completes.
The curl actually runs after, but the agent doesn't wait for the result.

---

## Known Gotchas

- **`const API`**: must be `""` in prod, `"http://localhost:8000"` for local dev. Easy to forget.
- **Accented exercise names**: `progress.js` uses NFD normalization to match names ignoring accents (e.g. "Inclinée" matches "Inclinee"). All exercises in DB are currently ASCII.
- **`overflow-x: hidden` on `.modal-box`**: clips the `···` buttons. Don't add it — fix the overflow source instead (`table-layout: fixed` on `.sets-table`).
- **YunoHost SSO + custom apps**: SSO blocks API routes unless `access_by_lua_block {}` is in nginx. Changes to `/etc/ssowat/conf.json` are overwritten — use `conf.json.persistent`.
- **Exercise names in DB**: all stored without accents. If agent logs with accents, a duplicate entry is created.
