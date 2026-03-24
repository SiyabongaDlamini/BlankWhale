"""
BlankWhale v2 — Natural Language Reward Shaper
Converts human-readable reward descriptions into weighted
reward component configurations for RL training.

Example:
  Input:  "make the robot pick up fragile objects gently"
  Output: {
      "distance_to_target": 1.5,
      "contact_force": -0.8,       # High penalty for force
      "energy": -0.3,              # Gentle = low energy
      "orientation": 0.5,
      "speed": -0.2,               # Don't rush
  }

Uses keyword matching (no external LLM needed).
Can be enhanced later with the user's own fine-tuned model.
"""

import re
import logging
from typing import Dict, List

logger = logging.getLogger("blankwhale.reward_shaper")


# ============================================================
# Default Reward Components
# ============================================================

DEFAULT_WEIGHTS: Dict[str, float] = {
    "distance_to_target": 1.0,
    "contact_force": -0.1,
    "energy": -0.01,
    "orientation": 0.5,
    "speed": 0.3,
}

# ============================================================
# Keyword → Weight Adjustments
# ============================================================

KEYWORD_RULES: List[Dict] = [
    # Gentle / Fragile
    {
        "keywords": ["gentle", "gently", "fragile", "careful", "delicate", "soft"],
        "adjustments": {
            "contact_force": -0.8,
            "energy": -0.3,
            "speed": -0.2,
        },
    },
    # Fast / Quick
    {
        "keywords": ["fast", "quick", "quickly", "speed", "rapid"],
        "adjustments": {
            "speed": 1.0,
            "energy": 0.0,  # Don't penalize energy when speed is wanted
        },
    },
    # Pick up / Grasp
    {
        "keywords": ["pick up", "grab", "grasp", "hold", "lift"],
        "adjustments": {
            "distance_to_target": 1.5,
            "contact_force": 0.3,  # Need some force to grip
        },
    },
    # Avoid / Don't drop
    {
        "keywords": ["avoid", "don't drop", "do not drop", "prevent", "safe"],
        "adjustments": {
            "contact_force": -0.5,
            "orientation": 0.8,  # Stay stable
        },
    },
    # Navigate / Move to
    {
        "keywords": ["navigate", "move to", "go to", "reach", "walk"],
        "adjustments": {
            "distance_to_target": 2.0,
            "speed": 0.5,
        },
    },
    # Balance / Stable
    {
        "keywords": ["balance", "stable", "upright", "stand"],
        "adjustments": {
            "orientation": 2.0,
            "speed": -0.1,
        },
    },
    # Energy efficient
    {
        "keywords": ["efficient", "energy", "low power", "conserve"],
        "adjustments": {
            "energy": -0.5,
            "speed": -0.1,
        },
    },
    # Follow commands / Language
    {
        "keywords": ["follow", "command", "instruction", "spoken", "language"],
        "adjustments": {
            "distance_to_target": 1.0,
        },
    },
]


# ============================================================
# Core Shaper
# ============================================================

def shape_reward_from_text(
    description: str,
    base_weights: Dict[str, float] | None = None,
    slider_overrides: Dict[str, float] | None = None,
) -> Dict[str, float]:
    """
    Convert a natural language reward description into reward weights.
    
    Args:
        description:      Human-readable reward description
        base_weights:     Starting weights (defaults to DEFAULT_WEIGHTS)
        slider_overrides: Manual slider values from the frontend UI
                          (these take absolute priority)
    
    Returns:
        Final reward weight dictionary
    """
    weights = dict(base_weights or DEFAULT_WEIGHTS)
    description_lower = description.lower().strip()
    
    if not description_lower:
        return {**weights, **(slider_overrides or {})}
    
    # Apply keyword rules
    matched_rules = []
    for rule in KEYWORD_RULES:
        for keyword in rule["keywords"]:
            if keyword in description_lower:
                matched_rules.append(rule)
                break
    
    for rule in matched_rules:
        for component, value in rule["adjustments"].items():
            if component in weights:
                weights[component] = value
            else:
                weights[component] = value
    
    # Apply slider overrides (highest priority)
    if slider_overrides:
        weights.update(slider_overrides)
    
    logger.info(f"Reward shaped from: \"{description[:50]}...\" → {weights}")
    return weights


def get_reward_components() -> List[Dict[str, str]]:
    """Return available reward components for the frontend UI."""
    return [
        {
            "id": "distance_to_target",
            "name": "Distance to Target",
            "description": "Reward for getting closer to the goal position",
            "default": "1.0",
            "min": "-2.0",
            "max": "5.0",
        },
        {
            "id": "contact_force",
            "name": "Contact Force",
            "description": "Penalty for excessive contact forces (negative = penalize)",
            "default": "-0.1",
            "min": "-2.0",
            "max": "2.0",
        },
        {
            "id": "energy",
            "name": "Energy Consumption",
            "description": "Penalty for high energy use (negative = penalize)",
            "default": "-0.01",
            "min": "-1.0",
            "max": "0.0",
        },
        {
            "id": "orientation",
            "name": "Orientation (Upright)",
            "description": "Reward for maintaining upright orientation",
            "default": "0.5",
            "min": "0.0",
            "max": "3.0",
        },
        {
            "id": "speed",
            "name": "Speed",
            "description": "Reward for movement speed (negative = penalize speed)",
            "default": "0.3",
            "min": "-1.0",
            "max": "3.0",
        },
    ]
