# ml-service/app/services/optimization_service.py

from typing import Dict, List, Optional
from datetime import datetime
import logging
import numpy as np

from app.ml.optimization import SafetyStockCalculator, EOQCalculator, ReorderPointCalculator
from app.core.database import get_historical_demand, get_part_info
from app.config import settings

logger = logging.getLogger(__name__)


class OptimizationService:
    """Service for inventory optimization operations."""

    async def calculate_safety_stock(
        self,
        part_id: str,
        service_level: float = 0.95,
        lead_time_days: Optional[float] = None,
        method: str = "king",
    ) -> Dict:
        """Calculate optimal safety stock for a part."""
        # Get historical demand
        demand_history = await get_historical_demand(part_id, days=365)

        if not demand_history:
            # Generate synthetic data for demo
            demand_history = self._generate_synthetic_demand(365)

        # Get part info for lead time
        part_info = await get_part_info(part_id)
        lead_time = lead_time_days or part_info.get("leadTimeDays", 14)
        lead_time_std = lead_time * 0.2  # Estimate 20% variability

        # Calculate safety stock
        result = SafetyStockCalculator.calculate_for_part(
            demand_history=demand_history,
            lead_time_days=lead_time,
            lead_time_std=lead_time_std,
            service_level=service_level,
            method=method,
        )

        return {
            "part_id": part_id,
            "part_name": part_info.get("name", "Unknown"),
            **result,
        }

    async def calculate_eoq(
        self,
        part_id: str,
        order_cost: float,
        holding_cost_rate: float = 0.25,
    ) -> Dict:
        """Calculate Economic Order Quantity for a part."""
        # Get historical demand
        demand_history = await get_historical_demand(part_id, days=365)

        if not demand_history:
            demand_history = self._generate_synthetic_demand(365)

        # Get part info for unit cost
        part_info = await get_part_info(part_id)
        unit_cost = part_info.get("unitCost", 10.0)

        # Calculate EOQ
        result = EOQCalculator.calculate_for_part(
            demand_history=demand_history,
            unit_cost=unit_cost,
            order_cost=order_cost,
            holding_cost_rate=holding_cost_rate,
        )

        return {
            "part_id": part_id,
            "part_name": part_info.get("name", "Unknown"),
            "unit_cost": unit_cost,
            **result,
        }

    async def optimize_inventory(
        self,
        part_id: str,
        service_level: float = 0.95,
        order_cost: float = 50.0,
        holding_cost_rate: float = 0.25,
    ) -> Dict:
        """Complete inventory optimization for a part."""
        # Get historical demand
        demand_history = await get_historical_demand(part_id, days=365)

        if not demand_history:
            demand_history = self._generate_synthetic_demand(365)

        # Get part info
        part_info = await get_part_info(part_id)
        unit_cost = part_info.get("unitCost", 10.0)
        lead_time = part_info.get("leadTimeDays", 14)
        lead_time_std = lead_time * 0.2

        demand_values = [d.get("quantity", 0) for d in demand_history]

        # Safety stock
        ss_result = SafetyStockCalculator.calculate(
            demand_data=demand_values,
            lead_time_days=lead_time,
            lead_time_std=lead_time_std,
            service_level=service_level,
            method="king",
        )

        # EOQ
        annual_demand = np.mean(demand_values) * 365 if demand_values else 0
        eoq_result = EOQCalculator.calculate(
            annual_demand=annual_demand,
            order_cost=order_cost,
            holding_cost_rate=holding_cost_rate,
            unit_cost=unit_cost,
        )

        # Reorder point
        rop_result = ReorderPointCalculator.calculate_dynamic(
            demand_history=demand_history,
            lead_time_days=lead_time,
            lead_time_std=lead_time_std,
            service_level=service_level,
        )

        # Recommendations
        recommendations = {
            "optimal_order_quantity": eoq_result["eoq"],
            "reorder_point": ss_result["reorder_point"],
            "safety_stock": ss_result["safety_stock"],
            "max_inventory": eoq_result["eoq"] + ss_result["safety_stock"],
            "expected_annual_cost": eoq_result["total_cost_annual"],
            "orders_per_year": eoq_result["orders_per_year"],
            "average_inventory": eoq_result["eoq"] / 2 + ss_result["safety_stock"],
        }

        return {
            "part_id": part_id,
            "part_name": part_info.get("name", "Unknown"),
            "safety_stock": ss_result,
            "eoq": eoq_result,
            "reorder_point": rop_result,
            "recommendations": recommendations,
            "calculated_at": datetime.utcnow().isoformat(),
        }

    async def batch_optimize(
        self,
        part_ids: List[str],
        service_level: float = 0.95,
    ) -> Dict:
        """Optimize inventory for multiple parts."""
        results = []

        for part_id in part_ids:
            try:
                result = await self.optimize_inventory(
                    part_id=part_id,
                    service_level=service_level,
                )
                results.append({
                    "part_id": part_id,
                    "status": "success",
                    "recommendations": result["recommendations"],
                })
            except Exception as e:
                logger.error(f"Optimization failed for {part_id}: {e}")
                results.append({
                    "part_id": part_id,
                    "status": "failed",
                    "error": str(e),
                })

        return {
            "total": len(part_ids),
            "successful": sum(1 for r in results if r["status"] == "success"),
            "failed": sum(1 for r in results if r["status"] == "failed"),
            "results": results,
            "calculated_at": datetime.utcnow().isoformat(),
        }

    def _generate_synthetic_demand(self, days: int) -> List[Dict]:
        """Generate synthetic demand data."""
        from datetime import timedelta

        base_date = datetime.utcnow() - timedelta(days=days)
        data = []

        for i in range(days):
            date = base_date + timedelta(days=i)
            base = 50
            seasonal = 15 * np.sin(2 * np.pi * i / 365)
            noise = np.random.normal(0, 8)
            quantity = max(0, base + seasonal + noise)

            data.append({
                "date": date.strftime("%Y-%m-%d"),
                "quantity": round(quantity, 2),
            })

        return data


optimization_service = OptimizationService()
