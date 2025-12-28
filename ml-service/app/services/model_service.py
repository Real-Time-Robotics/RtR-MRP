# ml-service/app/services/model_service.py

from typing import Dict, List, Optional
from datetime import datetime
import os
import logging
import glob

from app.config import settings
from app.models.schemas import ModelInfo, ModelStatus

logger = logging.getLogger(__name__)


class ModelService:
    """Service for model management operations."""

    def __init__(self):
        self.loaded_models: Dict[str, object] = {}
        self.model_info: Dict[str, ModelInfo] = {}

    async def load_all_models(self):
        """Load all saved models on startup."""
        model_dir = settings.MODEL_DIR
        os.makedirs(model_dir, exist_ok=True)

        model_files = glob.glob(os.path.join(model_dir, "*.pkl"))
        logger.info(f"Found {len(model_files)} model files to load")

        for model_file in model_files:
            try:
                model_id = os.path.basename(model_file).replace(".pkl", "")
                # Store info about available models
                self.model_info[model_id] = ModelInfo(
                    model_id=model_id,
                    model_type=self._infer_model_type(model_id),
                    status=ModelStatus.ACTIVE,
                    last_trained=datetime.fromtimestamp(
                        os.path.getmtime(model_file)
                    ).isoformat(),
                )
                logger.info(f"Registered model: {model_id}")
            except Exception as e:
                logger.error(f"Failed to register model {model_file}: {e}")

    def _infer_model_type(self, model_id: str) -> str:
        """Infer model type from model ID."""
        if "prophet" in model_id.lower():
            return "prophet"
        elif "arima" in model_id.lower():
            return "arima"
        elif "ets" in model_id.lower():
            return "ets"
        elif "ensemble" in model_id.lower():
            return "ensemble"
        elif "leadtime" in model_id.lower():
            return "leadtime"
        elif "anomaly" in model_id.lower():
            return "anomaly"
        else:
            return "unknown"

    async def get_model_status(self) -> Dict:
        """Get status of all models."""
        models = []

        for model_id, info in self.model_info.items():
            models.append({
                "model_id": info.model_id,
                "model_type": info.model_type,
                "status": info.status.value,
                "last_trained": info.last_trained,
                "metrics": info.metrics,
            })

        # Add default models if none exist
        if not models:
            models = [
                {
                    "model_id": "ensemble_demand",
                    "model_type": "ensemble",
                    "status": "pending",
                    "last_trained": None,
                    "metrics": {},
                },
                {
                    "model_id": "leadtime_predictor",
                    "model_type": "leadtime",
                    "status": "pending",
                    "last_trained": None,
                    "metrics": {},
                },
                {
                    "model_id": "anomaly_detector",
                    "model_type": "anomaly",
                    "status": "pending",
                    "last_trained": None,
                    "metrics": {},
                },
            ]

        return {
            "models": models,
            "total": len(models),
            "active": sum(1 for m in models if m["status"] == "active"),
        }

    async def train_model(
        self,
        model_type: str,
        entity_id: Optional[str] = None,
    ) -> Dict:
        """Trigger model training."""
        import uuid

        job_id = str(uuid.uuid4())

        # Update status
        model_id = f"{model_type}_{entity_id}" if entity_id else model_type

        self.model_info[model_id] = ModelInfo(
            model_id=model_id,
            model_type=model_type,
            status=ModelStatus.TRAINING,
            entity_id=entity_id,
        )

        logger.info(f"Training job started: {job_id} for {model_id}")

        return {
            "job_id": job_id,
            "model_id": model_id,
            "model_type": model_type,
            "status": "training",
            "message": f"Training job started for {model_type}",
        }

    async def get_model_info(self, model_id: str) -> Optional[Dict]:
        """Get info for a specific model."""
        info = self.model_info.get(model_id)
        if not info:
            return None

        return {
            "model_id": info.model_id,
            "model_type": info.model_type,
            "status": info.status.value,
            "last_trained": info.last_trained,
            "metrics": info.metrics,
            "entity_id": info.entity_id,
        }

    async def delete_model(self, model_id: str) -> bool:
        """Delete a model."""
        model_path = os.path.join(settings.MODEL_DIR, f"{model_id}.pkl")

        if os.path.exists(model_path):
            os.remove(model_path)
            logger.info(f"Deleted model file: {model_path}")

        if model_id in self.model_info:
            del self.model_info[model_id]

        if model_id in self.loaded_models:
            del self.loaded_models[model_id]

        return True


model_service = ModelService()
