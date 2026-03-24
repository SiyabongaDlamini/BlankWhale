"""
BlankWhale GPU Detection
Detects available compute hardware (CUDA, Metal, ROCm, CPU).
"""

import platform
import os
import subprocess
import json


@log_function
def detect_hardware() -> dict:
    """Expert hardware detection for local AI training."""
    import psutil
    info = {
        "device": "cpu",
        "gpu_available": False,
        "gpu_name": None,
        "gpu_memory_gb": None,
        "gpu_count": 0,
        "cuda_version": None,
        "platform": platform.system(),
        "arch": platform.machine(),
        "python_version": platform.python_version(),
        "cpu_name": platform.processor() or "Unknown",
        "cpu_cores": os.cpu_count() or 1,
        "ram_gb": _get_ram_gb(),
    }

    # Try PyTorch detection
    try:
        import torch
        info["pytorch_version"] = torch.__version__

        if torch.cuda.is_available():
            info["device"] = "cuda"
            info["gpu_available"] = True
            info["gpu_count"] = torch.cuda.device_count()
            info["gpu_name"] = torch.cuda.get_device_name(0)
            info["gpu_memory_gb"] = round(torch.cuda.get_device_properties(0).total_memory / 1e9, 1)
            info["cuda_version"] = getattr(torch.version, "cuda", None)
            logger.info(f"DETECTED: CUDA GPU ({info['gpu_name']}) - {info['gpu_memory_gb']}GB VRAM")

        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            info["device"] = "mps"
            info["gpu_available"] = True
            info["gpu_name"] = "Apple Silicon (Metal)"
            info["gpu_count"] = 1
            # Estimate Metal GPU memory from system RAM (70% limit usually)
            info["gpu_memory_gb"] = round(info["ram_gb"] * 0.7, 1)
            logger.info(f"DETECTED: Apple Silicon GPU (MPS) - Unified Memory Limit: {info['gpu_memory_gb']}GB")

        elif (hasattr(torch, "version") and hasattr(torch.version, "hip") and torch.version.hip) or (hasattr(torch, "hip") and torch.hip.is_available()):
            info["device"] = "cuda" # Use 'cuda' string for ROCm in torch
            info["gpu_available"] = True
            info["gpu_name"] = "AMD ROCm GPU"
            info["gpu_count"] = 1
            logger.info("DETECTED: AMD ROCm GPU")

    except ImportError:
        logger.warning("PyTorch not installed. Hardware detection limited.")
        info["pytorch_version"] = None

    # Fallback: try nvidia-smi directly
    if not info["gpu_available"]:
        nvidia_info = _detect_nvidia_smi()
        if nvidia_info:
            info["gpu_available"] = True
            info["gpu_name"] = nvidia_info.get("name", "NVIDIA GPU")
            info["gpu_memory_gb"] = nvidia_info.get("memory_gb")
            info["device"] = "cuda"
            logger.info(f"DETECTED: NVIDIA GPU via nvidia-smi ({info['gpu_name']})")

    if not info["gpu_available"]:
        logger.info("DETECTED: No GPU found. Falling back to CPU for training (SLOW).")

    return info


def _get_ram_gb() -> float:
    """Get total system RAM in GB."""
    try:
        import psutil
        return round(psutil.virtual_memory().total / 1e9, 1)
    except ImportError:
        pass

    # Fallback for macOS
    if platform.system() == "Darwin":
        try:
            result = subprocess.run(
                ["sysctl", "-n", "hw.memsize"],
                capture_output=True, text=True, timeout=5
            )
            return round(int(result.stdout.strip()) / 1e9, 1)
        except Exception:
            pass

    # Fallback for Linux
    if platform.system() == "Linux":
        try:
            with open("/proc/meminfo") as f:
                for line in f:
                    if line.startswith("MemTotal"):
                        kb = int(line.split()[1])
                        return round(kb / 1e6, 1)
        except Exception:
            pass

    return 0.0


def _detect_nvidia_smi() -> dict | None:
    """Try to detect NVIDIA GPU using nvidia-smi."""
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0 and result.stdout.strip():
            parts = result.stdout.strip().split(",")
            return {
                "name": parts[0].strip(),
                "memory_gb": round(float(parts[1].strip()) / 1024, 1),
            }
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return None


def print_hardware_report():
    """Print a formatted hardware report."""
    hw = detect_hardware()
    print("=" * 50)
    print("  BlankWhale Hardware Report")
    print("=" * 50)
    print(f"  Platform:     {hw['platform']} ({hw['arch']})")
    print(f"  CPU:          {hw['cpu_name']}")
    print(f"  CPU Cores:    {hw['cpu_cores']}")
    print(f"  RAM:          {hw['ram_gb']} GB")
    print(f"  GPU:          {hw['gpu_name'] or 'None detected'}")
    print(f"  GPU Memory:   {hw['gpu_memory_gb'] or 'N/A'} GB")
    print(f"  GPU Count:    {hw['gpu_count']}")
    print(f"  Device:       {hw['device']}")
    if hw.get("pytorch_version"):
        print(f"  PyTorch:      {hw['pytorch_version']}")
    if hw.get("cuda_version"):
        print(f"  CUDA:         {hw['cuda_version']}")
    print("=" * 50)
    return hw


if __name__ == "__main__":
    print_hardware_report()
