# ml-service/app/config.py

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings."""

    # Service
    SERVICE_NAME: str = "rtr-ml-service"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql://rtr:password@db:5432/rtr_mrp"

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://app:3000"]

    # ML Settings
    MODEL_DIR: str = "/app/models"
    DEFAULT_FORECAST_HORIZON: int = 90  # days
    MIN_TRAINING_SAMPLES: int = 30
    RETRAIN_INTERVAL_DAYS: int = 7

    # Model defaults
    PROPHET_SEASONALITY_MODE: str = "multiplicative"
    ARIMA_ORDER: tuple = (1, 1, 1)

    # Feature flags
    ENABLE_AUTO_TRAINING: bool = True
    ENABLE_MODEL_CACHING: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
