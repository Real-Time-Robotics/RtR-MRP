# ml-service/app/api/routes/forecast.py

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List
from pydantic import BaseModel, Field

from app.services.forecast_service import forecast_service

router = APIRouter()


class ForecastInput(BaseModel):
    part_id: str = Field(..., description="Part ID to forecast")
    horizon_days: int = Field(90, ge=7, le=365, description="Forecast horizon")
    model_type: str = Field("ensemble", description="Model type: prophet, arima, ets, ensemble")
    retrain: bool = Field(False, description="Force model retraining")


class BatchForecastInput(BaseModel):
    part_ids: List[str]
    horizon_days: int = Field(90, ge=7, le=365)


@router.post("/demand")
async def forecast_demand(input: ForecastInput):
    """
    Generate demand forecast for a part.

    Uses historical sales order data to predict future demand.
    """
    try:
        result = await forecast_service.forecast_demand(
            part_id=input.part_id,
            horizon_days=input.horizon_days,
            model_type=input.model_type,
            retrain=input.retrain,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast failed: {str(e)}")


@router.post("/demand/batch")
async def forecast_demand_batch(
    input: BatchForecastInput,
    background_tasks: BackgroundTasks,
):
    """
    Generate forecasts for multiple parts.

    Returns immediately with job ID for async processing.
    """
    job_id = await forecast_service.create_batch_forecast_job(
        part_ids=input.part_ids,
        horizon_days=input.horizon_days,
    )

    background_tasks.add_task(
        forecast_service.process_batch_forecast,
        job_id,
    )

    return {
        "job_id": job_id,
        "status": "processing",
        "part_count": len(input.part_ids),
    }


@router.get("/demand/{part_id}/history")
async def get_forecast_history(
    part_id: str,
    limit: int = 10,
):
    """Get historical forecasts for a part."""
    history = await forecast_service.get_forecast_history(part_id, limit)
    return {"part_id": part_id, "history": history}
