# ml-service/app/api/routes/health.py

from fastapi import APIRouter
from datetime import datetime

from app.services.model_service import model_service

router = APIRouter()


@router.get("")
async def health_check():
    """Health check endpoint."""
    model_status = await model_service.get_model_status()

    return {
        "status": "healthy",
        "service": "rtr-ml-service",
        "timestamp": datetime.utcnow().isoformat(),
        "models_loaded": model_status.get("active", 0),
        "total_models": model_status.get("total", 0),
    }


@router.get("/ready")
async def readiness_check():
    """Readiness probe endpoint."""
    return {
        "status": "ready",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/live")
async def liveness_check():
    """Liveness probe endpoint."""
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat(),
    }
