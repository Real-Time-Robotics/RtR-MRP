# ml-service/app/models/enums.py

from enum import Enum


class ForecastModel(str, Enum):
    PROPHET = "prophet"
    ARIMA = "arima"
    ETS = "ets"
    ENSEMBLE = "ensemble"


class OptimizationMethod(str, Enum):
    STANDARD = "standard"
    KING = "king"
    DYNAMIC = "dynamic"


class AnomalyMethod(str, Enum):
    ISOLATION_FOREST = "isolation_forest"
    STATISTICAL = "statistical"
    ZSCORE = "zscore"


class TrainingStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
