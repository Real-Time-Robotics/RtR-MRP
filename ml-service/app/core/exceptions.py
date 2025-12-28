# ml-service/app/core/exceptions.py

from typing import Any, Dict, Optional


class MLException(Exception):
    """Base exception for ML service."""

    def __init__(
        self,
        message: str,
        error_code: str = "ML_ERROR",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class InsufficientDataError(MLException):
    """Raised when there's not enough data for training."""

    def __init__(self, message: str, required: int, available: int):
        super().__init__(
            message=message,
            error_code="INSUFFICIENT_DATA",
            status_code=400,
            details={"required": required, "available": available},
        )


class ModelNotFoundError(MLException):
    """Raised when a model is not found."""

    def __init__(self, model_id: str):
        super().__init__(
            message=f"Model not found: {model_id}",
            error_code="MODEL_NOT_FOUND",
            status_code=404,
            details={"model_id": model_id},
        )


class ModelNotTrainedError(MLException):
    """Raised when trying to predict with an untrained model."""

    def __init__(self, model_id: str):
        super().__init__(
            message=f"Model not trained: {model_id}",
            error_code="MODEL_NOT_TRAINED",
            status_code=400,
            details={"model_id": model_id},
        )


class TrainingError(MLException):
    """Raised when model training fails."""

    def __init__(self, message: str, model_id: str):
        super().__init__(
            message=message,
            error_code="TRAINING_ERROR",
            status_code=500,
            details={"model_id": model_id},
        )


class PredictionError(MLException):
    """Raised when prediction fails."""

    def __init__(self, message: str, model_id: str):
        super().__init__(
            message=message,
            error_code="PREDICTION_ERROR",
            status_code=500,
            details={"model_id": model_id},
        )


class ValidationError(MLException):
    """Raised when input validation fails."""

    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=400,
            details={"field": field} if field else {},
        )
