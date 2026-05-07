import os


def get_api_key() -> str:
    return os.environ.get("MUSCU_API_KEY", "") or ""


def get_frontend_dir() -> str:
    return os.environ.get(
        "MUSCU_FRONTEND_DIR",
        os.path.join(os.path.dirname(__file__), "../frontend"),
    )
