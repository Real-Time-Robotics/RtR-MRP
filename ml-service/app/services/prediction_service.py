# ml-service/app/services/prediction_service.py

from typing import Dict, List, Optional
from datetime import datetime
import logging
import numpy as np

from app.ml.prediction import LeadTimePredictor
from app.core.database import get_supplier_lead_times, get_supplier_info
from app.config import settings

logger = logging.getLogger(__name__)


class PredictionService:
    """Service for prediction operations."""

    def __init__(self):
        self.lead_time_models: Dict[str, LeadTimePredictor] = {}

    async def predict_lead_time(
        self,
        supplier_id: str,
        order_value: float = 0,
        line_count: int = 1,
        total_quantity: int = 1,
        is_critical: bool = False,
        part_category: Optional[str] = None,
    ) -> Dict:
        """Predict lead time for a purchase order."""
        # Get or train model for supplier
        model = self.lead_time_models.get(supplier_id)

        if model is None or model.needs_retraining():
            model = await self._get_or_train_model(supplier_id)

        # Get supplier info for historical averages
        supplier_info = await get_supplier_info(supplier_id)

        # Prepare prediction input
        prediction_input = {
            "orderValue": order_value,
            "lineCount": line_count,
            "totalQuantity": total_quantity,
            "isCritical": 1 if is_critical else 0,
            "avgHistoricalLeadtime": supplier_info.get("leadTimeDays", 14),
            "leadtimeStd": 3,
            "onTimeRate": supplier_info.get("onTimeDeliveryRate", 0.9),
            "partCategoryEncoded": hash(part_category or "") % 10,
        }

        # Make prediction
        result = model.predict(prediction_input)

        return {
            "supplier_id": supplier_id,
            "supplier_name": supplier_info.get("name", "Unknown"),
            "predicted_days": result["predicted_days"],
            "lower_bound": result["lower_bound"],
            "upper_bound": result["upper_bound"],
            "confidence": result["confidence"],
            "factors": result.get("factors", {}),
        }

    async def _get_or_train_model(self, supplier_id: str) -> LeadTimePredictor:
        """Get or train lead time model for supplier."""
        # Get historical data
        data = await get_supplier_lead_times(supplier_id)

        if len(data) < settings.MIN_TRAINING_SAMPLES:
            logger.warning(f"Insufficient data for supplier {supplier_id}, using synthetic data")
            data = self._generate_synthetic_lead_time_data(100)

        # Create and train model
        model = LeadTimePredictor(f"leadtime_{supplier_id}")
        model.train(data)

        self.lead_time_models[supplier_id] = model
        return model

    def _generate_synthetic_lead_time_data(self, count: int) -> List[Dict]:
        """Generate synthetic lead time data for demo."""
        from datetime import timedelta

        data = []
        base_date = datetime.utcnow() - timedelta(days=365)

        for i in range(count):
            order_date = base_date + timedelta(days=i * 3)

            # Base lead time with some variability
            base_lead_time = 14
            variability = np.random.normal(0, 3)
            actual_lead_time = max(3, base_lead_time + variability)

            data.append({
                "orderDate": order_date.isoformat(),
                "actual_lead_time": round(actual_lead_time, 1),
                "expected_lead_time": base_lead_time,
                "orderValue": np.random.uniform(1000, 50000),
                "lineCount": np.random.randint(1, 10),
                "totalQuantity": np.random.randint(10, 1000),
                "isCritical": np.random.choice([0, 1], p=[0.9, 0.1]),
            })

        return data

    async def analyze_supplier_lead_time(self, supplier_id: str) -> Dict:
        """Get lead time analysis for a supplier."""
        data = await get_supplier_lead_times(supplier_id)

        if not data:
            # Use synthetic data for demo
            data = self._generate_synthetic_lead_time_data(50)

        lead_times = [d.get("actual_lead_time", d.get("expected_lead_time", 14)) for d in data]

        return {
            "supplier_id": supplier_id,
            "statistics": {
                "mean": round(np.mean(lead_times), 1),
                "median": round(np.median(lead_times), 1),
                "std": round(np.std(lead_times), 2),
                "min": round(min(lead_times), 1),
                "max": round(max(lead_times), 1),
                "percentile_90": round(np.percentile(lead_times, 90), 1),
                "percentile_95": round(np.percentile(lead_times, 95), 1),
            },
            "sample_count": len(data),
            "on_time_rate": round(
                sum(1 for d in data if d.get("actual_lead_time", 0) <= d.get("expected_lead_time", 14))
                / len(data)
                * 100,
                1,
            ) if data else 0,
            "analyzed_at": datetime.utcnow().isoformat(),
        }

    async def train_lead_time_model(self, supplier_id: str) -> Dict:
        """Manually trigger model training for a supplier."""
        model = await self._get_or_train_model(supplier_id)

        return {
            "status": "success",
            "supplier_id": supplier_id,
            "model_id": model.model_id,
            "metrics": model.metrics,
            "trained_at": model.last_trained.isoformat() if model.last_trained else None,
        }


prediction_service = PredictionService()
