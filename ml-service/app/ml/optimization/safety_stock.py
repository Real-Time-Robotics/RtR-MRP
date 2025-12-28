# ml-service/app/ml/optimization/safety_stock.py

import numpy as np
from scipy import stats
from typing import Dict, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class SafetyStockCalculator:
    """Safety stock calculation using statistical methods."""

    @staticmethod
    def calculate(
        demand_data: List[float],
        lead_time_days: float,
        lead_time_std: float = None,
        service_level: float = 0.95,
        method: str = "standard",
    ) -> Dict:
        """
        Calculate safety stock using various methods.

        Args:
            demand_data: Historical daily demand
            lead_time_days: Average lead time in days
            lead_time_std: Standard deviation of lead time
            service_level: Desired service level (0-1)
            method: Calculation method (standard, king, dynamic)
        """
        demand = np.array(demand_data)

        # Handle empty or insufficient data
        if len(demand) == 0:
            return {
                "safety_stock": 0,
                "reorder_point": 0,
                "average_daily_demand": 0,
                "demand_std_dev": 0,
                "service_level": service_level,
                "z_score": 0,
                "lead_time_days": lead_time_days,
                "days_of_supply": 0,
                "method": method,
                "calculated_at": datetime.utcnow().isoformat(),
            }

        # Calculate statistics
        avg_demand = float(np.mean(demand))
        std_demand = float(np.std(demand))

        # Z-score for service level
        z_score = float(stats.norm.ppf(service_level))

        if method == "standard":
            # Standard formula: SS = Z × σ × √LT
            safety_stock = z_score * std_demand * np.sqrt(lead_time_days)

        elif method == "king":
            # King's method (considers lead time variability)
            lead_time_std = lead_time_std or (lead_time_days * 0.2)

            demand_variance = lead_time_days * (std_demand**2)
            lead_time_variance = (avg_demand**2) * (lead_time_std**2)

            combined_std = np.sqrt(demand_variance + lead_time_variance)
            safety_stock = z_score * combined_std

        elif method == "dynamic":
            # Dynamic method with seasonality consideration
            # Use rolling statistics
            window = min(30, len(demand))
            rolling_std = float(np.std(demand[-window:]))

            safety_stock = z_score * rolling_std * np.sqrt(lead_time_days)

            # Add buffer for uncertainty
            safety_stock *= 1.1

        else:
            raise ValueError(f"Unknown method: {method}")

        safety_stock = float(safety_stock)

        # Calculate related metrics
        reorder_point = (avg_demand * lead_time_days) + safety_stock

        # Days of supply
        days_of_supply = safety_stock / avg_demand if avg_demand > 0 else 0

        return {
            "safety_stock": round(safety_stock, 0),
            "reorder_point": round(reorder_point, 0),
            "average_daily_demand": round(avg_demand, 2),
            "demand_std_dev": round(std_demand, 2),
            "service_level": service_level,
            "z_score": round(z_score, 2),
            "lead_time_days": lead_time_days,
            "days_of_supply": round(days_of_supply, 1),
            "method": method,
            "calculated_at": datetime.utcnow().isoformat(),
        }

    @staticmethod
    def calculate_for_part(
        demand_history: List[Dict],
        lead_time_days: float,
        lead_time_std: float = None,
        service_level: float = 0.95,
        method: str = "king",
    ) -> Dict:
        """Calculate safety stock for a specific part."""
        # Extract demand values
        demand_data = [d.get("quantity", 0) for d in demand_history]

        return SafetyStockCalculator.calculate(
            demand_data=demand_data,
            lead_time_days=lead_time_days,
            lead_time_std=lead_time_std,
            service_level=service_level,
            method=method,
        )
