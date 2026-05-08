"""Store Zones router"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import get_db

router = APIRouter()

@router.get("/")
async def get_zones(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT sz.id::text, sz.name, sz.zone_type, sz.visibility_score,
               sz.position_x, sz.position_y, sz.capacity, sz.description,
               COUNT(pp.id) as product_count,
               COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
                   'id', p.id::text, 'name', p.name, 'category', p.category,
                   'price', CAST(p.price AS FLOAT)
               )) FILTER (WHERE p.id IS NOT NULL), '[]') as products
        FROM store_zones sz
        LEFT JOIN product_placements pp ON sz.id = pp.zone_id AND pp.is_current = TRUE
        LEFT JOIN products p ON pp.product_id = p.id
        GROUP BY sz.id, sz.name, sz.zone_type, sz.visibility_score, 
                 sz.position_x, sz.position_y, sz.capacity, sz.description
        ORDER BY sz.visibility_score DESC
    """))
    rows = result.fetchall()
    return [
        {
            "id": r[0], "name": r[1], "type": r[2], "visibility_score": r[3],
            "x": r[4], "y": r[5], "capacity": r[6], "description": r[7],
            "product_count": r[8], "products": r[9]
        }
        for r in rows
    ]
