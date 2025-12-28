# ml-service/app/ml/optimization/eoq.py

import numpy as np
from typing import Dict, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class EOQCalculator:
    """Economic Order Quantity (EOQ) calculator."""

    @staticmethod
    def calculate(
        annual_demand: float,
        order_cost: float,
        holding_cost_rate: float,
        unit_cost: float,
    ) -> Dict:
        """
        Calculate Economic Order Quantity (EOQ).

        Args:
            annual_demand: Annual demand in units
            order_cost: Cost per order (setup, shipping, etc.)
            holding_cost_rate: Annual holding cost as % of unit cost
            unit_cost: Cost per unit
        """
        # Handle edge cases
        if annual_demand <= 0 or order_cost <= 0 or holding_cost_rate <= 0 or unit_cost <= 0:
            return {
                "eoq": 0,
                "orders_per_year": 0,
                "days_between_orders": 0,
                "ordering_cost_annual": 0,
                "holding_cost_annual": 0,
                "total_cost_annual": 0,
                "calculated_at": datetime.utcnow().isoformat(),
            }

        holding_cost = unit_cost * holding_cost_rate

        # EOQ formula: √(2DS/H)
        eoq = float(np.sqrt((2 * annual_demand * order_cost) / holding_cost))

        # Number of orders per year
        orders_per_year = annual_demand / eoq if eoq > 0 else 0

        # Total cost
        ordering_cost = orders_per_year * order_cost
        holding_cost_total = (eoq / 2) * holding_cost
        total_cost = ordering_cost + holding_cost_total

        # Time between orders (days)
        days_between_orders = 365 / orders_per_year if orders_per_year > 0 else 0

        return {
            "eoq": round(eoq, 0),
            "orders_per_year": round(orders_per_year, 1),
            "days_between_orders": round(days_between_orders, 1),
            "ordering_cost_annual": round(ordering_cost, 2),
            "holding_cost_annual": round(holding_cost_total, 2),
            "total_cost_annual": round(total_cost, 2),
            "calculated_at": datetime.utcnow().isoformat(),
        }

    @staticmethod
    def calculate_for_part(
        demand_history: List[Dict],
        unit_cost: float,
        order_cost: float = 50.0,
        holding_cost_rate: float = 0.25,
    ) -> Dict:
        """Calculate EOQ for a specific part."""
        # Calculate annual demand from history
        if not demand_history:
            return EOQCalculator.calculate(0, order_cost, holding_cost_rate, unit_cost)

        daily_demands = [d.get("quantity", 0) for d in demand_history]
        avg_daily = np.mean(daily_demands) if daily_demands else 0
        annual_demand = avg_daily * 365

        return EOQCalculator.calculate(
            annual_demand=annual_demand,
            order_cost=order_cost,
            holding_cost_rate=holding_cost_rate,
            unit_cost=unit_cost,
        )

    @staticmethod
    def calculate_with_quantity_discount(
        annual_demand: float,
        order_cost: float,
        holding_cost_rate: float,
        price_breaks: List[Dict],  # [{"min_qty": 0, "unit_cost": 10}, ...]
    ) -> Dict:
        """
        Calculate EOQ with quantity discounts.

        Returns the order quantity that minimizes total cost including discounts.
        """
        best_result = None
        best_total_cost = float("inf")

        for i, price_break in enumerate(sorted(price_breaks, key=lambda x: x["min_qty"])):
            min_qty = price_break["min_qty"]
            unit_cost = price_break["unit_cost"]

            # Calculate EOQ for this price
            eoq_result = EOQCalculator.calculate(
                annual_demand=annual_demand,
                order_cost=order_cost,
                holding_cost_rate=holding_cost_rate,
                unit_cost=unit_cost,
            )

            eoq = eoq_result["eoq"]

            # Check if EOQ is valid for this price break
            next_break = (
                price_breaks[i + 1]["min_qty"]
                if i + 1 < len(price_breaks)
                else float("inf")
            )

            if eoq < min_qty:
                # Use minimum quantity for this price break
                order_qty = min_qty
            elif eoq >= next_break:
                # EOQ falls into next price break
                continue
            else:
                order_qty = eoq

            # Calculate total cost for this scenario
            orders_per_year = annual_demand / order_qty if order_qty > 0 else 0
            ordering_cost = orders_per_year * order_cost
            holding_cost = (order_qty / 2) * unit_cost * holding_cost_rate
            purchase_cost = annual_demand * unit_cost
            total_cost = ordering_cost + holding_cost + purchase_cost

            if total_cost < best_total_cost:
                best_total_cost = total_cost
                best_result = {
                    "eoq": round(order_qty, 0),
                    "unit_cost": unit_cost,
                    "orders_per_year": round(orders_per_year, 1),
                    "days_between_orders": round(365 / orders_per_year, 1) if orders_per_year > 0 else 0,
                    "ordering_cost_annual": round(ordering_cost, 2),
                    "holding_cost_annual": round(holding_cost, 2),
                    "purchase_cost_annual": round(purchase_cost, 2),
                    "total_cost_annual": round(total_cost, 2),
                    "price_break_applied": min_qty,
                    "calculated_at": datetime.utcnow().isoformat(),
                }

        return best_result or EOQCalculator.calculate(
            annual_demand, order_cost, holding_cost_rate, price_breaks[0]["unit_cost"]
        )
