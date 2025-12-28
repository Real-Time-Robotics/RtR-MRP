# ml-service/app/ml/forecasting/ensemble.py

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
import logging

from app.ml.forecasting.prophet_model import ProphetForecaster
from app.ml.forecasting.arima_model import ARIMAForecaster
from app.ml.forecasting.ets_model import ETSForecaster

logger = logging.getLogger(__name__)


class EnsembleForecaster:
    """Ensemble forecaster combining multiple models."""

    def __init__(self, model_id: str = "ensemble_demand"):
        self.model_id = model_id
        self.models: Dict[str, object] = {}
        self.weights: Dict[str, float] = {}
        self.is_fitted = False
        self.last_trained: Optional[datetime] = None
        self.metrics: Dict = {}

    def train(
        self,
        data: List[Dict],
        models: List[str] = None,
        auto_weight: bool = True,
    ) -> Dict:
        """Train ensemble of models."""
        models = models or ["prophet", "arima", "ets"]

        results = {}
        metrics = {}

        for model_name in models:
            try:
                if model_name == "prophet":
                    model = ProphetForecaster(f"{self.model_id}_prophet")
                elif model_name == "arima":
                    model = ARIMAForecaster(f"{self.model_id}_arima")
                elif model_name == "ets":
                    model = ETSForecaster(f"{self.model_id}_ets")
                else:
                    continue

                result = model.train(data)
                self.models[model_name] = model
                metrics[model_name] = result.get("metrics", {})
                results[model_name] = "success"

            except Exception as e:
                logger.error(f"Failed to train {model_name}: {e}")
                results[model_name] = f"failed: {str(e)}"

        # Calculate weights based on MAPE (lower is better)
        if auto_weight:
            self._calculate_weights(metrics)
        else:
            # Equal weights
            n = len(self.models)
            self.weights = {k: 1 / n for k in self.models.keys()}

        self.is_fitted = len(self.models) > 0
        self.last_trained = datetime.utcnow()

        # Aggregate metrics
        self.metrics = self._aggregate_metrics(metrics)

        return {
            "status": "success" if self.is_fitted else "failed",
            "models_trained": results,
            "weights": self.weights,
            "metrics": self.metrics,
        }

    def _calculate_weights(self, metrics: Dict[str, Dict]):
        """Calculate model weights based on inverse MAPE."""
        mapes = {}
        for model_name, m in metrics.items():
            mape = m.get("mape")
            if mape and mape > 0:
                mapes[model_name] = mape

        if not mapes:
            # Equal weights if no MAPE available
            n = len(self.models)
            self.weights = {k: 1 / n for k in self.models.keys()}
            return

        # Inverse MAPE weighting
        inverse_mapes = {k: 1 / v for k, v in mapes.items()}
        total = sum(inverse_mapes.values())
        self.weights = {k: v / total for k, v in inverse_mapes.items()}

    def _aggregate_metrics(self, metrics: Dict[str, Dict]) -> Dict:
        """Aggregate metrics from all models."""
        mapes = [m.get("mape") for m in metrics.values() if m.get("mape")]
        maes = [m.get("mae") for m in metrics.values() if m.get("mae")]
        rmses = [m.get("rmse") for m in metrics.values() if m.get("rmse")]

        return {
            "mape": round(np.mean(mapes), 2) if mapes else None,
            "mae": round(np.mean(maes), 2) if maes else None,
            "rmse": round(np.mean(rmses), 2) if rmses else None,
            "model_count": len(self.models),
            "individual_metrics": metrics,
        }

    def predict(
        self,
        horizon_days: int = 90,
        method: str = "weighted_average",
    ) -> Dict:
        """Generate ensemble predictions."""
        if not self.is_fitted:
            raise ValueError("Ensemble not trained")

        all_predictions = {}

        # Get predictions from each model
        for model_name, model in self.models.items():
            try:
                result = model.predict(horizon_days)
                all_predictions[model_name] = {
                    p["date"]: p["predicted"] for p in result["predictions"]
                }
            except Exception as e:
                logger.error(f"Prediction failed for {model_name}: {e}")

        if not all_predictions:
            raise ValueError("No predictions available from any model")

        # Combine predictions
        combined = self._combine_predictions(all_predictions, method)

        return {
            "model_id": self.model_id,
            "model_type": "ensemble",
            "method": method,
            "horizon_days": horizon_days,
            "predictions": combined,
            "model_weights": self.weights,
            "generated_at": datetime.utcnow().isoformat(),
        }

    def _combine_predictions(
        self,
        all_predictions: Dict[str, Dict[str, float]],
        method: str,
    ) -> List[Dict]:
        """Combine predictions from multiple models."""
        # Get all dates
        all_dates = set()
        for preds in all_predictions.values():
            all_dates.update(preds.keys())

        combined = []
        for date in sorted(all_dates):
            values = []
            weighted_sum = 0
            total_weight = 0

            for model_name, preds in all_predictions.items():
                if date in preds:
                    value = preds[date]
                    values.append(value)
                    weight = self.weights.get(model_name, 1)
                    weighted_sum += value * weight
                    total_weight += weight

            if method == "weighted_average" and total_weight > 0:
                predicted = weighted_sum / total_weight
            elif method == "median":
                predicted = np.median(values) if values else 0
            elif method == "mean":
                predicted = np.mean(values) if values else 0
            else:
                predicted = weighted_sum / total_weight if total_weight > 0 else 0

            # Calculate confidence bounds from spread of predictions
            if len(values) > 1:
                std = np.std(values)
                lower_bound = max(0, predicted - 1.96 * std)
                upper_bound = predicted + 1.96 * std
            else:
                lower_bound = predicted * 0.8
                upper_bound = predicted * 1.2

            combined.append({
                "date": date,
                "predicted": round(max(0, predicted), 2),
                "lower_bound": round(lower_bound, 2),
                "upper_bound": round(upper_bound, 2),
                "model_predictions": {
                    model: round(preds.get(date, 0), 2)
                    for model, preds in all_predictions.items()
                },
            })

        return combined

    def get_info(self) -> Dict:
        """Get ensemble information."""
        return {
            "model_id": self.model_id,
            "is_fitted": self.is_fitted,
            "last_trained": self.last_trained.isoformat() if self.last_trained else None,
            "models": list(self.models.keys()),
            "weights": self.weights,
            "metrics": self.metrics,
        }
