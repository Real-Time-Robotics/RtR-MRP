# ml-service/app/ml/anomaly/isolation_forest.py

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


class AnomalyDetector(BaseModel):
    """Isolation Forest-based anomaly detection model."""

    def __init__(self, model_id: str = "anomaly_detector"):
        super().__init__(model_id)
        self.model = None
        self.scaler = None
        self.contamination = 0.1
        self.feature_names: List[str] = []
        self._sklearn_available = self._check_sklearn()

    def _check_sklearn(self) -> bool:
        """Check if scikit-learn is available."""
        try:
            from sklearn.ensemble import IsolationForest
            return True
        except ImportError:
            logger.warning("scikit-learn not installed. Using fallback model.")
            return False

    def prepare_features(self, data: List[Dict]) -> pd.DataFrame:
        """Prepare features for anomaly detection."""
        df = pd.DataFrame(data)

        features = pd.DataFrame()

        # Value features
        if "quantity" in df.columns:
            features["quantity"] = df["quantity"]
        if "value" in df.columns:
            features["value"] = df["value"]

        # Time-based features
        if "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"])
            features["day_of_week"] = df["date"].dt.dayofweek
            features["day_of_month"] = df["date"].dt.day
            features["month"] = df["date"].dt.month

        # Rolling statistics
        if "quantity" in features.columns:
            features["quantity_rolling_mean"] = (
                features["quantity"].rolling(window=7, min_periods=1).mean()
            )
            features["quantity_rolling_std"] = (
                features["quantity"].rolling(window=7, min_periods=1).std().fillna(0)
            )
            features["quantity_diff"] = features["quantity"].diff().fillna(0)

        self.feature_names = features.columns.tolist()

        return features.fillna(0)

    def train(
        self,
        data: List[Dict],
        contamination: float = 0.1,
    ) -> Dict:
        """Train the anomaly detection model."""
        logger.info(f"Training anomaly detector with {len(data)} samples")

        if len(data) < settings.MIN_TRAINING_SAMPLES:
            raise ValueError(
                f"Insufficient data: {len(data)} < {settings.MIN_TRAINING_SAMPLES}"
            )

        self.contamination = contamination
        X = self.prepare_features(data)

        if self._sklearn_available:
            from sklearn.ensemble import IsolationForest
            from sklearn.preprocessing import StandardScaler

            # Scale features
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)

            # Train model
            self.model = IsolationForest(
                n_estimators=100,
                contamination=contamination,
                random_state=42,
                n_jobs=-1,
            )

            self.model.fit(X_scaled)

            # Calculate metrics
            predictions = self.model.predict(X_scaled)
            anomaly_count = int((predictions == -1).sum())

            self.metrics = {
                "contamination": contamination,
                "anomaly_count": anomaly_count,
                "anomaly_rate": round(anomaly_count / len(data) * 100, 2),
                "total_samples": len(data),
            }
        else:
            # Fallback: statistical method
            if "quantity" in X.columns:
                mean = X["quantity"].mean()
                std = X["quantity"].std()
                self.model = {
                    "mean": float(mean),
                    "std": float(std),
                    "threshold": 3,  # z-score threshold
                }
                anomaly_count = int(((X["quantity"] - mean).abs() > 3 * std).sum())
            else:
                self.model = {"mean": 0, "std": 1, "threshold": 3}
                anomaly_count = 0

            self.scaler = None
            self.metrics = {
                "contamination": contamination,
                "anomaly_count": anomaly_count,
                "total_samples": len(data),
            }

        self.is_fitted = True
        self.last_trained = datetime.utcnow()

        logger.info(
            f"Anomaly detector trained. Found {self.metrics['anomaly_count']} anomalies"
        )

        return {
            "status": "success",
            "model_id": self.model_id,
            "samples": len(data),
            "metrics": self.metrics,
            "trained_at": self.last_trained.isoformat(),
        }

    def predict(self, data: List[Dict]) -> Dict:
        """Detect anomalies in data."""
        if not self.is_fitted:
            raise ValueError("Model not trained")

        X = self.prepare_features(data)
        results = []

        if self._sklearn_available and self.scaler is not None:
            X_scaled = self.scaler.transform(X)

            # Predict
            predictions = self.model.predict(X_scaled)
            scores = self.model.decision_function(X_scaled)

            for i, (pred, score) in enumerate(zip(predictions, scores)):
                is_anomaly = pred == -1
                results.append({
                    "date": data[i].get("date", str(i)),
                    "value": float(data[i].get("quantity", data[i].get("value", 0))),
                    "is_anomaly": bool(is_anomaly),
                    "anomaly_score": round(float(-score), 4),  # Higher = more anomalous
                })
        else:
            # Fallback: z-score method
            mean = self.model.get("mean", 0)
            std = self.model.get("std", 1)
            threshold = self.model.get("threshold", 3)

            for i, row in enumerate(data):
                value = float(row.get("quantity", row.get("value", 0)))
                z_score = (value - mean) / std if std > 0 else 0
                is_anomaly = abs(z_score) > threshold

                results.append({
                    "date": row.get("date", str(i)),
                    "value": value,
                    "is_anomaly": bool(is_anomaly),
                    "anomaly_score": round(abs(z_score), 4),
                })

        anomaly_count = sum(1 for r in results if r["is_anomaly"])

        return {
            "part_id": data[0].get("part_id", "unknown") if data else "unknown",
            "anomalies": results,
            "anomaly_count": anomaly_count,
            "total_records": len(data),
            "contamination": self.contamination,
            "analyzed_at": datetime.utcnow().isoformat(),
        }

    def save(self, path: str = None) -> str:
        """Save model to disk."""
        path = path or os.path.join(settings.MODEL_DIR, f"{self.model_id}.pkl")
        os.makedirs(os.path.dirname(path), exist_ok=True)

        model_data = {
            "model": self.model,
            "scaler": self.scaler,
            "contamination": self.contamination,
            "feature_names": self.feature_names,
            "metrics": self.metrics,
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
        self.contamination = model_data["contamination"]
        self.feature_names = model_data["feature_names"]
        self.metrics = model_data["metrics"]
        self.last_trained = model_data["last_trained"]
        self._sklearn_available = model_data.get("sklearn_available", self._sklearn_available)
        self.is_fitted = True

        return True
