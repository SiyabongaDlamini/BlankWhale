"""
BlankWhale v2 — Robot Physics Simulation Engine
Wraps PyBullet for headless 3D physics simulation.

Provides:
- URDF robot loading + configuration
- Scene building (floors, walls, objects, obstacles)
- Physics stepping with configurable gravity, friction, restitution
- Joint state + contact force readout for RL observations
- Camera rendering for visual observations

Runs 100% locally in DIRECT mode (no GUI window needed).
The Three.js frontend renders the scene from joint state data.
"""

import logging
import math
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field

logger = logging.getLogger("blankwhale.robot_sim")


# ============================================================
# Configuration
# ============================================================

@dataclass
class SceneConfig:
    """Configuration for the physics scene."""
    gravity: float = -9.81           # m/s²
    time_step: float = 1.0 / 240.0   # Physics timestep
    friction: float = 0.8
    restitution: float = 0.1         # Bounciness
    solver_iterations: int = 50


@dataclass
class RobotConfig:
    """Configuration for a robot in the scene."""
    urdf_path: str = ""
    base_position: Tuple[float, float, float] = (0, 0, 0.5)
    base_orientation: Tuple[float, float, float, float] = (0, 0, 0, 1)  # quaternion
    use_fixed_base: bool = False
    global_scaling: float = 1.0


@dataclass
class SimState:
    """Current state of the simulation."""
    step_count: int = 0
    robot_position: Tuple[float, float, float] = (0, 0, 0)
    robot_orientation: Tuple[float, float, float, float] = (0, 0, 0, 1)
    joint_positions: List[float] = field(default_factory=list)
    joint_velocities: List[float] = field(default_factory=list)
    joint_torques: List[float] = field(default_factory=list)
    contacts: List[Dict[str, Any]] = field(default_factory=list)
    energy: float = 0.0


# ============================================================
# Physics Simulation
# ============================================================

