# ml-service/app/core/database.py

from databases import Database
from sqlalchemy import create_engine, MetaData
from app.config import settings
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Database instance
database = Database(settings.DATABASE_URL)

# SQLAlchemy engine for schema operations
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=5,
    max_overflow=10,
)

metadata = MetaData()


# Helper functions
async def get_historical_demand(part_id: str, days: int = 365) -> List[Dict[str, Any]]:
    """Get historical demand data for a part."""
    query = """
        SELECT
            DATE(so."orderDate") as date,
            COALESCE(SUM(sol.quantity), 0) as quantity
        FROM "SalesOrderLine" sol
        JOIN "SalesOrder" so ON sol."salesOrderId" = so.id
        JOIN "Product" p ON sol."productId" = p.id
        JOIN "BOMLine" bl ON bl."productId" = p.id
        WHERE bl."partId" = :part_id
            AND so."orderDate" >= NOW() - INTERVAL :days
            AND so.status NOT IN ('cancelled')
        GROUP BY DATE(so."orderDate")
        ORDER BY date
    """
    try:
        rows = await database.fetch_all(
            query, {"part_id": part_id, "days": f"{days} days"}
        )
        return [{"date": row["date"], "quantity": float(row["quantity"])} for row in rows]
    except Exception as e:
        logger.warning(f"Error fetching demand data: {e}")
        return []


async def get_supplier_lead_times(supplier_id: str) -> List[Dict[str, Any]]:
    """Get historical lead time data for a supplier."""
    query = """
        SELECT
            po.id,
            po."orderDate",
            po."expectedDate",
            po."receivedDate",
            EXTRACT(DAY FROM (COALESCE(po."receivedDate", po."expectedDate") - po."orderDate")) as actual_lead_time,
            EXTRACT(DAY FROM (po."expectedDate" - po."orderDate")) as expected_lead_time
        FROM "PurchaseOrder" po
        WHERE po."supplierId" = :supplier_id
            AND po.status IN ('received', 'completed')
        ORDER BY po."orderDate" DESC
        LIMIT 100
    """
    try:
        rows = await database.fetch_all(query, {"supplier_id": supplier_id})
        return [dict(row) for row in rows]
    except Exception as e:
        logger.warning(f"Error fetching lead time data: {e}")
        return []


async def get_inventory_transactions(part_id: str, days: int = 365) -> List[Dict[str, Any]]:
    """Get inventory transaction history."""
    query = """
        SELECT
            DATE(lt."createdAt") as date,
            lt."transactionType",
            lt.quantity
        FROM "LotTransaction" lt
        WHERE lt."partId" = :part_id
            AND lt."createdAt" >= NOW() - INTERVAL :days
        ORDER BY lt."createdAt"
    """
    try:
        rows = await database.fetch_all(
            query, {"part_id": part_id, "days": f"{days} days"}
        )
        return [dict(row) for row in rows]
    except Exception as e:
        logger.warning(f"Error fetching inventory transactions: {e}")
        return []


async def get_part_info(part_id: str) -> Dict[str, Any]:
    """Get part information."""
    query = """
        SELECT
            p.id,
            p.name,
            p."partNumber",
            p."unitCost",
            p."safetyStock",
            p."reorderPoint",
            p."leadTimeDays",
            c.name as category
        FROM "Part" p
        LEFT JOIN "Category" c ON p."categoryId" = c.id
        WHERE p.id = :part_id
    """
    try:
        row = await database.fetch_one(query, {"part_id": part_id})
        return dict(row) if row else {}
    except Exception as e:
        logger.warning(f"Error fetching part info: {e}")
        return {}


async def get_supplier_info(supplier_id: str) -> Dict[str, Any]:
    """Get supplier information."""
    query = """
        SELECT
            s.id,
            s.name,
            s."leadTimeDays",
            s."onTimeDeliveryRate",
            s."qualityRating"
        FROM "Supplier" s
        WHERE s.id = :supplier_id
    """
    try:
        row = await database.fetch_one(query, {"supplier_id": supplier_id})
        return dict(row) if row else {}
    except Exception as e:
        logger.warning(f"Error fetching supplier info: {e}")
        return {}
