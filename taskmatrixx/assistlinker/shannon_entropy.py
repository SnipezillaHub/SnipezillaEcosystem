import math
from typing import List, Dict, Any

def compute_shannon_entropy(addresses: List[str]) -> float:
    """
    Compute Shannon entropy (bits) of an address sequence.
    Higher entropy means more randomness in distribution.
    """
    if not addresses:
        return 0.0

    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1

    total = len(addresses)
    entropy = 0.0
    for count in freq.values():
        p = count / total
        if p > 0:
            entropy -= p * math.log2(p)

    return round(entropy, 4)


def entropy_details(addresses: List[str]) -> Dict[str, Any]:
    """
    Return both the entropy value and a breakdown of frequencies.
    """
    if not addresses:
        return {"entropy": 0.0, "distribution": {}}

    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1

    total = len(addresses)
    entropy = compute_shannon_entropy(addresses)

    distribution = {addr: round(count / total, 4) for addr, count in freq.items()}
    return {
        "entropy": entropy,
        "distribution": distribution,
        "unique_count": len(freq),
        "total": total,
    }