class RobotSimulation:
    """
    Headless PyBullet physics simulation for robot training.
    
    Usage:
        sim = RobotSimulation()
        sim.setup(SceneConfig(), RobotConfig(urdf_path="robots/arm_6dof.urdf"))
        for _ in range(1000):
            state = sim.step(actions=[0.1, -0.2, 0.3, ...])
    """

    def __init__(self):
        self._p = None           # PyBullet physics client
        self._robot_id = None    # Robot body ID
        self._plane_id = None    # Ground plane ID
        self._objects: List[int] = []  # Scene object IDs
        self._joint_indices: List[int] = []  # Controllable joints
        self._config = SceneConfig()
        self._step_count = 0

    def setup(self, scene_config: SceneConfig, robot_config: RobotConfig):
        """Initialize PyBullet and load the robot + scene."""
        try:
            import pybullet as p
            import pybullet_data
        except ImportError:
            raise ImportError(
                "PyBullet not installed. Install: pip install pybullet"
            )

        self._config = scene_config

        # Start in DIRECT mode (headless — no window)
        self._p = p
        self._physics_client = p.connect(p.DIRECT)

        # Configure physics
        p.setGravity(0, 0, scene_config.gravity)
        p.setTimeStep(scene_config.time_step)
        p.setPhysicsEngineParameter(
            numSolverIterations=scene_config.solver_iterations,
            enableConeFriction=True,
        )
        p.setAdditionalSearchPath(pybullet_data.getDataPath())

        # Load ground plane
        self._plane_id = p.loadURDF("plane.urdf")
        p.changeDynamics(
            self._plane_id, -1,
            lateralFriction=scene_config.friction,
            restitution=scene_config.restitution,
        )

        # Load robot
        if robot_config.urdf_path and Path(robot_config.urdf_path).exists():
            self._robot_id = p.loadURDF(
                robot_config.urdf_path,
                basePosition=robot_config.base_position,
                baseOrientation=robot_config.base_orientation,
                useFixedBase=robot_config.use_fixed_base,
                globalScaling=robot_config.global_scaling,
            )
            self._discover_joints()
            logger.info(f"Loaded robot: {robot_config.urdf_path} with {len(self._joint_indices)} controllable joints")
        else:
            logger.warning(f"URDF not found: {robot_config.urdf_path}, using empty scene")

        self._step_count = 0
        return self.get_state()

    def _discover_joints(self):
        """Find all revolute and prismatic joints."""
        if self._robot_id is None:
            return

        p = self._p
        num_joints = p.getNumJoints(self._robot_id)
        self._joint_indices = []

        for i in range(num_joints):
            info = p.getJointInfo(self._robot_id, i)
            joint_type = info[2]
            # 0 = revolute, 1 = prismatic (controllable)
            if joint_type in (0, 1):
                self._joint_indices.append(i)

    def step(self, actions: Optional[List[float]] = None) -> SimState:
        """
        Step the simulation forward.
        
        Args:
            actions: Torques or position targets for each controllable joint.
                     Length must match len(self._joint_indices).
        """
        p = self._p

        if actions is not None and self._robot_id is not None:
            for i, joint_idx in enumerate(self._joint_indices):
                if i < len(actions):
                    p.setJointMotorControl2(
                        self._robot_id, joint_idx,
                        controlMode=p.POSITION_CONTROL,
                        targetPosition=actions[i],
                        force=50.0,
                    )

        p.stepSimulation()
        self._step_count += 1

        return self.get_state()

    def get_state(self) -> SimState:
        """Get the current simulation state."""
        p = self._p
        state = SimState(step_count=self._step_count)

        if self._robot_id is not None:
            pos, orn = p.getBasePositionAndOrientation(self._robot_id)
            state.robot_position = pos
            state.robot_orientation = orn

            # Joint states
            joint_states = p.getJointStates(self._robot_id, self._joint_indices)
            state.joint_positions = [js[0] for js in joint_states]
            state.joint_velocities = [js[1] for js in joint_states]
            state.joint_torques = [js[3] for js in joint_states]

            # Energy = sum of |torque * velocity|
            state.energy = sum(
                abs(t * v) for t, v in zip(state.joint_torques, state.joint_velocities)
            )

            # Contact points
            contacts = p.getContactPoints(bodyA=self._robot_id)
            state.contacts = [
                {
                    "body_b": c[2],
                    "position": c[5],
                    "normal_force": c[9],
                    "friction1": c[10],
                    "friction2": c[12],
                }
                for c in contacts[:10]  # Cap at 10
            ]

        return state

    def add_object(
        self,
        shape: str = "box",
        position: Tuple[float, float, float] = (1, 0, 0.5),
        size: Tuple[float, float, float] = (0.2, 0.2, 0.2),
        mass: float = 1.0,
        color: Tuple[float, float, float, float] = (0.5, 0.5, 0.5, 1.0),
    ) -> int:
        """Add a simple object to the scene."""
        p = self._p

        if shape == "box":
            col_id = p.createCollisionShape(p.GEOM_BOX, halfExtents=[s/2 for s in size])
            vis_id = p.createVisualShape(p.GEOM_BOX, halfExtents=[s/2 for s in size], rgbaColor=color)
        elif shape == "sphere":
            radius = size[0] / 2
            col_id = p.createCollisionShape(p.GEOM_SPHERE, radius=radius)
            vis_id = p.createVisualShape(p.GEOM_SPHERE, radius=radius, rgbaColor=color)
        elif shape == "cylinder":
            col_id = p.createCollisionShape(p.GEOM_CYLINDER, radius=size[0]/2, height=size[2])
            vis_id = p.createVisualShape(p.GEOM_CYLINDER, radius=size[0]/2, length=size[2], rgbaColor=color)
        else:
            raise ValueError(f"Unsupported shape: {shape}")

        obj_id = p.createMultiBody(
            baseMass=mass,
            baseCollisionShapeIndex=col_id,
            baseVisualShapeIndex=vis_id,
            basePosition=position,
        )
        p.changeDynamics(obj_id, -1,
            lateralFriction=self._config.friction,
            restitution=self._config.restitution,
        )

        self._objects.append(obj_id)
        return obj_id

    def reset(self, robot_config: Optional[RobotConfig] = None):
        """Reset the simulation to initial state."""
        p = self._p

        if robot_config and self._robot_id is not None:
            p.resetBasePositionAndOrientation(
                self._robot_id,
                robot_config.base_position,
                robot_config.base_orientation,
            )
            for idx in self._joint_indices:
                p.resetJointState(self._robot_id, idx, 0)

        self._step_count = 0
        return self.get_state()

    def get_observation_space_info(self) -> Dict[str, Any]:
        """Return info about the observation space for RL."""
        n_joints = len(self._joint_indices)
        return {
            "n_joints": n_joints,
            "obs_dim": 3 + 4 + n_joints * 3,  # pos + orn + (pos, vel, torque) per joint
            "action_dim": n_joints,
            "joint_indices": self._joint_indices,
        }

    def get_scene_info(self) -> Dict[str, Any]:
        """Return scene metadata for the frontend 3D viewer."""
        p = self._p
        objects = []

        for obj_id in self._objects:
            pos, orn = p.getBasePositionAndOrientation(obj_id)
            objects.append({
                "id": obj_id,
                "position": list(pos),
                "orientation": list(orn),
            })

        robot_info = None
        if self._robot_id is not None:
            pos, orn = p.getBasePositionAndOrientation(self._robot_id)
            robot_info = {
                "id": self._robot_id,
                "position": list(pos),
                "orientation": list(orn),
                "n_joints": len(self._joint_indices),
                "joint_positions": self.get_state().joint_positions,
            }

        return {
            "gravity": self._config.gravity,
            "friction": self._config.friction,
            "robot": robot_info,
            "objects": objects,
            "step_count": self._step_count,
        }

    def close(self):
        """Disconnect from PyBullet."""
        if self._p:
            self._p.disconnect()
            self._p = None
