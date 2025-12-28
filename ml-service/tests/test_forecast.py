# ml-service/tests/test_forecast.py

import pytest
from datetime import datetime, timedelta
import numpy as np

from app.ml.forecasting import ProphetForecaster, ARIMAForecaster, ETSForecaster, EnsembleForecaster


def generate_test_data(days: int = 100) -> list:
    """Generate synthetic test data."""
    base_date = datetime.utcnow() - timedelta(days=days)
    data = []

    for i in range(days):
        date = base_date + timedelta(days=i)
        base = 100
        seasonal = 20 * np.sin(2 * np.pi * i / 30)
        noise = np.random.normal(0, 5)
        quantity = max(0, base + seasonal + noise)

        data.append({
            "date": date.strftime("%Y-%m-%d"),
            "quantity": round(quantity, 2),
        })

    return data


class TestProphetForecaster:
    """Tests for Prophet forecaster."""

    def test_train(self):
        """Test model training."""
        model = ProphetForecaster("test_prophet")
        data = generate_test_data(100)

        result = model.train(data)

        assert result["status"] == "success"
        assert model.is_fitted

    def test_predict(self):
        """Test prediction generation."""
        model = ProphetForecaster("test_prophet")
        data = generate_test_data(100)
        model.train(data)

        result = model.predict(horizon_days=30)

        assert len(result["predictions"]) == 30
        assert all(p["predicted"] >= 0 for p in result["predictions"])


class TestARIMAForecaster:
    """Tests for ARIMA forecaster."""

    def test_train(self):
        """Test model training."""
        model = ARIMAForecaster("test_arima")
        data = generate_test_data(100)

        result = model.train(data)

        assert result["status"] == "success"
        assert model.is_fitted

    def test_predict(self):
        """Test prediction generation."""
        model = ARIMAForecaster("test_arima")
        data = generate_test_data(100)
        model.train(data)

        result = model.predict(horizon_days=30)

        assert len(result["predictions"]) == 30


class TestETSForecaster:
    """Tests for ETS forecaster."""

    def test_train(self):
        """Test model training."""
        model = ETSForecaster("test_ets")
        data = generate_test_data(100)

        result = model.train(data)

        assert result["status"] == "success"
        assert model.is_fitted


class TestEnsembleForecaster:
    """Tests for Ensemble forecaster."""

    def test_train(self):
        """Test ensemble training."""
        model = EnsembleForecaster("test_ensemble")
        data = generate_test_data(100)

        result = model.train(data)

        assert result["status"] == "success"
        assert model.is_fitted
        assert len(model.models) > 0

    def test_predict(self):
        """Test ensemble prediction."""
        model = EnsembleForecaster("test_ensemble")
        data = generate_test_data(100)
        model.train(data)

        result = model.predict(horizon_days=30)

        assert len(result["predictions"]) == 30
        assert "model_weights" in result
