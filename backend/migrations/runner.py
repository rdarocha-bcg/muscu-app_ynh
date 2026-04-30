"""Minimal migration runner — applies versioned SQL migrations in order."""
import sqlite3
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).parent / "versions"


def run_migrations(db_path: str):
    conn = sqlite3.connect(db_path)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations "
        "(version TEXT PRIMARY KEY, applied_at TEXT DEFAULT CURRENT_TIMESTAMP)"
    )
    applied = {r[0] for r in conn.execute("SELECT version FROM schema_migrations")}
    for f in sorted(MIGRATIONS_DIR.glob("*.sql")):
        version = f.stem  # e.g. "001_initial"
        if version not in applied:
            conn.executescript(f.read_text())
            conn.execute("INSERT INTO schema_migrations (version) VALUES (?)", (version,))
            conn.commit()
    conn.close()
