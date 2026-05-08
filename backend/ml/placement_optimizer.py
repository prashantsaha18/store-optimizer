"""
Store Placement Optimizer
Scores each product for each zone and recommends optimal placement.

Scoring factors:
1. Sales Velocity     - How fast does it sell? (40%)
2. Profit Margin      - How much profit does it give? (25%)
3. Affinity Score     - Is it bought with other items in that zone? (20%)
4. Shelf Life         - Perishables need high-visibility zones (10%)
5. Zone Visibility    - Better zones should have better-selling items (5% boost)
"""

from typing import List, Dict, Optional
import numpy as np
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class ProductMetrics:
    product_id: str
    name: str
    category: str
    price: float
    cost: float
    daily_velocity: float      # units sold per day
    total_sold: int
    shelf_life_days: int


@dataclass
class ZoneInfo:
    zone_id: str
    name: str
    zone_type: str
    visibility_score: int      # 1-10
    capacity: int
    current_products: List[str]  # product_ids currently in this zone


@dataclass
class PlacementScore:
    product_id: str
    zone_id: str
    total_score: float         # 0-100
    velocity_score: float
    margin_score: float
    affinity_score: float
    shelf_life_score: float
    reason: str


def compute_placement_scores(
    products: List[ProductMetrics],
    zones: List[ZoneInfo],
    affinity_matrix: Dict[str, Dict[str, float]],  # from basket_analysis
) -> List[PlacementScore]:
    """
    Compute placement score for every (product, zone) pair.
    Returns sorted list of recommendations.
    """
    if not products or not zones:
        return []

    scores = []

    # Normalize metrics for scoring
    max_velocity = max((p.daily_velocity for p in products), default=1) or 1
    max_margin   = max(((p.price - p.cost) / p.price for p in products if p.price > 0), default=1) or 1

    for product in products:
        for zone in zones:

            # ── 1. Sales Velocity Score (0-40) ────────────────────
            velocity_score = (product.daily_velocity / max_velocity) * 40

            # ── 2. Profit Margin Score (0-25) ─────────────────────
            if product.price > 0:
                margin_pct = (product.price - product.cost) / product.price
                margin_score = (margin_pct / max_margin) * 25
            else:
                margin_score = 0

            # ── 3. Affinity Score (0-20) ──────────────────────────
            # How well does this product complement what's already in this zone?
            zone_affinities = []
            product_affinities = affinity_matrix.get(product.product_id, {})
            
            for existing_product_id in zone.current_products:
                lift = product_affinities.get(existing_product_id, 1.0)
                zone_affinities.append(lift)
            
            if zone_affinities:
                avg_lift = np.mean(zone_affinities)
                affinity_score = min((avg_lift - 1) / 3.0, 1.0) * 20  # cap at lift=4
            else:
                affinity_score = 10  # neutral if zone is empty

            # ── 4. Shelf Life Score (0-10) ────────────────────────
            # Perishables (low shelf life) NEED high-visibility zones
            if zone.visibility_score >= 7:
                if product.shelf_life_days <= 7:
                    shelf_life_score = 10   # Fresh items MUST be in visible spots
                elif product.shelf_life_days <= 30:
                    shelf_life_score = 7
                else:
                    shelf_life_score = 3    # Non-perishables don't need prime spots
            else:
                # Low-visibility zone is fine for shelf-stable items
                shelf_life_score = 10 - (10 / max(product.shelf_life_days, 1)) * 30
                shelf_life_score = max(0, min(10, shelf_life_score))

            # ── 5. Zone-Product Category Bonus ────────────────────
            category_bonus = _get_category_zone_bonus(product.category, zone.zone_type)

            # ── Total Score ────────────────────────────────────────
            total = velocity_score + margin_score + affinity_score + shelf_life_score + category_bonus
            total = round(min(100, total), 2)

            # Build reason string
            reason = _build_reason(
                product, zone,
                velocity_score, margin_score, affinity_score, shelf_life_score
            )

            scores.append(PlacementScore(
                product_id=product.product_id,
                zone_id=zone.zone_id,
                total_score=total,
                velocity_score=round(velocity_score, 2),
                margin_score=round(margin_score, 2),
                affinity_score=round(affinity_score, 2),
                shelf_life_score=round(shelf_life_score, 2),
                reason=reason
            ))

    return sorted(scores, key=lambda x: x.total_score, reverse=True)


def get_top_recommendations(
    scores: List[PlacementScore],
    zones: List[ZoneInfo],
    products_per_zone: int = 5
) -> Dict[str, List[PlacementScore]]:
    """
    For each zone, get top N product recommendations.
    Ensures each product appears in its best zone (no duplicates).
    """
    recommendations = {zone.zone_id: [] for zone in zones}
    zone_capacity   = {zone.zone_id: zone.capacity for zone in zones}
    assigned        = set()  # product_ids already assigned

    for score in scores:
        zone_id    = score.zone_id
        product_id = score.product_id

        if product_id in assigned:
            continue  # Each product assigned to its best zone only

        current_count = len(recommendations[zone_id])
        max_count     = min(products_per_zone, zone_capacity.get(zone_id, products_per_zone))

        if current_count < max_count:
            recommendations[zone_id].append(score)
            assigned.add(product_id)

    return recommendations


def _get_category_zone_bonus(category: str, zone_type: str) -> float:
    """Bonus points for natural category-zone fit."""
    bonuses = {
        ("Dairy",     "cold"):         5,
        ("Beverages", "cold"):         5,
        ("Beverages", "checkout"):     3,
        ("Chocolate", "checkout"):     4,
        ("Snacks",    "checkout"):     4,
        ("Snacks",    "eye_level"):    3,
        ("Staples",   "bulk"):         4,
        ("Staples",   "back_wall"):    3,
        ("Personal",  "eye_level"):    2,
        ("Household", "eye_level"):    2,
        ("Bakery",    "eye_level"):    3,
        ("Bakery",    "high_traffic"): 2,
    }
    return bonuses.get((category, zone_type), 0)


def _build_reason(
    product: ProductMetrics,
    zone: ZoneInfo,
    velocity_score: float,
    margin_score: float,
    affinity_score: float,
    shelf_life_score: float
) -> str:
    reasons = []
    
    if velocity_score >= 30:
        reasons.append(f"bestseller ({product.daily_velocity:.1f} units/day)")
    elif velocity_score >= 15:
        reasons.append("moderate seller")
    
    if margin_score >= 18:
        margin_pct = ((product.price - product.cost) / product.price * 100) if product.price > 0 else 0
        reasons.append(f"high margin ({margin_pct:.0f}%)")
    
    if affinity_score >= 15:
        reasons.append("strong basket affinity with zone neighbors")
    
    if shelf_life_score >= 8 and product.shelf_life_days <= 30:
        reasons.append("perishable — needs high visibility")
    
    if zone.zone_type == "checkout":
        reasons.append("impulse buy potential")
    
    if not reasons:
        reasons.append("balanced placement score")
    
    return f"Place here because: {', '.join(reasons)}"
