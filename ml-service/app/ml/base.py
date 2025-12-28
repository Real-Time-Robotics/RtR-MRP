# ml-service/app/ml/base.py

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from datetime import datetime
import os
import pickle
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class BaseModel(ABC):
    """Base class for all ML models."""

    def __init__(self, model_id: str):
        self.model_id = model_id
        self.is_fitted = False
        self.last_trained: Optional[datetime] = None
        self.metrics: Dict[str, Any] = {}
        self.version: str = "1.0.0"

    @abstractmethod
    def train(self, data: List[Dict]) -> Dict:
        """Train the model on data."""
        pass

    @abstractmethod
    def predict(self, *args, **kwargs) -> Dict:
        """Make predictions."""
        pass

    def save(self, path: str = None) -> str:
        """Save model to disk."""
        path = path or os.path.join(settings.MODEL_DIR, f"{self.model_id}.pkl")

        os.makedirs(os.path.dirname(path), exist_ok=True)

        model_data = {
            "model_id": self.model_id,
            "is_fitted": self.is_fitted,
            "last_trained": self.last_trained,
            "metrics": self.metrics,
            "version": self.version,
        }

        with open(path, "wb") as f:
            pickle.dump(model_data, f)

        logger.info(f"Model saved to {path}")
        return path

    def load(self, path: str = None) -> bool:
        """Load model from disk."""
        path = path or os.path.join(settings.MODEL_DIR, f"{self.model_id}.pkl")

        if not os.path.exists(path):
            logger.warning(f"Model file not found: {path}")
            return False

        with open(path, "rb") as f:
            model_data = pickle.load(f)

        self.model_id = model_data.get("model_id", self.model_id)
        self.is_fitted = model_data.get("is_fitted", False)
        self.last_trained = model_data.get("last_trained")
        self.metrics = model_data.get("metrics", {})
        self.version = model_data.get("version", "1.0.0")

        logger.info(f"Model loaded from {path}")
        return True

    def get_info(self) -> Dict:
        """Get model information."""
        return {
            "model_id": self.model_id,
            "is_fitted": self.is_fitted,
            "last_trained": self.last_trained.isoformat() if self.last_trained else None,
            "metrics": self.metrics,
            "version": self.version,
        }

    def needs_retraining(self, days: int = None) -> bool:
        """Check if model needs retraining."""
        days = days or settings.RETRAIN_INTERVAL_DAYS

        if not self.is_fitted or not self.last_trained:
            return True

        age = (datetime.utcnow() - self.last_trained).days
        return age >= days
