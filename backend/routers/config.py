from fastapi import APIRouter
import os

router = APIRouter()


@router.get("/config")
def get_config():
    return {"api_key": os.environ.get("MUSCU_API_KEY", "")}
