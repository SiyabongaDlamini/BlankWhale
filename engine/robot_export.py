"""
BlankWhale v2 — Robot Policy Export
Export trained RL policies for deployment to real hardware,
edge devices, or ROS2 environments.

Supported formats:
- ONNX:       For edge deployment on Jetson, Raspberry Pi, etc.
- SafeTensors: Lightweight model serialization
- ROS2:       Generate a ROS2 Python node for direct hardware control
"""

import logging
import json
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger("blankwhale.robot_export")


def export_rl_policy(
    model_path: str = "./output/rl_policy",
    output_format: str = "onnx",
    output_path: str = "./output/robot_export",
) -> Dict[str, Any]:
    """
    Export a trained RL policy to the specified format.
    
    Args:
        model_path:    Path to the SB3 saved model (.zip)
        output_format: "onnx", "safetensors", or "ros2"
        output_path:   Directory for exported files
    
    Returns:
        Dict with export results
    """
    Path(output_path).mkdir(parents=True, exist_ok=True)
    
    if output_format == "onnx":
        return _export_onnx(model_path, output_path)
    elif output_format == "ros2":
        return _export_ros2_node(model_path, output_path)
    elif output_format == "safetensors":
        return _export_safetensors(model_path, output_path)
    else:
        raise ValueError(f"Unsupported export format: {output_format}")


def _export_onnx(model_path: str, output_path: str) -> Dict[str, Any]:
    """Export policy to ONNX format."""
    try:
        from stable_baselines3 import PPO
        import torch
    except ImportError:
        return {"error": "stable-baselines3 or torch not installed"}
    
    try:
        model = PPO.load(model_path)
        policy = model.policy
        
        # Get observation space shape
        obs_shape = model.observation_space.shape
        dummy_input = torch.randn(1, *obs_shape)
        
        onnx_path = str(Path(output_path) / "policy.onnx")
        
        torch.onnx.export(
            policy,
            dummy_input,
            onnx_path,
            opset_version=11,
            input_names=["observation"],
            output_names=["action"],
        )
        
        logger.info(f"ONNX policy exported to {onnx_path}")
        return {
            "format": "onnx",
            "path": onnx_path,
            "obs_shape": list(obs_shape),
        }
    except Exception as e:
        logger.error(f"ONNX export failed: {e}")
        return {"error": str(e)}


def _export_ros2_node(model_path: str, output_path: str) -> Dict[str, Any]:
    """Generate a ROS2 Python node that uses the trained policy."""
    node_code = f'''#!/usr/bin/env python3
"""
BlankWhale — Auto-generated ROS2 Policy Node
Runs the trained RL policy as a ROS2 node for real robot control.
"""

import rclpy
from rclpy.node import Node
from std_msgs.msg import Float64MultiArray
from sensor_msgs.msg import JointState
import numpy as np

class PolicyNode(Node):
    def __init__(self):
        super().__init__('blankwhale_policy')
        
        # Load the trained policy
        from stable_baselines3 import PPO
        self.model = PPO.load("{model_path}")
        self.get_logger().info("BlankWhale policy loaded")
        
        # Subscribe to joint state observations
        self.obs_sub = self.create_subscription(
            JointState, '/joint_states', self.obs_callback, 10
        )
        
        # Publish actions
        self.action_pub = self.create_publisher(
            Float64MultiArray, '/policy_actions', 10
        )
        
        self._latest_obs = None
        self.timer = self.create_timer(0.05, self.control_loop)  # 20 Hz
    
    def obs_callback(self, msg):
        self._latest_obs = np.array(
            list(msg.position) + list(msg.velocity) + list(msg.effort),
            dtype=np.float32,
        )
    
    def control_loop(self):
        if self._latest_obs is None:
            return
        
        action, _ = self.model.predict(self._latest_obs, deterministic=True)
        
        msg = Float64MultiArray()
        msg.data = action.tolist()
        self.action_pub.publish(msg)

def main():
    rclpy.init()
    node = PolicyNode()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
'''
    
    node_path = str(Path(output_path) / "policy_node.py")
    Path(node_path).write_text(node_code)
    
    logger.info(f"ROS2 node exported to {node_path}")
    return {
        "format": "ros2",
        "path": node_path,
        "description": "Python ROS2 node — subscribes to /joint_states, publishes to /policy_actions",
    }


def _export_safetensors(model_path: str, output_path: str) -> Dict[str, Any]:
    """Export policy weights as SafeTensors."""
    try:
        from stable_baselines3 import PPO
        from safetensors.torch import save_file
        import torch
    except ImportError:
        return {"error": "Missing dependencies: stable-baselines3, safetensors"}
    
    try:
        model = PPO.load(model_path)
        state_dict = model.policy.state_dict()
        
        st_path = str(Path(output_path) / "policy.safetensors")
        save_file(state_dict, st_path)
        
        logger.info(f"SafeTensors policy exported to {st_path}")
        return {
            "format": "safetensors",
            "path": st_path,
            "n_parameters": sum(p.numel() for p in state_dict.values()),
        }
    except Exception as e:
        logger.error(f"SafeTensors export failed: {e}")
        return {"error": str(e)}
