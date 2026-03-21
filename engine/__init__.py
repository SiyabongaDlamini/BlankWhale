# BlankWhale Training Engine
# Local AI training on your own hardware

from .server import start_server
from .trainer import BlankWhaleTrainer
from .gpu_detect import detect_hardware
from .model_loader import load_model
from .data_pipeline import preprocess_data
from .export import export_model

__version__ = "0.1.0"
__all__ = [
    "start_server",
    "BlankWhaleTrainer",
    "detect_hardware",
    "load_model",
    "preprocess_data",
    "export_model",
]
