from fastapi import APIRouter

from config import get_api_key

router = APIRouter()


@router.get("/config")
def get_config():
    return {"api_key": get_api_key()}
