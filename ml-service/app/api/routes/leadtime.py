# ml-service/app/api/routes/leadtime.py

from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel, Field

from app.services.prediction_service import prediction_service

router = APIRouter()


class LeadTimePredictionInput(BaseModel):
    supplier_id: str
    order_value: float = Field(0, ge=0)
    line_count: int = Field(1, ge=1)
    total_quantity: int = Field(1, ge=1)
    is_critical: bool = Field(False)
    part_category: Optional[str] = None


@router.post("/predict")
async def predict_lead_time(input: LeadTimePredictionInput):
    """
    Predict lead time for a purchase order.

    Uses supplier history and order characteristics.
    """
    try:
        result = await prediction_service.predict_lead_time(
            supplier_id=input.supplier_id,
            order_value=input.order_value,
            line_count=input.line_count,
            total_quantity=input.total_quantity,
            is_critical=input.is_critical,
            part_category=input.part_category,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/supplier/{supplier_id}/analysis")
async def analyze_supplier_lead_time(supplier_id: str):
    """
    Get lead time analysis for a supplier.

    Returns historical statistics and trends.
    """
    try:
        analysis = await prediction_service.analyze_supplier_lead_time(supplier_id)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/train/{supplier_id}")
async def train_lead_time_model(supplier_id: str):
    """Manually trigger model training for a supplier."""
    try:
        result = await prediction_service.train_lead_time_model(supplier_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")
