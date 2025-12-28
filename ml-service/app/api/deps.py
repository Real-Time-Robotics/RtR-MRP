# ml-service/app/api/deps.py

from typing import Generator
from app.core.database import database


async def get_db() -> Generator:
    """Database dependency."""
    try:
        yield database
    finally:
        pass
