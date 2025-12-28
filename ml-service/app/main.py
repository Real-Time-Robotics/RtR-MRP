# ml-service/app/main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.core.logging import setup_logging
from app.core.database import database
from app.core.exceptions import MLException
from app.api.routes import forecast, leadtime, anomaly, optimization, health, models

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting ML Service...")
    await database.connect()

    # Load models on startup
    from app.services.model_service import model_service

    await model_service.load_all_models()

    logger.info("ML Service started successfully")
    yield

    # Shutdown
    logger.info("Shutting down ML Service...")
    await database.disconnect()
    logger.info("ML Service stopped")


# Create FastAPI app
app = FastAPI(
    title="RTR MRP ML Service",
    description="Machine Learning microservice for RTR MRP System",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handler
@app.exception_handler(MLException)
async def ml_exception_handler(request: Request, exc: MLException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.error_code,
            "message": exc.message,
            "details": exc.details,
        },
    )


# Include routers
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(forecast.router, prefix="/api/v1/forecast", tags=["Forecasting"])
app.include_router(leadtime.router, prefix="/api/v1/leadtime", tags=["Lead Time"])
app.include_router(
    anomaly.router, prefix="/api/v1/anomaly", tags=["Anomaly Detection"]
)
app.include_router(
    optimization.router, prefix="/api/v1/optimization", tags=["Optimization"]
)
app.include_router(models.router, prefix="/api/v1/models", tags=["Model Management"])


@app.get("/")
async def root():
    return {
        "service": "RTR MRP ML Service",
        "version": "1.0.0",
        "status": "running",
    }
