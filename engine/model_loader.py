"""
BlankWhale Model Loader
Load base models from HuggingFace for fine-tuning.
"""

import os
import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger("blankwhale.model_loader")


@dataclass
class ModelConfig:
    base_model: str = "meta-llama/Llama-3.1-8B"
    strategy: str = "lora"          # lora | qlora | full
    quantization: str = "4bit"      # 4bit | 8bit | none
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    lora_target_modules: list = field(
        default_factory=lambda: ["q_proj", "v_proj", "k_proj", "o_proj"]
    )
    cache_dir: Optional[str] = None


def load_model(config: ModelConfig, device: str = "auto"):
    """
    Load a base model and optionally apply LoRA/QLoRA adapters.
    
    Returns:
        tuple: (model, tokenizer)
    """
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

    print(f"Loading base model: {config.base_model}")
    print(f"Strategy: {config.strategy}, Quantization: {config.quantization}")

    tokenizer = AutoTokenizer.from_pretrained(
        config.base_model,
        cache_dir=config.cache_dir,
        trust_remote_code=True,
    )

    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Quantization config
    quantization_config = None
    import sys
    if config.strategy in ("qlora", "lora") and config.quantization != "none":
        import torch
        if not torch.cuda.is_available() or sys.platform == "darwin":
            if sys.platform == "darwin":
                print("Warning: Quantization (bitsandbytes) is not supported on macOS GPU. Falling back to full precision.")
            else:
                print("Warning: CUDA not available. bitsandbytes quantization requires CUDA. Falling back to full precision.")
            quantization_config = None
        else:
            try:
                if config.quantization == "4bit":
                    quantization_config = BitsAndBytesConfig(
                        load_in_4bit=True,
                        bnb_4bit_compute_dtype="float16",
                        bnb_4bit_quant_type="nf4",
                        bnb_4bit_use_double_quant=True,
                    )
                elif config.quantization == "8bit":
                    quantization_config = BitsAndBytesConfig(load_in_8bit=True)
            except Exception as e:
                print(f"Warning: Quantization failed ({e}). Loading without quantization.")
                quantization_config = None

    # Load model
    load_kwargs = {
        "cache_dir": config.cache_dir,
        "trust_remote_code": True,
        "device_map": device,
    }
    logger.info(f"MODEL_LOADER: Loading model from {config.base_model}, cache_dir={config.cache_dir}, device={device}")
    if quantization_config:
        load_kwargs["quantization_config"] = quantization_config

    try:
        model = AutoModelForCausalLM.from_pretrained(
            config.base_model,
            **load_kwargs,
        )
    except Exception as e:
        logger.error(f"MODEL_LOADER Error: {e}")
        raise e

    # Apply LoRA if needed
    if config.strategy in ("lora", "qlora"):
        model = _apply_lora(model, config)

    # Print model stats
    trainable, total = _count_parameters(model)
    print(f"Total parameters:     {total:,}")
    print(f"Trainable parameters: {trainable:,}")
    print(f"Trainable %:          {100 * trainable / total:.2f}%")

    return model, tokenizer


def _apply_lora(model, config: ModelConfig):
    """Apply LoRA adapters to the model."""
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

    if config.quantization != "none":
        model = prepare_model_for_kbit_training(model)

    lora_config = LoraConfig(
        r=config.lora_r,
        lora_alpha=config.lora_alpha,
        lora_dropout=config.lora_dropout,
        target_modules=config.lora_target_modules,
        bias="none",
        task_type="CAUSAL_LM",
    )

    model = get_peft_model(model, lora_config)
    print(f"LoRA applied: r={config.lora_r}, alpha={config.lora_alpha}")
    return model


def _count_parameters(model) -> tuple:
    """Count trainable and total parameters."""
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    return trainable, total


# Popular models for quick access
POPULAR_MODELS = {
    "llama-3.1-8b": "meta-llama/Llama-3.1-8B",
    "llama-3.1-70b": "meta-llama/Llama-3.1-70B",
    "mistral-7b": "mistralai/Mistral-7B-v0.3",
    "phi-3-mini": "microsoft/Phi-3-mini-4k-instruct",
    "gemma-2b": "google/gemma-2b",
    "gemma-7b": "google/gemma-7b",
    "qwen2-7b": "Qwen/Qwen2-7B",
    "tinyllama": "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
}
