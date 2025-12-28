# ml-service/app/ml/forecasting/ets_model.py

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
import pickle
import os
import logging

from app.ml.base import BaseModel
from app.config import settings

logger = logging.getLogger(__name__)


class ETSForecaster(BaseModel):
    """Exponential Smoothing (ETS) based demand forecasting model."""

    def __init__(self, model_id: str = "ets_demand"):
        super().__init__(model_id)
        self.model = None
        self._statsmodels_available = self._check_statsmodels()

    def _check_statsmodels(self) -> bool:
        """Check if statsmodels is available."""
        try:
            from statsmodels.tsa.holtwinters import ExponentialSmoothing
            return True
        except ImportError:
            logger.warning("statsmodels not installed. Using fallback model.")
            return False

    def prepare_data(self, data: List[Dict]) -> pd.Series:
        """Prepare data for ETS."""
        df = pd.DataFrame(data)
        df["date"] = pd.to_datetime(df["date"])
        df = df.set_index("date").sort_index()

        # Fill missing dates
        date_range = pd.date_range(df.index.min(), df.index.max(), freq="D")
        df = df.reindex(date_range, fill_value=0)

        # ETS requires positive values
        series = df["quantity"]
        series = series.clip(lower=0.1)  # Avoid zeros for multiplicative

        return series

    def train(
        self,
        data: List[Dict],
        seasonal_periods: int = 7,
        trend: str = "add",
        seasonal: str = "add",
    ) -> Dict:
        """Train the ETS model."""
        logger.info(f"Training ETS model with {len(data)} samples")

        if len(data) < settings.MIN_TRAINING_SAMPLES:
            raise ValueError(
                f"Insufficient data: {len(data)} < {settings.MIN_TRAINING_SAMPLES}"
            )

        series = self.prepare_data(data)

        if self._statsmodels_available:
            from statsmodels.tsa.holtwinters import ExponentialSmoothing

            try:
                # Fit ETS model
                model = ExponentialSmoothing(
                    series,
                    seasonal_periods=seasonal_periods,
                    trend=trend,
                    seasonal=seasonal,
                    initialization_method="estimated",
                )
                self.model = model.fit(optimized=True)

                # Calculate metrics
                fitted_values = self.model.fittedvalues
                residuals = series - fitted_values
                self.metrics = {
                    "aic": round(self.model.aic, 2) if hasattr(self.model, "aic") else None,
                    "sse": round(self.model.sse, 2),
                    "mae": round(np.abs(residuals).mean(), 2),
                    "rmse": round(np.sqrt((residuals**2).mean()), 2),
                }
            except Exception as e:
                logger.warning(f"ETS fitting failed: {e}, using simple model")
                self._statsmodels_available = False

        if not self._statsmodels_available:
            # Fallback: simple exponential smoothing (manual)
            alpha = 0.3
            smoothed = [float(series.iloc[0])]
            for i in range(1, len(series)):
                smoothed.append(alpha * float(series.iloc[i]) + (1 - alpha) * smoothed[-1])

            self.model = {
                "last_smoothed": smoothed[-1],
                "alpha": alpha,
                "mean": float(series.mean()),
                "std": float(series.std()),
            }
            self.metrics = {"mae": float(series.std() * 0.7), "rmse": float(series.std())}

        self.is_fitted = True
        self.last_trained = datetime.utcnow()

        logger.info(f"ETS model trained. MAE: {self.metrics.get('mae', 'N/A')}")

        return {
            "status": "success",
            "model_id": self.model_id,
            "samples": len(data),
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

        if self._statsmodels_available and hasattr(self.model, "forecast"):
            # Use ETS prediction
            forecast = self.model.forecast(steps=horizon)

            # Calculate confidence intervals (approximate)
            std_resid = np.sqrt(self.model.sse / len(self.model.fittedvalues))
            z = 1.96

            predictions = []
            base_date = datetime.utcnow()

            for i, pred in enumerate(forecast):
                pred_date = base_date + pd.Timedelta(days=i + 1)
                # Widen CI over time
                ci_width = std_resid * z * np.sqrt(i + 1)
                predictions.append({
                    "date": pred_date.strftime("%Y-%m-%d"),
                    "predicted": max(0, round(pred, 2)),
                    "lower_bound": max(0, round(pred - ci_width, 2)),
                    "upper_bound": round(pred + ci_width, 2),
                })
        else:
            # Fallback prediction
            predictions = []
            base_date = datetime.utcnow()
            last_smoothed = self.model.get("last_smoothed", self.model.get("mean", 0))
            std = self.model.get("std", 1)

            for i in range(horizon):
                pred_date = base_date + pd.Timedelta(days=i + 1)
                predictions.append({
                    "date": pred_date.strftime("%Y-%m-%d"),
                    "predicted": max(0, round(last_smoothed, 2)),
                    "lower_bound": max(0, round(last_smoothed - 1.96 * std, 2)),
                    "upper_bound": round(last_smoothed + 1.96 * std, 2),
                })

        return {
            "model_id": self.model_id,
            "model_type": "ets",
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
        self.metrics = model_data["metrics"]
        self.last_trained = model_data["last_trained"]
        self._statsmodels_available = model_data.get("statsmodels_available", self._statsmodels_available)
        self.is_fitted = True

        return True
