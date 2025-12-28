# ml-service/app/api/routes/models.py

from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel

from app.services.model_service import model_service

router = APIRouter()


class TrainingRequest(BaseModel):
    model_type: str
    entity_id: Optional[str] = None
    force: bool = False


@router.get("/status")
async def get_model_status():
    """Get status of all ML models."""
    try:
        status = await model_service.get_model_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model status: {str(e)}")


@router.get("/{model_id}")
async def get_model_info(model_id: str):
    """Get information about a specific model."""
    info = await model_service.get_model_info(model_id)
    if not info:
        raise HTTPException(status_code=404, detail=f"Model not found: {model_id}")
    return info


@router.post("/train")
async def train_model(request: TrainingRequest):
    """Trigger model training."""
    try:
        result = await model_service.train_model(
            model_type=request.model_type,
            entity_id=request.entity_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.delete("/{model_id}")
async def delete_model(model_id: str):
    """Delete a model."""
    try:
        success = await model_service.delete_model(model_id)
        return {"status": "success" if success else "not_found", "model_id": model_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
