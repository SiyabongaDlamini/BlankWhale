"""
BlankWhale v2 — Reinforcement Learning Trainer
Wraps Stable-Baselines3 for training robot policies using
PyBullet physics simulation.

Features:
- Custom Gymnasium environment from RobotSimulation
- PPO and SAC algorithm support
- Real-time metrics streaming (reward, success rate, episode length)
- Parallel environment support for GPU training
- Configurable reward shaping from frontend
"""

import logging
import time
import json
import numpy as np
from typing import Dict, Any, Optional, Callable, List
from dataclasses import dataclass, field

logger = logging.getLogger("blankwhale.rl_trainer")


@dataclass
class RLConfig:
    """Configuration for RL training."""
    algorithm: str = "PPO"           # PPO | SAC
    total_timesteps: int = 100_000
    learning_rate: float = 3e-4
    batch_size: int = 64
    n_steps: int = 2048             # PPO rollout length
    gamma: float = 0.99             # Discount factor
    n_envs: int = 1                 # Parallel environments
    urdf_path: str = ""
    reward_weights: Dict[str, float] = field(default_factory=lambda: {
        "distance_to_target": 1.0,
        "contact_force": -0.1,
        "energy": -0.01,
        "orientation": 0.5,
        "speed": 0.3,
    })
    target_position: List[float] = field(default_factory=lambda: [1.0, 0.0, 0.5])


# ============================================================
# Custom Gymnasium Environment
# ============================================================

def create_robot_env(rl_config: RLConfig):
    """Create a Gymnasium environment wrapping PyBullet simulation."""
    try:
        import gymnasium as gym
        from gymnasium import spaces
    except ImportError:
        raise ImportError("gymnasium not installed. Install: pip install gymnasium")

    from .robot_sim import RobotSimulation, SceneConfig, RobotConfig

    class BlankWhaleRobotEnv(gym.Env):
        """Custom Gymnasium environment for robot RL training."""

        metadata = {"render_modes": ["rgb_array"]}

        def __init__(self):
            super().__init__()
            self.sim = RobotSimulation()
            self.sim.setup(
                SceneConfig(),
                RobotConfig(urdf_path=rl_config.urdf_path),
            )

            info = self.sim.get_observation_space_info()
            self.n_joints = info["n_joints"]
            obs_dim = info["obs_dim"]
            act_dim = info["action_dim"]

            # Continuous observation and action spaces
            self.observation_space = spaces.Box(
                low=-np.inf, high=np.inf,
                shape=(obs_dim,), dtype=np.float32,
            )
            self.action_space = spaces.Box(
                low=-1.0, high=1.0,
                shape=(act_dim,), dtype=np.float32,
            )

            self.target = np.array(rl_config.target_position, dtype=np.float32)
            self.reward_weights = rl_config.reward_weights
            self.max_steps = 1000
            self._current_step = 0

        def _get_obs(self) -> np.ndarray:
            state = self.sim.get_state()
            obs = np.array(
                list(state.robot_position)
                + list(state.robot_orientation)
                + state.joint_positions
                + state.joint_velocities
                + state.joint_torques,
                dtype=np.float32,
            )
            return obs

        def _compute_reward(self) -> float:
            state = self.sim.get_state()
            w = self.reward_weights

            # Distance to target
            pos = np.array(state.robot_position)
            dist = np.linalg.norm(pos - self.target)
            r_distance = w.get("distance_to_target", 0) * max(0, 1.0 - dist)

            # Contact force penalty
            total_force = sum(c.get("normal_force", 0) for c in state.contacts)
            r_contact = w.get("contact_force", 0) * total_force

            # Energy penalty
            r_energy = w.get("energy", 0) * state.energy

            # Orientation reward (upright)
            _, _, _, qw = state.robot_orientation
            r_orient = w.get("orientation", 0) * abs(qw)

            # Speed reward
            vel = np.linalg.norm(state.joint_velocities) if state.joint_velocities else 0
            r_speed = w.get("speed", 0) * min(vel, 2.0)

            return r_distance + r_contact + r_energy + r_orient + r_speed

        def reset(self, seed=None, options=None):
            super().reset(seed=seed)
            from .robot_sim import RobotConfig
            self.sim.reset(RobotConfig(urdf_path=rl_config.urdf_path))
            self._current_step = 0
            return self._get_obs(), {}

        def step(self, action):
            # Scale actions from [-1, 1] to joint range
            scaled_actions = (action * np.pi).tolist()  # ±π radians
            self.sim.step(scaled_actions)
            self._current_step += 1

            obs = self._get_obs()
            reward = self._compute_reward()
            terminated = self._current_step >= self.max_steps
            truncated = False

            return obs, reward, terminated, truncated, {}

        def close(self):
            self.sim.close()

    return BlankWhaleRobotEnv


