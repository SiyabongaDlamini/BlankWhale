"""
BlankWhale v2 — Vision-Language-Action (VLA) Trainer
Bridges fine-tuned LLMs with robot control by mapping
natural language instructions to robot actions.

Pipeline:
1. Fine-tuned LLM generates text command from user instruction
2. Command is parsed into action parameters
3. Robot executes the action via PyBullet

This creates a closed loop:
  User instruction → LLM → Command → Robot → Observation → LLM → ...
"""

import logging
import json
import re
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field

logger = logging.getLogger("blankwhale.vla")


@dataclass
class VLAConfig:
    """Configuration for Vision-Language-Action training."""
    llm_model_path: str = "./output/final"     # Path to fine-tuned LLM
    action_space: List[str] = field(default_factory=lambda: [
        "move_forward", "move_backward", "turn_left", "turn_right",
        "pick_up", "put_down", "reach_target", "stop",
    ])
    max_command_length: int = 128
    temperature: float = 0.3       # Low temp for deterministic commands


# ============================================================
# Command Parser
# ============================================================

# Maps LLM output keywords to robot actions
ACTION_KEYWORDS = {
    "forward": "move_forward",
    "ahead": "move_forward",
    "backward": "move_backward",
    "back": "move_backward",
    "left": "turn_left",
    "right": "turn_right",
    "pick": "pick_up",
    "grab": "pick_up",
    "grasp": "pick_up",
    "lift": "pick_up",
    "put": "put_down",
    "place": "put_down",
    "drop": "put_down",
    "release": "put_down",
    "reach": "reach_target",
    "target": "reach_target",
    "stop": "stop",
    "halt": "stop",
    "wait": "stop",
}


def parse_llm_command(text: str) -> Dict[str, Any]:
    """
    Parse an LLM-generated command into a robot action.
    
    Returns:
        {
            "action": "move_forward",
            "magnitude": 0.5,       # 0.0 - 1.0
            "confidence": 0.8,
        }
    """
    text_lower = text.lower().strip()
    
    # Find the best matching action
    best_action = "stop"
    best_confidence = 0.0
    
    for keyword, action in ACTION_KEYWORDS.items():
        if keyword in text_lower:
            # Simple confidence based on keyword position (earlier = more confident)
            pos = text_lower.index(keyword)
            confidence = 1.0 - (pos / max(len(text_lower), 1))
            if confidence > best_confidence:
                best_action = action
                best_confidence = confidence
    
    # Extract magnitude from numbers in the text
    numbers = re.findall(r'\d+\.?\d*', text_lower)
    magnitude = float(numbers[0]) / 10.0 if numbers else 0.5
    magnitude = min(max(magnitude, 0.0), 1.0)
    
    return {
        "action": best_action,
        "magnitude": magnitude,
        "confidence": round(best_confidence, 2),
        "raw_command": text.strip(),
    }


def action_to_joint_targets(
    action: str,
    magnitude: float = 0.5,
    n_joints: int = 6,
) -> List[float]:
    """
    Convert a parsed action into joint position targets.
    
    These are simplified mappings — a real VLA system would
    learn these mappings through training data.
    """
    import math
    
    targets = [0.0] * n_joints
    
    if action == "move_forward":
        targets[0] = magnitude * 0.5      # Base rotation
        targets[1] = -magnitude * 0.3     # Shoulder
    elif action == "move_backward":
        targets[0] = -magnitude * 0.5
        targets[1] = magnitude * 0.3
    elif action == "turn_left":
        targets[0] = -magnitude * math.pi / 4
    elif action == "turn_right":
        targets[0] = magnitude * math.pi / 4
    elif action == "pick_up":
        targets[1] = -magnitude * 0.8     # Lower shoulder
        targets[2] = magnitude * 0.6      # Extend elbow
        targets[-1] = magnitude * 1.0     # Close gripper
    elif action == "put_down":
        targets[1] = -magnitude * 0.4
        targets[2] = magnitude * 0.3
        targets[-1] = 0.0                 # Open gripper
    elif action == "reach_target":
        targets[1] = -magnitude * 0.6
        targets[2] = magnitude * 0.8
    elif action == "stop":
        pass  # All zeros
    
    return targets


# ============================================================
# VLA Bridge
# ============================================================

class VLABridge:
    """
    Connects a fine-tuned LLM to robot simulation.
    
    Usage:
        bridge = VLABridge(config)
        bridge.setup(model, tokenizer)
        
        # User gives instruction
        action = bridge.instruction_to_action("Pick up the red cube carefully")
        sim.step(action["joint_targets"])
    """
    
    def __init__(self, config: VLAConfig):
        self.config = config
        self._model = None
        self._tokenizer = None
    
    def setup(self, model=None, tokenizer=None):
        """Load or receive the fine-tuned LLM."""
        if model and tokenizer:
            self._model = model
            self._tokenizer = tokenizer
            logger.info("VLA bridge connected to existing model")
        else:
            # Load from path
            try:
                from transformers import AutoModelForCausalLM, AutoTokenizer
                self._tokenizer = AutoTokenizer.from_pretrained(self.config.llm_model_path)
                self._model = AutoModelForCausalLM.from_pretrained(self.config.llm_model_path)
                logger.info(f"VLA bridge loaded model from {self.config.llm_model_path}")
            except Exception as e:
                logger.error(f"Failed to load VLA model: {e}")
                raise
    
    def instruction_to_action(
        self,
        user_instruction: str,
        observation: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Convert a user instruction + optional observation into a robot action.
        
        Args:
            user_instruction: "Pick up the red cube carefully"
            observation:      Optional scene description from robot's camera
        
        Returns:
            Dict with action, magnitude, joint_targets, confidence
        """
        # Build prompt for the LLM
        prompt = self._build_prompt(user_instruction, observation)
        
        # Generate command from LLM
        command_text = self._generate(prompt)
        
        # Parse into action
        parsed = parse_llm_command(command_text)
        
        # Convert to joint targets
        joint_targets = action_to_joint_targets(
            parsed["action"],
            parsed["magnitude"],
        )
        parsed["joint_targets"] = joint_targets
        
        logger.info(f"VLA: '{user_instruction}' → {parsed['action']} (conf: {parsed['confidence']})")
        return parsed
    
    def _build_prompt(self, instruction: str, observation: Optional[str] = None) -> str:
        """Build the LLM prompt for command generation."""
        parts = [
            "You are a robot controller. Convert the user instruction into a simple robot command.",
            f"Available actions: {', '.join(self.config.action_space)}",
        ]
        
        if observation:
            parts.append(f"Current observation: {observation}")
        
        parts.append(f"User instruction: {instruction}")
        parts.append("Robot command:")
        
        return "\n".join(parts)
    
    def _generate(self, prompt: str) -> str:
        """Generate text from the LLM."""
        if not self._model or not self._tokenizer:
            # Fallback: use keyword parsing directly
            return prompt.split("User instruction: ")[-1].split("\n")[0]
        
        import torch
        inputs = self._tokenizer(prompt, return_tensors="pt").to(self._model.device)
        
        with torch.no_grad():
            outputs = self._model.generate(
                **inputs,
                max_new_tokens=self.config.max_command_length,
                temperature=self.config.temperature,
                do_sample=True,
                top_p=0.9,
            )
        
        response = self._tokenizer.decode(
            outputs[0][inputs["input_ids"].shape[1]:],
            skip_special_tokens=True,
        )
        return response.strip()
