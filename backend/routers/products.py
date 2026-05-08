"""Products router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
import uuid
from database import get_db

router = APIRouter()

class ProductCreate(BaseModel):
    name: str
    category: str
    price: float
    cost: float
    stock_quantity: int = 0
    shelf_life_days: int = 365
    weight_kg: float = 0

@router.get("/")
async def list_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT p.id::text, p.name, p.category, 
               CAST(p.price AS FLOAT), CAST(p.cost AS FLOAT),
               p.stock_quantity, p.shelf_life_days, p.is_active,
               COALESCE(SUM(ti.quantity), 0) as total_sold,
               CASE WHEN COUNT(DISTINCT DATE(t.transaction_date)) > 0 
                    THEN SUM(ti.quantity)::FLOAT / COUNT(DISTINCT DATE(t.transaction_date))
                    ELSE 0 END as daily_velocity,
               sz.name as current_zone
        FROM products p
        LEFT JOIN transaction_items ti ON p.id = ti.product_id
        LEFT JOIN transactions t ON ti.transaction_id = t.id
        LEFT JOIN product_placements pp ON p.id = pp.product_id AND pp.is_current = TRUE
        LEFT JOIN store_zones sz ON pp.zone_id = sz.id
        WHERE p.is_active = TRUE
        GROUP BY p.id, p.name, p.category, p.price, p.cost, p.stock_quantity, p.shelf_life_days, p.is_active, sz.name
        ORDER BY total_sold DESC
    """))
    rows = result.fetchall()
    return [
        {
            "id": r[0], "name": r[1], "category": r[2], "price": r[3], "cost": r[4],
            "stock_quantity": r[5], "shelf_life_days": r[6], "is_active": r[7],
            "total_sold": r[8], "daily_velocity": round(r[9], 2),
            "margin_pct": round((r[3]-r[4])/r[3]*100, 1) if r[3] > 0 else 0,
            "current_zone": r[10]
        }
        for r in rows
    ]

@router.post("/")
async def create_product(product: ProductCreate, db: AsyncSession = Depends(get_db)):
    pid = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO products (id, name, category, price, cost, stock_quantity, shelf_life_days, weight_kg)
        VALUES (:id::uuid, :name, :category, :price, :cost, :stock, :shelf, :weight)
    """), {"id": pid, "name": product.name, "category": product.category,
           "price": product.price, "cost": product.cost,
           "stock": product.stock_quantity, "shelf": product.shelf_life_days,
           "weight": product.weight_kg})
    await db.commit()
    return {"id": pid, **product.dict()}

@router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT DISTINCT category FROM products WHERE is_active = TRUE ORDER BY category"))
    return [r[0] for r in result.fetchall()]
