import os

from fastapi import APIRouter

router = APIRouter()


@router.get("/config")
def get_config():
    return {"api_key": os.environ.get("MUSCU_API_KEY", "")}