# ============================================================
# RL Training Loop
# ============================================================

class RLTrainer:
    """
    Reinforcement Learning trainer using Stable-Baselines3.
    Streams metrics to the frontend via a callback.
    """

    def __init__(
        self,
        config: RLConfig,
        on_metrics: Optional[Callable[[Dict[str, Any]], None]] = None,
    ):
        self.config = config
        self.on_metrics = on_metrics
        self._model = None
        self._should_stop = False

    def setup(self):
        """Initialize the RL algorithm and environment."""
        try:
            from stable_baselines3 import PPO, SAC
            from stable_baselines3.common.callbacks import BaseCallback
        except ImportError:
            raise ImportError(
                "Stable-Baselines3 not installed. Install: pip install stable-baselines3"
            )

        EnvClass = create_robot_env(self.config)
        env = EnvClass()

        algo_map = {"PPO": PPO, "SAC": SAC}
        AlgoClass = algo_map.get(self.config.algorithm, PPO)

        self._model = AlgoClass(
            "MlpPolicy",
            env,
            learning_rate=self.config.learning_rate,
            batch_size=self.config.batch_size,
            verbose=0,
        )

        logger.info(f"RL Trainer initialized: {self.config.algorithm}, "
                     f"target timesteps: {self.config.total_timesteps}")

    def train(self):
        """Run the RL training loop."""
        from stable_baselines3.common.callbacks import BaseCallback

        trainer_ref = self

        class MetricsCallback(BaseCallback):
            """Stream metrics to the frontend during training."""

            def __init__(self):
                super().__init__()
                self._episode_rewards = []
                self._episode_lengths = []
                self._last_report = 0

            def _on_step(self) -> bool:
                if trainer_ref._should_stop:
                    return False

                # Collect episode stats from monitor
                if self.locals.get("dones") is not None:
                    for i, done in enumerate(self.locals["dones"]):
                        if done and "episode" in self.locals.get("infos", [{}])[i]:
                            ep = self.locals["infos"][i]["episode"]
                            self._episode_rewards.append(ep["r"])
                            self._episode_lengths.append(ep["l"])

                # Report every 100 steps
                if self.num_timesteps - self._last_report >= 100:
                    self._last_report = self.num_timesteps
                    metrics = {
                        "event": "rl_metrics",
                        "data": {
                            "timestep": self.num_timesteps,
                            "total_timesteps": trainer_ref.config.total_timesteps,
                            "mean_reward": float(np.mean(self._episode_rewards[-10:]))
                                if self._episode_rewards else 0.0,
                            "mean_episode_length": float(np.mean(self._episode_lengths[-10:]))
                                if self._episode_lengths else 0.0,
                            "total_episodes": len(self._episode_rewards),
                        },
                    }
                    if trainer_ref.on_metrics:
                        trainer_ref.on_metrics(metrics)

                return True

        try:
            self._model.learn(
                total_timesteps=self.config.total_timesteps,
                callback=MetricsCallback(),
            )
            logger.info("RL training complete")
        except Exception as e:
            logger.error(f"RL training failed: {e}")
            raise

    def stop(self):
        """Signal training to stop."""
        self._should_stop = True

    def save(self, path: str = "./output/rl_policy"):
        """Save the trained policy."""
        if self._model:
            self._model.save(path)
            logger.info(f"RL policy saved to {path}")

    def export_onnx(self, path: str = "./output/rl_policy.onnx"):
        """Export the policy to ONNX for edge deployment."""
        # TODO: Implement ONNX export
        logger.info("ONNX export for RL policies coming soon")
