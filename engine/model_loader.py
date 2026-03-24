import os
import logging
import torch
from dataclasses import dataclass, field
from typing import Optional
from .debug_logger import log_function, logger

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


@log_function
def load_model(config: ModelConfig, device: str = "auto"):
    """
    Load a base model and optionally apply LoRA/QLoRA adapters.
    
    Returns:
        tuple: (model, tokenizer)
    """
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    logger.info(f"Loading base model: {config.base_model}")
    logger.info(f"Strategy: {config.strategy}, Quantization: {config.quantization}, Device: {device}")

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
                logger.warning("Quantization (bitsandbytes) is not supported on macOS GPU. Falling back to full precision.")
            else:
                logger.warning("CUDA not available. bitsandbytes quantization requires CUDA. Falling back to full precision.")
            quantization_config = None
        else:
            try:
                if config.quantization == "4bit":
                    quantization_config = BitsAndBytesConfig(
                        load_in_4bit=True,
                        bnb_4bit_compute_dtype=torch.float16,
                        bnb_4bit_quant_type="nf4",
                        bnb_4bit_use_double_quant=True,
                    )
                elif config.quantization == "8bit":
                    quantization_config = BitsAndBytesConfig(load_in_8bit=True)
            except Exception as e:
                logger.warning(f"Quantization failed ({e}). Loading without quantization.")
                quantization_config = None

    # Load model
    load_kwargs = {
        "cache_dir": config.cache_dir,
        "trust_remote_code": True,
        "device_map": device,
    }
    
    if quantization_config:
        load_kwargs["quantization_config"] = quantization_config
        # For QLoRA, use bfloat16 if supported, else float16
        load_kwargs["torch_dtype"] = torch.bfloat16 if torch.cuda.is_available() and torch.cuda.is_bf16_supported() else torch.float16

    try:
        model = AutoModelForCausalLM.from_pretrained(
            config.base_model,
            **load_kwargs,
        )
        
        # Save sanity check
        if config.cache_dir:
            sanity_path = os.path.join(config.cache_dir, "sanity_check")
            os.makedirs(sanity_path, exist_ok=True)
            tokenizer.save_pretrained(sanity_path)
            logger.info(f"Sanity: Tokenizer saved to {sanity_path}")

    except Exception as e:
        logger.error(f"MODEL_LOADER Error: {e}")
        raise e

    # Apply LoRA if needed
    if config.strategy in ("lora", "qlora"):
        model = _apply_lora(model, config)

    # Print model stats
    trainable, total = _count_parameters(model)
    logger.info(f"Total parameters:     {total:,}")
    logger.info(f"Trainable parameters: {trainable:,}")
    logger.info(f"Trainable %:          {100 * trainable / total:.2f}%")

    return model, tokenizer


@log_function
def _apply_lora(model, config: ModelConfig):
    """Apply LoRA adapters to the model."""
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

    if config.quantization != "none":
        logger.info("Preparing model for k-bit training...")
        model = prepare_model_for_kbit_training(model)

    # Enable gradient checkpointing for memory efficiency
    model.gradient_checkpointing_enable()

    lora_config = LoraConfig(
        r=config.lora_r,
        lora_alpha=config.lora_alpha,
        lora_dropout=config.lora_dropout,
        target_modules=config.lora_target_modules,
        bias="none",
        task_type="CAUSAL_LM",
    )

    model = get_peft_model(model, lora_config)
    logger.info(f"LoRA applied: r={config.lora_r}, alpha={config.lora_alpha}")
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
