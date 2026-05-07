import os
import sqlite3

from migrations.runner import run_migrations


def get_db_path() -> str:
    return os.environ.get("MUSCU_DB_PATH", os.path.join(os.path.dirname(__file__), "muscu.db"))


def db():
    con = sqlite3.connect(get_db_path())
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


def init_db():
    run_migrations(get_db_path())
