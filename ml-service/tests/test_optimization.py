# ml-service/tests/test_optimization.py

import pytest
import numpy as np

from app.ml.optimization import SafetyStockCalculator, EOQCalculator, ReorderPointCalculator


class TestSafetyStockCalculator:
    """Tests for Safety Stock calculator."""

    def test_standard_method(self):
        """Test standard safety stock calculation."""
        demand = [100, 110, 90, 105, 95, 100, 108, 92, 103, 97] * 10

        result = SafetyStockCalculator.calculate(
            demand_data=demand,
            lead_time_days=14,
            service_level=0.95,
            method="standard",
        )

        assert result["safety_stock"] > 0
        assert result["reorder_point"] > result["safety_stock"]
        assert result["service_level"] == 0.95

    def test_king_method(self):
        """Test King's method safety stock calculation."""
        demand = [100, 110, 90, 105, 95] * 20

        result = SafetyStockCalculator.calculate(
            demand_data=demand,
            lead_time_days=14,
            lead_time_std=3,
            service_level=0.95,
            method="king",
        )

        assert result["safety_stock"] > 0
        assert result["method"] == "king"

    def test_dynamic_method(self):
        """Test dynamic safety stock calculation."""
        demand = list(np.random.normal(100, 15, 100))

        result = SafetyStockCalculator.calculate(
            demand_data=demand,
            lead_time_days=14,
            service_level=0.95,
            method="dynamic",
        )

        assert result["safety_stock"] > 0


class TestEOQCalculator:
    """Tests for EOQ calculator."""

    def test_basic_eoq(self):
        """Test basic EOQ calculation."""
        result = EOQCalculator.calculate(
            annual_demand=10000,
            order_cost=50,
            holding_cost_rate=0.25,
            unit_cost=10,
        )

        assert result["eoq"] > 0
        assert result["orders_per_year"] > 0
        assert result["total_cost_annual"] > 0

    def test_eoq_formula(self):
        """Test EOQ formula accuracy."""
        # EOQ = sqrt(2 * D * S / H)
        # D = 10000, S = 50, H = 10 * 0.25 = 2.5
        # EOQ = sqrt(2 * 10000 * 50 / 2.5) = sqrt(400000) = 632.46

        result = EOQCalculator.calculate(
            annual_demand=10000,
            order_cost=50,
            holding_cost_rate=0.25,
            unit_cost=10,
        )

        expected_eoq = np.sqrt(2 * 10000 * 50 / 2.5)
        assert abs(result["eoq"] - expected_eoq) < 1


class TestReorderPointCalculator:
    """Tests for Reorder Point calculator."""

    def test_basic_reorder_point(self):
        """Test basic reorder point calculation."""
        result = ReorderPointCalculator.calculate(
            avg_daily_demand=100,
            lead_time_days=14,
            safety_stock=200,
        )

        # ROP = (100 * 14) + 200 = 1600
        assert result["reorder_point"] == 1600
        assert result["demand_during_lead_time"] == 1400

    def test_dynamic_reorder_point(self):
        """Test dynamic reorder point calculation."""
        demand_history = [
            {"date": f"2024-01-{i:02d}", "quantity": 100 + np.random.normal(0, 10)}
            for i in range(1, 31)
        ]

        result = ReorderPointCalculator.calculate_dynamic(
            demand_history=demand_history,
            lead_time_days=14,
            service_level=0.95,
        )

        assert result["reorder_point"] > 0
        assert result["safety_stock"] > 0
