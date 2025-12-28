# ml-service/app/models/schemas.py

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ModelType(str, Enum):
    PROPHET = "prophet"
    ARIMA = "arima"
    ETS = "ets"
    ENSEMBLE = "ensemble"
    XGBOOST = "xgboost"
    ISOLATION_FOREST = "isolation_forest"


class ModelStatus(str, Enum):
    ACTIVE = "active"
    TRAINING = "training"
    ERROR = "error"
    PENDING = "pending"


# Forecast schemas
class ForecastRequest(BaseModel):
    part_id: str = Field(..., description="Part ID to forecast")
    horizon_days: int = Field(90, ge=7, le=365, description="Forecast horizon")
    model_type: str = Field("ensemble", description="Model type")
    retrain: bool = Field(False, description="Force model retraining")


class ForecastPrediction(BaseModel):
    date: str
    predicted: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    trend: Optional[float] = None


class ForecastResponse(BaseModel):
    part_id: str
    model_type: str
    horizon_days: int
    predictions: List[ForecastPrediction]
    model_metrics: Optional[Dict[str, Any]] = None
    generated_at: str


# Lead time schemas
class LeadTimeRequest(BaseModel):
    supplier_id: str
    order_value: float = Field(0, ge=0)
    line_count: int = Field(1, ge=1)
    total_quantity: int = Field(1, ge=1)
    is_critical: bool = Field(False)
    part_category: Optional[str] = None


class LeadTimeResponse(BaseModel):
    supplier_id: str
    predicted_days: float
    lower_bound: float
    upper_bound: float
    confidence: float
    factors: Dict[str, Any] = {}


# Optimization schemas
class SafetyStockRequest(BaseModel):
    part_id: str
    service_level: float = Field(0.95, ge=0.5, le=0.99)
    lead_time_days: Optional[float] = None
    method: str = Field("king")


class SafetyStockResponse(BaseModel):
    safety_stock: float
    reorder_point: float
    average_daily_demand: float
    demand_std_dev: float
    service_level: float
    z_score: float
    lead_time_days: float
    days_of_supply: float
    method: str
    calculated_at: str


class EOQRequest(BaseModel):
    part_id: str
    order_cost: float = Field(..., ge=0)
    holding_cost_rate: float = Field(0.25, ge=0, le=1)


class EOQResponse(BaseModel):
    eoq: float
    orders_per_year: float
    days_between_orders: float
    ordering_cost_annual: float
    holding_cost_annual: float
    total_cost_annual: float
    calculated_at: str


class InventoryOptimizationRequest(BaseModel):
    part_id: str
    service_level: float = Field(0.95)
    order_cost: float = Field(50)
    holding_cost_rate: float = Field(0.25)


class InventoryOptimizationResponse(BaseModel):
    safety_stock: SafetyStockResponse
    eoq: EOQResponse
    recommendations: Dict[str, Any]
    calculated_at: str


# Anomaly schemas
class AnomalyRequest(BaseModel):
    part_id: str
    lookback_days: int = Field(90, ge=7, le=365)
    contamination: float = Field(0.1, ge=0.01, le=0.5)


class AnomalyResult(BaseModel):
    date: str
    value: float
    is_anomaly: bool
    anomaly_score: float


class AnomalyResponse(BaseModel):
    part_id: str
    anomalies: List[AnomalyResult]
    anomaly_count: int
    total_records: int
    contamination: float
    analyzed_at: str


# Model management schemas
class ModelInfo(BaseModel):
    model_id: str
    model_type: str
    status: ModelStatus
    last_trained: Optional[str] = None
    metrics: Dict[str, Any] = {}
    entity_id: Optional[str] = None


class ModelListResponse(BaseModel):
    models: List[ModelInfo]
    total: int


class TrainingRequest(BaseModel):
    model_type: str
    entity_id: Optional[str] = None
    force: bool = False


class TrainingResponse(BaseModel):
    job_id: str
    model_type: str
    status: str
    message: str
