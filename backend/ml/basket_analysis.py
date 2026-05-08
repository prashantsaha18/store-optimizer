"""
Market Basket Analysis - FP-Growth Algorithm
Finds which products are frequently bought together
"""

import pandas as pd
import numpy as np
from mlxtend.frequent_patterns import fpgrowth, association_rules
from mlxtend.preprocessing import TransactionEncoder
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)


def run_basket_analysis(
    transactions: List[List[str]],  # list of [product_id, product_id, ...]
    min_support: float = 0.01,
    min_confidence: float = 0.2,
    min_lift: float = 1.0,
) -> List[Dict]:
    """
    Run FP-Growth market basket analysis.
    
    Returns list of association rules with support, confidence, lift.
    High lift (>1) means products are bought together more than chance.
    """
    if len(transactions) < 10:
        logger.warning("Too few transactions for meaningful analysis (need ≥ 10)")
        return []

    try:
        # Encode transactions into binary matrix
        te = TransactionEncoder()
        te_array = te.fit_transform(transactions)
        df = pd.DataFrame(te_array, columns=te.columns_)

        # FP-Growth (faster than Apriori for sparse data)
        frequent_itemsets = fpgrowth(
            df,
            min_support=min_support,
            use_colnames=True,
            max_len=3  # max 3-item combinations
        )

        if frequent_itemsets.empty:
            logger.info("No frequent itemsets found. Try lowering min_support.")
            return []

        # Generate association rules
        rules = association_rules(
            frequent_itemsets,
            metric="confidence",
            min_threshold=min_confidence
        )

        # Filter by lift
        rules = rules[rules["lift"] >= min_lift]

        # Convert frozensets to lists for JSON serialization
        result = []
        for _, row in rules.iterrows():
            antecedents = list(row["antecedents"])
            consequents = list(row["consequents"])
            
            result.append({
                "if_buy":     antecedents,    # product_ids
                "also_buy":   consequents,    # product_ids
                "support":    round(float(row["support"]), 4),
                "confidence": round(float(row["confidence"]), 4),
                "lift":       round(float(row["lift"]), 4),
                "strength":   _classify_association(float(row["lift"]), float(row["confidence"]))
            })

        # Sort by lift descending (strongest associations first)
        result.sort(key=lambda x: x["lift"], reverse=True)
        return result

    except Exception as e:
        logger.error(f"Basket analysis error: {e}")
        return []


def _classify_association(lift: float, confidence: float) -> str:
    """Classify association strength for display."""
    if lift >= 3.0 and confidence >= 0.5:
        return "STRONG"
    elif lift >= 2.0 and confidence >= 0.3:
        return "MEDIUM"
    else:
        return "WEAK"


def get_product_recommendations(
    target_product_id: str,
    all_rules: List[Dict],
    top_n: int = 5
) -> List[Dict]:
    """
    Given a product, find what to place nearby (frequently bought together).
    """
    recommendations = []
    
    for rule in all_rules:
        if target_product_id in rule["if_buy"]:
            for product_id in rule["also_buy"]:
                if product_id != target_product_id:
                    recommendations.append({
                        "product_id": product_id,
                        "confidence": rule["confidence"],
                        "lift":       rule["lift"],
                        "strength":   rule["strength"],
                        "reason":     f"Customers who buy this also buy (lift={rule['lift']:.2f})"
                    })

    # Deduplicate and sort
    seen = set()
    unique_recs = []
    for r in sorted(recommendations, key=lambda x: x["lift"], reverse=True):
        if r["product_id"] not in seen:
            seen.add(r["product_id"])
            unique_recs.append(r)
    
    return unique_recs[:top_n]


def build_affinity_matrix(
    product_ids: List[str],
    rules: List[Dict]
) -> Dict[str, Dict[str, float]]:
    """
    Build product affinity matrix (product_a -> product_b -> lift score).
    Used for zone co-placement recommendations.
    """
    matrix = {pid: {} for pid in product_ids}
    
    for rule in rules:
        for a in rule["if_buy"]:
            for b in rule["also_buy"]:
                if a in matrix:
                    matrix[a][b] = max(matrix[a].get(b, 0), rule["lift"])
                if b in matrix:
                    matrix[b][a] = max(matrix[b].get(a, 0), rule["lift"])
    
    return matrix
