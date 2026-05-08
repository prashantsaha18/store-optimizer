"""
ML Recommendations Router
Triggers ML analysis and returns placement recommendations
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from typing import List, Dict, Any
import uuid
from datetime import datetime

from database import get_db, Product, StoreZone, Transaction, TransactionItem, ProductAssociation, PlacementRecommendation
from ml.basket_analysis import run_basket_analysis, build_affinity_matrix, get_product_recommendations
from ml.placement_optimizer import (
    compute_placement_scores, get_top_recommendations,
    ProductMetrics, ZoneInfo
)

router = APIRouter()


@router.post("/run")
async def run_ml_analysis(db: AsyncSession = Depends(get_db)):
    """
    Run full ML pipeline:
    1. Market Basket Analysis (FP-Growth)
    2. Placement Score computation
    3. Store results in DB
    """
    try:
        # ── Step 1: Fetch all transactions ────────────────────────
        txn_result = await db.execute(
            text("""
                SELECT t.id::text as txn_id, ti.product_id::text as product_id
                FROM transactions t
                JOIN transaction_items ti ON t.id = ti.transaction_id
                ORDER BY t.id
            """)
        )
        rows = txn_result.fetchall()

        # Group by transaction
        txn_map: Dict[str, List[str]] = {}
        for row in rows:
            txn_map.setdefault(row.txn_id, []).append(row.product_id)
        
        transactions_list = list(txn_map.values())

        # ── Step 2: Run Basket Analysis ───────────────────────────
        rules = run_basket_analysis(
            transactions_list,
            min_support=0.01,
            min_confidence=0.15,
            min_lift=1.0
        )

        # Save associations to DB
        if rules:
            await db.execute(text("DELETE FROM product_associations"))
            for rule in rules:
                if len(rule["if_buy"]) == 1 and len(rule["also_buy"]) == 1:
                    await db.execute(
                        text("""
                            INSERT INTO product_associations (id, product_a, product_b, support, confidence, lift, calculated_at)
                            VALUES (:id, :pa::uuid, :pb::uuid, :sup, :conf, :lift, NOW())
                            ON CONFLICT (product_a, product_b) DO UPDATE
                            SET support=EXCLUDED.support, confidence=EXCLUDED.confidence, lift=EXCLUDED.lift
                        """),
                        {
                            "id": str(uuid.uuid4()),
                            "pa": rule["if_buy"][0],
                            "pb": rule["also_buy"][0],
                            "sup": rule["support"],
                            "conf": rule["confidence"],
                            "lift": rule["lift"]
                        }
                    )

        # ── Step 3: Fetch Products with velocity ──────────────────
        prod_result = await db.execute(
            text("""
                SELECT 
                    p.id::text, p.name, p.category, 
                    CAST(p.price AS FLOAT), CAST(p.cost AS FLOAT),
                    p.shelf_life_days,
                    COALESCE(SUM(ti.quantity), 0) as total_sold,
                    CASE 
                        WHEN COUNT(DISTINCT DATE(t.transaction_date)) > 0 
                        THEN SUM(ti.quantity)::FLOAT / COUNT(DISTINCT DATE(t.transaction_date))
                        ELSE 0.0
                    END as daily_velocity
                FROM products p
                LEFT JOIN transaction_items ti ON p.id = ti.product_id
                LEFT JOIN transactions t ON ti.transaction_id = t.id
                WHERE p.is_active = TRUE
                GROUP BY p.id, p.name, p.category, p.price, p.cost, p.shelf_life_days
            """)
        )
        product_rows = prod_result.fetchall()

        products = [
            ProductMetrics(
                product_id=row[0],
                name=row[1],
                category=row[2],
                price=row[3],
                cost=row[4],
                shelf_life_days=row[5],
                total_sold=row[6],
                daily_velocity=row[7]
            )
            for row in product_rows
        ]

        # ── Step 4: Fetch Zones ───────────────────────────────────
        zone_result = await db.execute(
            text("""
                SELECT 
                    sz.id::text, sz.name, sz.zone_type, sz.visibility_score, sz.capacity,
                    COALESCE(ARRAY_AGG(pp.product_id::text) FILTER (WHERE pp.is_current = TRUE), '{}') as current_products
                FROM store_zones sz
                LEFT JOIN product_placements pp ON sz.id = pp.zone_id
                GROUP BY sz.id, sz.name, sz.zone_type, sz.visibility_score, sz.capacity
            """)
        )
        zone_rows = zone_result.fetchall()

        zones = [
            ZoneInfo(
                zone_id=row[0],
                name=row[1],
                zone_type=row[2],
                visibility_score=row[3],
                capacity=row[4],
                current_products=row[5] if row[5] else []
            )
            for row in zone_rows
        ]

        # ── Step 5: Build affinity matrix ────────────────────────
        product_ids = [p.product_id for p in products]
        affinity_matrix = build_affinity_matrix(product_ids, rules)

        # ── Step 6: Compute placement scores ─────────────────────
        scores = compute_placement_scores(products, zones, affinity_matrix)
        zone_recommendations = get_top_recommendations(scores, zones)

        # ── Step 7: Save recommendations ──────────────────────────
        await db.execute(text("DELETE FROM placement_recommendations WHERE is_applied = FALSE"))
        
        saved_recommendations = []
        for zone_id, zone_scores in zone_recommendations.items():
            for score in zone_scores:
                rec_id = str(uuid.uuid4())
                await db.execute(
                    text("""
                        INSERT INTO placement_recommendations 
                        (id, product_id, recommended_zone_id, placement_score, reason, generated_at, is_applied)
                        VALUES (:id, :pid::uuid, :zid::uuid, :score, :reason, NOW(), FALSE)
                    """),
                    {
                        "id": rec_id,
                        "pid": score.product_id,
                        "zid": score.zone_id,
                        "score": score.total_score,
                        "reason": score.reason
                    }
                )
                saved_recommendations.append({
                    "product_id": score.product_id,
                    "zone_id": score.zone_id,
                    "score": score.total_score,
                    "reason": score.reason
                })

        await db.commit()

        return {
            "status": "success",
            "transactions_analyzed": len(transactions_list),
            "association_rules_found": len(rules),
            "recommendations_generated": len(saved_recommendations),
            "top_associations": rules[:5],
            "recommendations": saved_recommendations[:20]
        }

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def get_recommendations(db: AsyncSession = Depends(get_db)):
    """Get latest ML recommendations with product and zone details."""
    result = await db.execute(
        text("""
            SELECT 
                pr.id::text,
                p.id::text as product_id, p.name as product_name, p.category,
                CAST(p.price AS FLOAT), CAST(p.cost AS FLOAT),
                sz.id::text as zone_id, sz.name as zone_name, sz.zone_type,
                sz.visibility_score, sz.position_x, sz.position_y,
                CAST(pr.placement_score AS FLOAT), pr.reason,
                pr.is_applied, pr.generated_at
            FROM placement_recommendations pr
            JOIN products p ON pr.product_id = p.id
            JOIN store_zones sz ON pr.recommended_zone_id = sz.id
            ORDER BY pr.placement_score DESC
        """)
    )
    rows = result.fetchall()
    
    return [
        {
            "id": row[0],
            "product": {
                "id": row[1], "name": row[2], "category": row[3],
                "price": row[4], "cost": row[5],
                "margin_pct": round((row[4] - row[5]) / row[4] * 100, 1) if row[4] > 0 else 0
            },
            "zone": {
                "id": row[6], "name": row[7], "type": row[8],
                "visibility_score": row[9], "x": row[10], "y": row[11]
            },
            "score": row[12],
            "reason": row[13],
            "is_applied": row[14],
            "generated_at": row[15].isoformat() if row[15] else None
        }
        for row in rows
    ]


@router.get("/associations")
async def get_associations(db: AsyncSession = Depends(get_db)):
    """Get product association rules (bought together)."""
    result = await db.execute(
        text("""
            SELECT 
                pa.id::text,
                p1.id::text, p1.name as product_a_name, p1.category as cat_a,
                p2.id::text, p2.name as product_b_name, p2.category as cat_b,
                CAST(pa.support AS FLOAT), 
                CAST(pa.confidence AS FLOAT), 
                CAST(pa.lift AS FLOAT),
                pa.calculated_at
            FROM product_associations pa
            JOIN products p1 ON pa.product_a = p1.id
            JOIN products p2 ON pa.product_b = p2.id
            ORDER BY pa.lift DESC
            LIMIT 50
        """)
    )
    rows = result.fetchall()
    
    return [
        {
            "id": row[0],
            "product_a": {"id": row[1], "name": row[2], "category": row[3]},
            "product_b": {"id": row[4], "name": row[5], "category": row[6]},
            "support":    row[7],
            "confidence": row[8],
            "lift":       row[9],
            "strength":   "STRONG" if row[9] >= 2.5 else "MEDIUM" if row[9] >= 1.5 else "WEAK",
            "calculated_at": row[10].isoformat() if row[10] else None
        }
        for row in rows
    ]


@router.post("/{recommendation_id}/apply")
async def apply_recommendation(recommendation_id: str, db: AsyncSession = Depends(get_db)):
    """Apply a recommendation - actually move the product to the suggested zone."""
    result = await db.execute(
        text("SELECT product_id, recommended_zone_id FROM placement_recommendations WHERE id = :id::uuid"),
        {"id": recommendation_id}
    )
    rec = result.fetchone()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    # Remove existing placement for this product
    await db.execute(
        text("UPDATE product_placements SET is_current = FALSE WHERE product_id = :pid::uuid"),
        {"pid": str(rec.product_id)}
    )
    
    # Add new placement
    await db.execute(
        text("""
            INSERT INTO product_placements (id, product_id, zone_id, placed_at, is_current)
            VALUES (:id::uuid, :pid::uuid, :zid::uuid, NOW(), TRUE)
            ON CONFLICT (zone_id, product_id) DO UPDATE SET is_current = TRUE, placed_at = NOW()
        """),
        {
            "id": str(uuid.uuid4()),
            "pid": str(rec.product_id),
            "zid": str(rec.recommended_zone_id)
        }
    )
    
    # Mark recommendation as applied
    await db.execute(
        text("UPDATE placement_recommendations SET is_applied = TRUE WHERE id = :id::uuid"),
        {"id": recommendation_id}
    )
    
    await db.commit()
    return {"status": "applied", "recommendation_id": recommendation_id}
