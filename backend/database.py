import sqlite3
import os


def get_db_path():
    return os.environ.get("MUSCU_DB_PATH", os.path.join(os.path.dirname(__file__), "muscu.db"))


def get_db():
    con = sqlite3.connect(get_db_path())
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


def init_db():
    with get_db() as con:
        con.executescript("""
        CREATE TABLE IF NOT EXISTS session (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            notes TEXT,
            tags TEXT NOT NULL DEFAULT '[]'
        );
        CREATE TABLE IF NOT EXISTS exercise (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        );
        CREATE TABLE IF NOT EXISTS log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL REFERENCES session(id) ON DELETE CASCADE,
            exercise_id INTEGER NOT NULL REFERENCES exercise(id),
            set_number INTEGER NOT NULL DEFAULT 1,
            reps INTEGER,
            weight REAL
        );
        """)


def migrate_db():
    with get_db() as con:
        cols = [r[1] for r in con.execute("PRAGMA table_info(session)").fetchall()]
        if "tags" not in cols:
            con.execute("ALTER TABLE session ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'")
