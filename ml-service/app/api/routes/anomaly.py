# ml-service/app/api/routes/anomaly.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime
import numpy as np

from app.ml.anomaly import AnomalyDetector
from app.core.database import get_inventory_transactions

router = APIRouter()


class AnomalyDetectionInput(BaseModel):
    part_id: str
    lookback_days: int = Field(90, ge=7, le=365)
    contamination: float = Field(0.1, ge=0.01, le=0.5)


@router.post("/detect")
async def detect_anomalies(input: AnomalyDetectionInput):
    """
    Detect anomalies in inventory transactions.

    Uses Isolation Forest algorithm to identify unusual patterns.
    """
    try:
        # Get historical data
        data = await get_inventory_transactions(input.part_id, input.lookback_days)

        if not data:
            # Generate synthetic data for demo
            data = _generate_synthetic_transaction_data(input.lookback_days)

        # Create and train detector
        detector = AnomalyDetector(f"anomaly_{input.part_id}")
        detector.train(data, contamination=input.contamination)

        # Detect anomalies
        result = detector.predict(data)
        result["part_id"] = input.part_id

        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")


@router.post("/detect/batch")
async def detect_anomalies_batch(
    part_ids: List[str],
    lookback_days: int = 90,
    contamination: float = 0.1,
):
    """Detect anomalies for multiple parts."""
    results = []

    for part_id in part_ids:
        try:
            data = await get_inventory_transactions(part_id, lookback_days)
            if not data:
                data = _generate_synthetic_transaction_data(lookback_days)

            detector = AnomalyDetector(f"anomaly_{part_id}")
            detector.train(data, contamination=contamination)
            result = detector.predict(data)

            results.append({
                "part_id": part_id,
                "status": "success",
                "anomaly_count": result["anomaly_count"],
                "total_records": result["total_records"],
            })
        except Exception as e:
            results.append({
                "part_id": part_id,
                "status": "failed",
                "error": str(e),
            })

    return {
        "total": len(part_ids),
        "results": results,
        "analyzed_at": datetime.utcnow().isoformat(),
    }


def _generate_synthetic_transaction_data(days: int) -> List[dict]:
    """Generate synthetic transaction data for demo."""
    from datetime import timedelta

    base_date = datetime.utcnow() - timedelta(days=days)
    data = []

    for i in range(days):
        date = base_date + timedelta(days=i)
        # Normal transactions
        quantity = max(0, np.random.normal(50, 10))

        # Add some anomalies (5% chance)
        if np.random.random() < 0.05:
            quantity = np.random.choice([quantity * 3, quantity * 0.1])

        data.append({
            "date": date.strftime("%Y-%m-%d"),
            "quantity": round(quantity, 2),
            "transactionType": np.random.choice(["receipt", "issue", "adjustment"]),
        })

    return data
