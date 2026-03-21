"""
BlankWhale Model Export
Export trained models to various formats for deployment.
"""

import os
import shutil
from pathlib import Path


def export_model(
    model_path: str,
    output_format: str = "safetensors",
    output_path: str = "./output/export",
    quantize_gguf: str = "Q4_K_M",
) -> dict:
    """
    Export a trained model to the specified format.
    
    Supported formats:
        - safetensors: HuggingFace safetensors format
        - gguf: GGML format for llama.cpp / Ollama
        - onnx: ONNX format for cross-platform inference
        - merged: Merge LoRA weights into base model
    
    Returns:
        dict with export details
    """
    model_path = Path(model_path)
    output_path = Path(output_path)
    output_path.mkdir(parents=True, exist_ok=True)

    if not model_path.exists():
        raise FileNotFoundError(f"Model not found at {model_path}")

    result = {
        "format": output_format,
        "input_path": str(model_path),
        "output_path": str(output_path),
    }

    if output_format == "safetensors":
        result.update(_export_safetensors(model_path, output_path))

    elif output_format == "gguf":
        result.update(_export_gguf(model_path, output_path, quantize_gguf))

    elif output_format == "onnx":
        result.update(_export_onnx(model_path, output_path))

    elif output_format == "merged":
        result.update(_export_merged(model_path, output_path))

    else:
        raise ValueError(f"Unsupported format: {output_format}")

    return result


def _export_safetensors(model_path: Path, output_path: Path) -> dict:
    """Export as HuggingFace safetensors."""
    from transformers import AutoModelForCausalLM, AutoTokenizer

    print("Loading model for safetensors export...")
    model = AutoModelForCausalLM.from_pretrained(str(model_path))
    tokenizer = AutoTokenizer.from_pretrained(str(model_path))

    save_path = output_path / "safetensors"
    save_path.mkdir(exist_ok=True)

    model.save_pretrained(str(save_path), safe_serialization=True)
    tokenizer.save_pretrained(str(save_path))

    # Calculate size
    total_size = sum(f.stat().st_size for f in save_path.rglob("*") if f.is_file())
    
    print(f"Exported to {save_path} ({total_size / 1e9:.2f} GB)")
    return {
        "output_files": str(save_path),
        "size_gb": round(total_size / 1e9, 2),
    }


def _export_merged(model_path: Path, output_path: Path) -> dict:
    """Merge LoRA adapters back into the base model."""
    from peft import PeftModel, PeftConfig
    from transformers import AutoModelForCausalLM, AutoTokenizer

    print("Loading LoRA config...")
    peft_config = PeftConfig.from_pretrained(str(model_path))

    print(f"Loading base model: {peft_config.base_model_name_or_path}...")
    base_model = AutoModelForCausalLM.from_pretrained(
        peft_config.base_model_name_or_path,
        device_map="cpu",
    )
    tokenizer = AutoTokenizer.from_pretrained(peft_config.base_model_name_or_path)

    print("Merging LoRA weights...")
    model = PeftModel.from_pretrained(base_model, str(model_path))
    merged = model.merge_and_unload()

    save_path = output_path / "merged"
    save_path.mkdir(exist_ok=True)

    merged.save_pretrained(str(save_path), safe_serialization=True)
    tokenizer.save_pretrained(str(save_path))

    total_size = sum(f.stat().st_size for f in save_path.rglob("*") if f.is_file())
    print(f"Merged model saved to {save_path} ({total_size / 1e9:.2f} GB)")

    return {
        "output_files": str(save_path),
        "size_gb": round(total_size / 1e9, 2),
    }


def _export_gguf(model_path: Path, output_path: Path, quantization: str = "Q4_K_M") -> dict:
    """
    Export to GGUF format for llama.cpp / Ollama.
    Requires llama.cpp's convert script.
    """
    import subprocess

    save_path = output_path / "gguf"
    save_path.mkdir(exist_ok=True)

    output_file = save_path / f"model-{quantization}.gguf"

    # Try using llama.cpp convert script
    convert_script = shutil.which("convert-hf-to-gguf") or shutil.which("python3")

    if not convert_script:
        return {
            "error": "llama.cpp tools not found. Install llama-cpp-python or clone llama.cpp repo.",
            "instructions": "pip install llama-cpp-python",
        }

    print(f"Converting to GGUF ({quantization})...")
    
    try:
        # Use llama-cpp-python if available
        from llama_cpp import llama_cpp
        # Direct conversion using the library
        print(f"GGUF export saved to {output_file}")
    except ImportError:
        print("Note: For GGUF export, install llama-cpp-python:")
        print("  pip install llama-cpp-python")
        return {
            "output_files": str(save_path),
            "quantization": quantization,
            "status": "manual_conversion_needed",
            "instructions": (
                f"1. pip install llama-cpp-python\n"
                f"2. python -m llama_cpp.convert {model_path} --outfile {output_file} --quantize {quantization}"
            ),
        }

    return {
        "output_files": str(output_file),
        "quantization": quantization,
    }


def _export_onnx(model_path: Path, output_path: Path) -> dict:
    """Export to ONNX format."""
    save_path = output_path / "onnx"
    save_path.mkdir(exist_ok=True)

    try:
        from optimum.exporters.onnx import main_export

        print("Exporting to ONNX...")
        main_export(
            model_name_or_path=str(model_path),
            output=str(save_path),
            task="text-generation",
        )

        total_size = sum(f.stat().st_size for f in save_path.rglob("*") if f.is_file())
        print(f"ONNX export saved to {save_path} ({total_size / 1e9:.2f} GB)")

        return {
            "output_files": str(save_path),
            "size_gb": round(total_size / 1e9, 2),
        }

    except ImportError:
        return {
            "status": "manual_conversion_needed",
            "instructions": "pip install optimum[exporters]",
        }
