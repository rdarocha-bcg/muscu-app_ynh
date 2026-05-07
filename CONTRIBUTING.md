# Contributing

Development is tracked on [GitHub Issues](https://github.com/rdarocha-bcg/muscu-app_ynh/issues). Use the templates when opening a new ticket.

## Definition of Ready (issue quality)

Before marking an issue ready to implement, it should briefly cover:

1. **User goal** — What problem is solved for the user?
2. **Scope** — Which areas are in or out (e.g. `frontend/`, `backend/`, `scripts/`)?
3. **Acceptance criteria** — Concrete, checkable outcomes (see issue template checkboxes).
4. **Manual test ideas** — Steps to verify in a browser or via `curl` after the change.

## Development notes

- Backend: see [AGENTS.md](AGENTS.md) for layout, `pytest`, and `compileall`.
- Frontend: for local API calls, set `const API = "http://localhost:8000"` in `frontend/js/app.js`, `calendar.js`, and `progress.js`. Revert to `const API = ""` before merging (relative URLs for production).

## Python / packaging

- Prefer small, focused PRs linked to an issue number in the title or description.
