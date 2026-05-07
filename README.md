# muscu-app (YunoHost)

Self-hosted workout tracker: FastAPI backend, SQLite, static HTML/CSS/JS frontend packaged for [YunoHost](https://yunohost.org/).

**Upstream / issues:** [github.com/rdarocha-bcg/muscu-app_ynh](https://github.com/rdarocha-bcg/muscu-app_ynh)

Contributor workflow:

- Track work in GitHub Issues (labels: ARCH, UX, A11Y, etc.).
- See [CONTRIBUTING.md](CONTRIBUTING.md) for issue readiness (Definition of Ready) and [AGENTS.md](AGENTS.md) for layout and validation commands.
- For local backend dev without YunoHost, run Uvicorn from `backend/` and set `const API` in `frontend/js/*.js` as documented in `AGENTS.md`.
