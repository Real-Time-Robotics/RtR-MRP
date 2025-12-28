# ml-service/app/ml/prediction/leadtime.py

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


class LeadTimePredictor(BaseModel):
    """Gradient Boosting-based lead time prediction model."""

    def __init__(self, model_id: str = "leadtime_predictor"):
        super().__init__(model_id)
        self.model = None
        self.scaler = None
        self.feature_names: List[str] = []
        self.feature_importance: Dict[str, float] = {}
        self._sklearn_available = self._check_sklearn()

    def _check_sklearn(self) -> bool:
        """Check if scikit-learn is available."""
        try:
            from sklearn.ensemble import GradientBoostingRegressor
            from sklearn.preprocessing import StandardScaler
            return True
        except ImportError:
            logger.warning("scikit-learn not installed. Using fallback model.")
            return False

    def prepare_features(self, data: List[Dict]) -> pd.DataFrame:
        """Prepare features for lead time prediction."""
        df = pd.DataFrame(data)

        # Feature engineering
        features = pd.DataFrame()

        # Time-based features
        if "orderDate" in df.columns:
            df["order_date"] = pd.to_datetime(df["orderDate"])
            features["day_of_week"] = df["order_date"].dt.dayofweek
            features["month"] = df["order_date"].dt.month
            features["quarter"] = df["order_date"].dt.quarter
            features["is_month_end"] = df["order_date"].dt.is_month_end.astype(int)
        else:
            features["day_of_week"] = 0
            features["month"] = 1
            features["quarter"] = 1
            features["is_month_end"] = 0

        # Order-based features
        features["order_value"] = df.get("orderValue", pd.Series([0] * len(df)))
        features["line_count"] = df.get("lineCount", pd.Series([1] * len(df)))
        features["total_quantity"] = df.get("totalQuantity", pd.Series([1] * len(df)))

        # Supplier historical performance
        features["avg_historical_leadtime"] = df.get(
            "avgHistoricalLeadtime", pd.Series([14] * len(df))
        )
        features["leadtime_std"] = df.get("leadtimeStd", pd.Series([3] * len(df)))
        features["on_time_rate"] = df.get("onTimeRate", pd.Series([0.9] * len(df)))

        # Part characteristics
        features["is_critical"] = df.get("isCritical", pd.Series([0] * len(df))).astype(int)
        features["part_category_encoded"] = df.get(
            "partCategoryEncoded", pd.Series([0] * len(df))
        )

        self.feature_names = features.columns.tolist()

        return features

    def train(self, data: List[Dict]) -> Dict:
        """Train the lead time prediction model."""
        logger.info(f"Training lead time model with {len(data)} samples")

        if len(data) < settings.MIN_TRAINING_SAMPLES:
            raise ValueError(
                f"Insufficient data: {len(data)} < {settings.MIN_TRAINING_SAMPLES}"
            )

        # Prepare features
        X = self.prepare_features(data)
        y = pd.Series([d.get("actual_lead_time", d.get("expected_lead_time", 14)) for d in data])

        # Remove NaN
        mask = ~(X.isna().any(axis=1) | y.isna())
        X = X[mask]
        y = y[mask]

        if self._sklearn_available:
            from sklearn.ensemble import GradientBoostingRegressor
            from sklearn.preprocessing import StandardScaler
            from sklearn.model_selection import train_test_split

            # Scale features
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)

            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y, test_size=0.2, random_state=42
            )

            # Train model
            self.model = GradientBoostingRegressor(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                min_samples_split=5,
                random_state=42,
            )

            self.model.fit(X_train, y_train)

            # Calculate metrics
            y_pred = self.model.predict(X_test)
            self.metrics = {
                "mae": round(np.mean(np.abs(y_test - y_pred)), 2),
                "rmse": round(np.sqrt(np.mean((y_test - y_pred) ** 2)), 2),
                "r2": round(self.model.score(X_test, y_test), 3),
                "mape": round(
                    np.mean(np.abs((y_test - y_pred) / np.maximum(y_test, 1))) * 100, 2
                ),
            }

            # Feature importance
            self.feature_importance = dict(
                zip(self.feature_names, self.model.feature_importances_)
            )
        else:
            # Fallback: simple model based on historical average
            self.model = {
                "mean": float(y.mean()),
                "std": float(y.std()),
                "median": float(y.median()),
            }
            self.scaler = None
            self.metrics = {"mae": float(y.std() * 0.8), "rmse": float(y.std())}
            self.feature_importance = {}

        self.is_fitted = True
        self.last_trained = datetime.utcnow()

        logger.info(f"Lead time model trained. MAE: {self.metrics['mae']} days")

        return {
            "status": "success",
            "model_id": self.model_id,
            "samples": len(data),
            "metrics": self.metrics,
            "feature_importance": self.feature_importance,
            "trained_at": self.last_trained.isoformat(),
        }

    def predict(self, data: Dict) -> Dict:
        """Predict lead time for a new order."""
        if not self.is_fitted:
            raise ValueError("Model not trained")

        # Prepare features
        X = self.prepare_features([data])

        if self._sklearn_available and self.scaler is not None:
            X_scaled = self.scaler.transform(X)

            # Predict
            prediction = float(self.model.predict(X_scaled)[0])

            # Calculate confidence interval (using training RMSE)
            rmse = self.metrics.get("rmse", 3)
            lower_bound = max(1, prediction - 1.96 * rmse)
            upper_bound = prediction + 1.96 * rmse
        else:
            # Fallback prediction
            prediction = self.model.get("mean", 14)
            std = self.model.get("std", 3)
            lower_bound = max(1, prediction - 1.96 * std)
            upper_bound = prediction + 1.96 * std

        return {
            "predicted_days": round(prediction, 1),
            "lower_bound": round(lower_bound, 1),
            "upper_bound": round(upper_bound, 1),
            "confidence": 0.95,
            "model_metrics": self.metrics,
            "factors": {
                name: round(importance, 4)
                for name, importance in sorted(
                    self.feature_importance.items(),
                    key=lambda x: x[1],
                    reverse=True,
                )[:5]
            },
        }

    def save(self, path: str = None) -> str:
        """Save model to disk."""
        path = path or os.path.join(settings.MODEL_DIR, f"{self.model_id}.pkl")
        os.makedirs(os.path.dirname(path), exist_ok=True)

        model_data = {
            "model": self.model,
            "scaler": self.scaler,
            "feature_names": self.feature_names,
            "metrics": self.metrics,
            "feature_importance": self.feature_importance,
            "last_trained": self.last_trained,
            "sklearn_available": self._sklearn_available,
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
        self.scaler = model_data["scaler"]
        self.feature_names = model_data["feature_names"]
        self.metrics = model_data["metrics"]
        self.feature_importance = model_data.get("feature_importance", {})
        self.last_trained = model_data["last_trained"]
        self._sklearn_available = model_data.get("sklearn_available", self._sklearn_available)
        self.is_fitted = True

        return True
