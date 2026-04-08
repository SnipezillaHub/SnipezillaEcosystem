import math
from typing import Dict, Any

def calculate_risk_score(
    price_change_pct: float,
    liquidity_usd: float,
    flags_mask: int,
    weights: Dict[str, float] = None
) -> float:
    """
    Compute a 0–100 risk score with adjustable weights.
    - price_change_pct: percent change over period (e.g. +5.0 for +5%).
    - liquidity_usd: total liquidity in USD.
    - flags_mask: integer bitmask of risk flags; each set bit adds a penalty.
    - weights: optional dict to adjust {volatility, liquidity, flags}.
    """

    # defaults
    if weights is None:
        weights = {"volatility": 1.0, "liquidity": 1.0, "flags": 1.0}

    # volatility component (max 50)
    vol_score = min(abs(price_change_pct) / 10, 1) * 50
    vol_score *= weights.get("volatility", 1.0)

    # liquidity component: more liquidity = lower risk, up to 30
    if liquidity_usd > 0:
        liq_score = max(0.0, 30 - (math.log10(liquidity_usd) * 5))
    else:
        liq_score = 30.0
    liq_score *= weights.get("liquidity", 1.0)

    # flag penalty: 5 points per bit set
    flag_count = bin(flags_mask).count("1")
    flag_score = flag_count * 5
    flag_score *= weights.get("flags", 1.0)

    raw_score = vol_score + liq_score + flag_score

    # clamp to [0, 100]
    return max(0.0, min(round(raw_score, 2), 100.0))


def explain_risk(price_change_pct: float, liquidity_usd: float, flags_mask: int) -> Dict[str, Any]:
    """
    Helper: return a breakdown of the risk calculation.
    """
    score = calculate_risk_score(price_change_pct, liquidity_usd, flags_mask)
    return {
        "price_change_pct": price_change_pct,
        "liquidity_usd": liquidity_usd,
        "flags_mask": flags_mask,
        "risk_score": score
    }
