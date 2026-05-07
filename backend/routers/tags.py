import json

from fastapi import APIRouter

from database import db

router = APIRouter()


@router.get("/api/tags")
def list_tags():
    with db() as con:
        rows = con.execute("SELECT tags FROM session").fetchall()
        all_tags = set()
        for r in rows:
            all_tags.update(json.loads(r["tags"] or "[]"))
        return sorted(all_tags)
