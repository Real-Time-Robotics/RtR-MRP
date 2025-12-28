# ml-service/app/api/routes/optimization.py

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel, Field

from app.services.optimization_service import optimization_service

router = APIRouter()


class SafetyStockInput(BaseModel):
    part_id: str
    service_level: float = Field(0.95, ge=0.5, le=0.99)
    lead_time_days: Optional[float] = None
    method: str = Field("king", description="standard, king, or dynamic")


class EOQInput(BaseModel):
    part_id: str
    order_cost: float = Field(..., ge=0, description="Cost per order")
    holding_cost_rate: float = Field(0.25, ge=0, le=1, description="Annual holding cost rate")


class InventoryOptimizationInput(BaseModel):
    part_id: str
    service_level: float = Field(0.95)
    order_cost: float = Field(50)
    holding_cost_rate: float = Field(0.25)


class BatchOptimizationInput(BaseModel):
    part_ids: List[str]
    service_level: float = Field(0.95)


@router.post("/safety-stock")
async def calculate_safety_stock(input: SafetyStockInput):
    """
    Calculate optimal safety stock for a part.

    Uses historical demand data and lead time information.
    """
    try:
        result = await optimization_service.calculate_safety_stock(
            part_id=input.part_id,
            service_level=input.service_level,
            lead_time_days=input.lead_time_days,
            method=input.method,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Safety stock calculation failed: {str(e)}")


@router.post("/eoq")
async def calculate_eoq(input: EOQInput):
    """
    Calculate Economic Order Quantity (EOQ).

    Minimizes total inventory costs.
    """
    try:
        result = await optimization_service.calculate_eoq(
            part_id=input.part_id,
            order_cost=input.order_cost,
            holding_cost_rate=input.holding_cost_rate,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"EOQ calculation failed: {str(e)}")


@router.post("/inventory-optimization")
async def optimize_inventory(input: InventoryOptimizationInput):
    """
    Complete inventory optimization for a part.

    Calculates safety stock, EOQ, and reorder point.
    """
    try:
        result = await optimization_service.optimize_inventory(
            part_id=input.part_id,
            service_level=input.service_level,
            order_cost=input.order_cost,
            holding_cost_rate=input.holding_cost_rate,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")


@router.post("/batch-optimization")
async def batch_optimize_inventory(input: BatchOptimizationInput):
    """Optimize inventory for multiple parts."""
    try:
        results = await optimization_service.batch_optimize(
            part_ids=input.part_ids,
            service_level=input.service_level,
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch optimization failed: {str(e)}")
