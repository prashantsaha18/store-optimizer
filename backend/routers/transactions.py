"""Transactions router"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import List
import uuid
from database import get_db

router = APIRouter()

class TransactionItemIn(BaseModel):
    product_id: str
    quantity: int
    unit_price: float

class TransactionCreate(BaseModel):
    items: List[TransactionItemIn]
    notes: str = ""

@router.post("/")
async def create_transaction(txn: TransactionCreate, db: AsyncSession = Depends(get_db)):
    txn_id = str(uuid.uuid4())
    total  = sum(i.quantity * i.unit_price for i in txn.items)
    
    await db.execute(text("""
        INSERT INTO transactions (id, total_amount, notes)
        VALUES (:id::uuid, :total, :notes)
    """), {"id": txn_id, "total": total, "notes": txn.notes})
    
    for item in txn.items:
        await db.execute(text("""
            INSERT INTO transaction_items (id, transaction_id, product_id, quantity, unit_price)
            VALUES (:id::uuid, :txn_id::uuid, :pid::uuid, :qty, :price)
        """), {"id": str(uuid.uuid4()), "txn_id": txn_id,
               "pid": item.product_id, "qty": item.quantity, "price": item.unit_price})
        
        # Update stock
        await db.execute(text("""
            UPDATE products SET stock_quantity = stock_quantity - :qty WHERE id = :pid::uuid
        """), {"qty": item.quantity, "pid": item.product_id})
    
    await db.commit()
    return {"id": txn_id, "total": total, "items_count": len(txn.items)}

@router.get("/recent")
async def recent_transactions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT t.id::text, t.transaction_date, CAST(t.total_amount AS FLOAT),
               COUNT(ti.id) as item_count
        FROM transactions t
        LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
        GROUP BY t.id, t.transaction_date, t.total_amount
        ORDER BY t.transaction_date DESC LIMIT 20
    """))
    rows = result.fetchall()
    return [{"id": r[0], "date": r[1].isoformat(), "total": r[2], "item_count": r[3]} for r in rows]
