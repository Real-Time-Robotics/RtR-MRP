# ml-service/app/services/forecast_service.py

from typing import Dict, List, Optional
from datetime import datetime
import logging
import uuid

from app.ml.forecasting import ProphetForecaster, ARIMAForecaster, ETSForecaster, EnsembleForecaster
from app.core.database import get_historical_demand, get_part_info
from app.config import settings

logger = logging.getLogger(__name__)


class ForecastService:
    """Service for demand forecasting operations."""

    def __init__(self):
        self.models: Dict[str, object] = {}
        self.forecast_history: Dict[str, List[Dict]] = {}

    async def forecast_demand(
        self,
        part_id: str,
        horizon_days: int = 90,
        model_type: str = "ensemble",
        retrain: bool = False,
    ) -> Dict:
        """Generate demand forecast for a part."""
        model_key = f"{part_id}_{model_type}"

        # Get or create model
        model = self.models.get(model_key)

        if model is None or retrain or (model and model.needs_retraining()):
            # Get historical data
            data = await get_historical_demand(part_id, days=365)

            if len(data) < settings.MIN_TRAINING_SAMPLES:
                # Generate synthetic data for demo
                logger.warning(f"Insufficient data for {part_id}, using synthetic data")
                data = self._generate_synthetic_data(365)

            # Train model
            model = self._create_model(model_type, part_id)
            await self._train_model(model, data)
            self.models[model_key] = model

        # Generate predictions
        result = model.predict(horizon_days)

        # Get part info
        part_info = await get_part_info(part_id)

        # Store in history
        self._store_forecast_history(part_id, result)

        return {
            "part_id": part_id,
            "part_name": part_info.get("name", "Unknown"),
            "model_type": model_type,
            "horizon_days": horizon_days,
            "predictions": result.get("predictions", []),
            "model_metrics": model.metrics if hasattr(model, "metrics") else {},
            "generated_at": datetime.utcnow().isoformat(),
        }

    def _create_model(self, model_type: str, part_id: str) -> object:
        """Create forecasting model based on type."""
        model_id = f"{model_type}_{part_id}"

        if model_type == "prophet":
            return ProphetForecaster(model_id)
        elif model_type == "arima":
            return ARIMAForecaster(model_id)
        elif model_type == "ets":
            return ETSForecaster(model_id)
        elif model_type == "ensemble":
            return EnsembleForecaster(model_id)
        else:
            raise ValueError(f"Unknown model type: {model_type}")

    async def _train_model(self, model: object, data: List[Dict]) -> Dict:
        """Train the model."""
        return model.train(data)

    def _generate_synthetic_data(self, days: int) -> List[Dict]:
        """Generate synthetic demand data for demo."""
        import numpy as np
        from datetime import timedelta

        base_date = datetime.utcnow() - timedelta(days=days)
        data = []

        for i in range(days):
            date = base_date + timedelta(days=i)
            # Base demand with seasonality
            base = 100
            seasonal = 20 * np.sin(2 * np.pi * i / 365)  # Yearly
            weekly = 10 * np.sin(2 * np.pi * i / 7)  # Weekly
            noise = np.random.normal(0, 10)

            quantity = max(0, base + seasonal + weekly + noise)

            data.append({
                "date": date.strftime("%Y-%m-%d"),
                "quantity": round(quantity, 2),
            })

        return data

    def _store_forecast_history(self, part_id: str, result: Dict):
        """Store forecast in history."""
        if part_id not in self.forecast_history:
            self.forecast_history[part_id] = []

        self.forecast_history[part_id].append({
            "generated_at": datetime.utcnow().isoformat(),
            "horizon_days": result.get("horizon_days"),
            "model_type": result.get("model_type"),
            "prediction_count": len(result.get("predictions", [])),
        })

        # Keep only last 10 forecasts
        self.forecast_history[part_id] = self.forecast_history[part_id][-10:]

    async def get_forecast_history(self, part_id: str, limit: int = 10) -> List[Dict]:
        """Get forecast history for a part."""
        history = self.forecast_history.get(part_id, [])
        return history[-limit:]

    async def create_batch_forecast_job(
        self,
        part_ids: List[str],
        horizon_days: int = 90,
    ) -> str:
        """Create a batch forecast job."""
        job_id = str(uuid.uuid4())
        logger.info(f"Created batch forecast job {job_id} for {len(part_ids)} parts")
        return job_id

    async def process_batch_forecast(self, job_id: str):
        """Process a batch forecast job (background task)."""
        logger.info(f"Processing batch forecast job {job_id}")
        # Implementation would process parts asynchronously


forecast_service = ForecastService()
