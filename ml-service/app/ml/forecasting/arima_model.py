# ml-service/app/ml/forecasting/arima_model.py

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import pickle
import os
import logging

from app.ml.base import BaseModel
from app.config import settings

logger = logging.getLogger(__name__)


class ARIMAForecaster(BaseModel):
    """ARIMA-based demand forecasting model."""

    def __init__(self, model_id: str = "arima_demand"):
        super().__init__(model_id)
        self.model = None
        self.order: Tuple[int, int, int] = settings.ARIMA_ORDER
        self._statsmodels_available = self._check_statsmodels()

    def _check_statsmodels(self) -> bool:
        """Check if statsmodels is available."""
        try:
            from statsmodels.tsa.arima.model import ARIMA
            return True
        except ImportError:
            logger.warning("statsmodels not installed. Using fallback model.")
            return False

    def prepare_data(self, data: List[Dict]) -> pd.Series:
        """Prepare data for ARIMA."""
        df = pd.DataFrame(data)
        df["date"] = pd.to_datetime(df["date"])
        df = df.set_index("date").sort_index()

        # Fill missing dates
        date_range = pd.date_range(df.index.min(), df.index.max(), freq="D")
        df = df.reindex(date_range, fill_value=0)

        return df["quantity"]

    def train(
        self,
        data: List[Dict],
        order: Tuple[int, int, int] = None,
    ) -> Dict:
        """Train the ARIMA model."""
        logger.info(f"Training ARIMA model with {len(data)} samples")

        if len(data) < settings.MIN_TRAINING_SAMPLES:
            raise ValueError(
                f"Insufficient data: {len(data)} < {settings.MIN_TRAINING_SAMPLES}"
            )

        series = self.prepare_data(data)
        self.order = order or self.order

        if self._statsmodels_available:
            from statsmodels.tsa.arima.model import ARIMA

            # Fit ARIMA model
            model = ARIMA(series, order=self.order)
            self.model = model.fit()

            # Calculate metrics
            fitted_values = self.model.fittedvalues
            residuals = series - fitted_values
            self.metrics = {
                "aic": round(self.model.aic, 2),
                "bic": round(self.model.bic, 2),
                "mae": round(np.abs(residuals).mean(), 2),
                "rmse": round(np.sqrt((residuals**2).mean()), 2),
            }
        else:
            # Fallback: simple exponential smoothing
            self.model = {
                "mean": float(series.mean()),
                "std": float(series.std()),
                "last_value": float(series.iloc[-1]) if len(series) > 0 else 0,
            }
            self.metrics = {"mae": float(series.std() * 0.8), "rmse": float(series.std())}

        self.is_fitted = True
        self.last_trained = datetime.utcnow()

        logger.info(f"ARIMA model trained. MAE: {self.metrics.get('mae', 'N/A')}")

        return {
            "status": "success",
            "model_id": self.model_id,
            "samples": len(data),
            "order": self.order,
            "metrics": self.metrics,
            "trained_at": self.last_trained.isoformat(),
        }

    def predict(
        self,
        horizon_days: int = None,
    ) -> Dict:
        """Generate forecasts."""
        if not self.is_fitted:
            raise ValueError("Model not trained. Call train() first.")

        horizon = horizon_days or settings.DEFAULT_FORECAST_HORIZON

        if self._statsmodels_available and hasattr(self.model, "get_forecast"):
            # Use ARIMA prediction
            forecast = self.model.get_forecast(steps=horizon)
            mean = forecast.predicted_mean
            conf_int = forecast.conf_int(alpha=0.05)

            predictions = []
            base_date = datetime.utcnow()

            for i in range(len(mean)):
                pred_date = base_date + pd.Timedelta(days=i + 1)
                predictions.append({
                    "date": pred_date.strftime("%Y-%m-%d"),
                    "predicted": max(0, round(mean.iloc[i], 2)),
                    "lower_bound": max(0, round(conf_int.iloc[i, 0], 2)),
                    "upper_bound": round(conf_int.iloc[i, 1], 2),
                })
        else:
            # Fallback prediction
            predictions = []
            base_date = datetime.utcnow()
            mean = self.model.get("mean", 0)
            std = self.model.get("std", 1)

            for i in range(horizon):
                pred_date = base_date + pd.Timedelta(days=i + 1)
                predictions.append({
                    "date": pred_date.strftime("%Y-%m-%d"),
                    "predicted": max(0, round(mean, 2)),
                    "lower_bound": max(0, round(mean - 1.96 * std, 2)),
                    "upper_bound": round(mean + 1.96 * std, 2),
                })

        return {
            "model_id": self.model_id,
            "model_type": "arima",
            "order": self.order,
            "horizon_days": horizon,
            "predictions": predictions,
            "confidence_level": 0.95,
            "generated_at": datetime.utcnow().isoformat(),
        }

    def save(self, path: str = None) -> str:
        """Save model to disk."""
        if not self.is_fitted:
            raise ValueError("Cannot save unfitted model")

        path = path or os.path.join(settings.MODEL_DIR, f"{self.model_id}.pkl")
        os.makedirs(os.path.dirname(path), exist_ok=True)

        model_data = {
            "model": self.model,
            "order": self.order,
            "metrics": self.metrics,
            "last_trained": self.last_trained,
            "model_id": self.model_id,
            "statsmodels_available": self._statsmodels_available,
        }

        with open(path, "wb") as f:
            pickle.dump(model_data, f)

        return path

    def load(self, path: str = None) -> bool:
        """Load model from disk."""
        path = path or os.path.join(settings.MODEL_DIR, f"{self.model_id}.pkl")

        if not os.path.exists(path):
            return False

        with open(path, "rb") as f:
            model_data = pickle.load(f)

        self.model = model_data["model"]
        self.order = model_data["order"]
        self.metrics = model_data["metrics"]
        self.last_trained = model_data["last_trained"]
        self._statsmodels_available = model_data.get("statsmodels_available", self._statsmodels_available)
        self.is_fitted = True

        return True
