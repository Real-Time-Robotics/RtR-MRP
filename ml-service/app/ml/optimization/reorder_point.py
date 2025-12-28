# ml-service/app/ml/optimization/reorder_point.py

import numpy as np
from scipy import stats
from typing import Dict, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ReorderPointCalculator:
    """Reorder point calculation utilities."""

    @staticmethod
    def calculate(
        avg_daily_demand: float,
        lead_time_days: float,
        safety_stock: float,
    ) -> Dict:
        """
        Calculate reorder point.

        ROP = (Average Daily Demand × Lead Time) + Safety Stock
        """
        demand_during_lead_time = avg_daily_demand * lead_time_days
        reorder_point = demand_during_lead_time + safety_stock

        return {
            "reorder_point": round(reorder_point, 0),
            "demand_during_lead_time": round(demand_during_lead_time, 0),
            "safety_stock": round(safety_stock, 0),
            "avg_daily_demand": round(avg_daily_demand, 2),
            "lead_time_days": lead_time_days,
            "calculated_at": datetime.utcnow().isoformat(),
        }

    @staticmethod
    def calculate_dynamic(
        demand_history: List[Dict],
        lead_time_days: float,
        lead_time_std: float = None,
        service_level: float = 0.95,
    ) -> Dict:
        """
        Calculate dynamic reorder point with demand variability.

        Uses probabilistic approach considering both demand and lead time variability.
        """
        if not demand_history:
            return {
                "reorder_point": 0,
                "demand_during_lead_time": 0,
                "safety_stock": 0,
                "service_level": service_level,
                "calculated_at": datetime.utcnow().isoformat(),
            }

        demands = [d.get("quantity", 0) for d in demand_history]
        avg_demand = np.mean(demands)
        std_demand = np.std(demands)

        # Z-score for service level
        z_score = stats.norm.ppf(service_level)

        # Lead time std (estimate if not provided)
        lead_time_std = lead_time_std or (lead_time_days * 0.2)

        # Combined standard deviation (considering both demand and lead time variability)
        # σ_DDLT = √(LT × σ_d² + d̄² × σ_LT²)
        demand_variance = lead_time_days * (std_demand**2)
        lead_time_variance = (avg_demand**2) * (lead_time_std**2)
        combined_std = np.sqrt(demand_variance + lead_time_variance)

        # Safety stock
        safety_stock = z_score * combined_std

        # Demand during lead time
        demand_during_lead_time = avg_demand * lead_time_days

        # Reorder point
        reorder_point = demand_during_lead_time + safety_stock

        return {
            "reorder_point": round(reorder_point, 0),
            "demand_during_lead_time": round(demand_during_lead_time, 0),
            "safety_stock": round(safety_stock, 0),
            "avg_daily_demand": round(avg_demand, 2),
            "demand_std": round(std_demand, 2),
            "lead_time_days": lead_time_days,
            "lead_time_std": round(lead_time_std, 2),
            "service_level": service_level,
            "z_score": round(z_score, 2),
            "combined_std": round(combined_std, 2),
            "calculated_at": datetime.utcnow().isoformat(),
        }

    @staticmethod
    def calculate_with_forecast(
        forecast_demand: List[Dict],
        lead_time_days: float,
        safety_stock: float,
    ) -> Dict:
        """
        Calculate reorder point using forecasted demand.

        Uses forecasted demand during lead time instead of historical average.
        """
        if not forecast_demand:
            return {
                "reorder_point": safety_stock,
                "demand_during_lead_time": 0,
                "safety_stock": safety_stock,
                "calculated_at": datetime.utcnow().isoformat(),
            }

        # Sum forecasted demand during lead time period
        lead_time_int = int(np.ceil(lead_time_days))
        forecast_during_lt = forecast_demand[:lead_time_int]
        demand_during_lead_time = sum(f.get("predicted", 0) for f in forecast_during_lt)

        # Reorder point
        reorder_point = demand_during_lead_time + safety_stock

        return {
            "reorder_point": round(reorder_point, 0),
            "demand_during_lead_time": round(demand_during_lead_time, 0),
            "safety_stock": round(safety_stock, 0),
            "lead_time_days": lead_time_days,
            "forecast_days_used": len(forecast_during_lt),
            "calculated_at": datetime.utcnow().isoformat(),
        }
