"""
BlankWhale Training Orchestrator
Manages the full training pipeline with real-time metrics reporting.
"""

import time
import json
import os
from dataclasses import dataclass, field
from typing import Optional, Callable
from pathlib import Path


@dataclass
class TrainingConfig:
    # Model
    base_model: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    strategy: str = "lora"
    quantization: str = "4bit"
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    lora_target_modules: list = field(
        default_factory=lambda: ["q_proj", "v_proj", "k_proj", "o_proj"]
    )

    # Training
    epochs: int = 3
    batch_size: int = 4
    learning_rate: float = 3e-4
    warmup_steps: int = 100
    max_seq_length: int = 2048
    gradient_accumulation_steps: int = 4
    fp16: bool = True
    scheduler: str = "cosine"
    weight_decay: float = 0.01
    max_grad_norm: float = 1.0

    # Data
    train_file: str = "./data/train.jsonl"
    eval_file: Optional[str] = None
    data_format: str = "alpaca"

    # Output
    output_dir: str = "./output"
    save_steps: int = 500
    eval_steps: int = 250
    logging_steps: int = 10
    push_to_hub: bool = False


class BlankWhaleTrainer:
    """
    Main training orchestrator.
    Connects model loading, data processing, and training
    with real-time metrics reporting back to the UI.
    """

    def __init__(self, config: TrainingConfig, on_metrics: Optional[Callable] = None):
        self.config = config
        self.on_metrics = on_metrics  # Callback to send metrics to UI
        self.model = None
        self.tokenizer = None
        self.training_active = False
        self.current_epoch = 0
        self.current_step = 0

    def _emit(self, event: str, data: dict):
        """Send an event to the UI via callback."""
        if self.on_metrics:
            self.on_metrics({"event": event, "data": data, "timestamp": time.time()})

    def setup(self):
        """Initialize model, tokenizer, and data."""
        from .gpu_detect import detect_hardware
        from .model_loader import ModelConfig, load_model
        from .data_pipeline import DataConfig, preprocess_data

        # Detect hardware
        self._emit("status", {"message": "Detecting hardware..."})
        hw = detect_hardware()
        self._emit("hardware", hw)

        # Load model
        self._emit("status", {"message": f"Loading {self.config.base_model}..."})
        model_config = ModelConfig(
            base_model=self.config.base_model,
            strategy=self.config.strategy,
            quantization=self.config.quantization,
            lora_r=self.config.lora_r,
            lora_alpha=self.config.lora_alpha,
            lora_dropout=self.config.lora_dropout,
            lora_target_modules=self.config.lora_target_modules,
        )
        self.model, self.tokenizer = load_model(model_config, device=hw["device"])
        self._emit("status", {"message": "Model loaded successfully"})

        # Load data
        self._emit("status", {"message": "Processing training data..."})
        data_config = DataConfig(
            train_file=self.config.train_file,
            eval_file=self.config.eval_file,
            format=self.config.data_format,
            max_seq_length=self.config.max_seq_length,
        )
        self.dataset = preprocess_data(data_config)
        self._emit("data_loaded", {
            "train_size": len(self.dataset["train"]),
            "eval_size": len(self.dataset.get("eval", [])),
        })

    def train(self):
        """Run the training loop."""
        from transformers import TrainingArguments, Trainer, TrainerCallback

        self.training_active = True

        # Output directory
        output_dir = Path(self.config.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Custom callback for real-time metrics
        trainer_ref = self

        class MetricsCallback(TrainerCallback):
            def on_log(self, args, state, control, logs=None, **kwargs):
                if logs and trainer_ref.training_active:
                    trainer_ref._emit("metrics", {
                        "step": state.global_step,
                        "epoch": round(state.epoch, 2) if state.epoch else 0,
                        "loss": logs.get("loss"),
                        "learning_rate": logs.get("learning_rate"),
                        "total_steps": state.max_steps,
                    })

            def on_epoch_begin(self, args, state, control, **kwargs):
                trainer_ref.current_epoch = int(state.epoch) + 1
                trainer_ref._emit("epoch_start", {
                    "epoch": trainer_ref.current_epoch,
                    "total_epochs": args.num_train_epochs,
                })

            def on_evaluate(self, args, state, control, metrics=None, **kwargs):
                if metrics:
                    trainer_ref._emit("eval_metrics", {
                        "step": state.global_step,
                        "eval_loss": metrics.get("eval_loss"),
                    })

        # Build training arguments
        training_args = TrainingArguments(
            output_dir=str(output_dir),
            num_train_epochs=self.config.epochs,
            per_device_train_batch_size=self.config.batch_size,
            learning_rate=self.config.learning_rate,
            warmup_steps=self.config.warmup_steps,
            gradient_accumulation_steps=self.config.gradient_accumulation_steps,
            fp16=self.config.fp16,
            logging_steps=self.config.logging_steps,
            save_steps=self.config.save_steps,
            eval_steps=self.config.eval_steps if self.dataset.get("eval") else None,
            eval_strategy="steps" if self.dataset.get("eval") else "no",
            weight_decay=self.config.weight_decay,
            max_grad_norm=self.config.max_grad_norm,
            lr_scheduler_type=self.config.scheduler,
            report_to="none",  # We handle reporting ourselves
            save_total_limit=3,
            load_best_model_at_end=bool(self.dataset.get("eval")),
        )

        # Create HuggingFace Trainer
        self._emit("status", {"message": "Starting training..."})
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=self.dataset["train"],
            eval_dataset=self.dataset.get("eval"),
            tokenizer=self.tokenizer,
            callbacks=[MetricsCallback()],
        )

        try:
            result = trainer.train()
            self._emit("training_complete", {
                "total_steps": result.global_step,
                "train_loss": result.training_loss,
                "train_runtime": result.metrics.get("train_runtime"),
            })

            # Save final model
            self._emit("status", {"message": "Saving model..."})
            trainer.save_model(str(output_dir / "final"))
            self.tokenizer.save_pretrained(str(output_dir / "final"))
            self._emit("status", {"message": "Training complete! Model saved."})

        except KeyboardInterrupt:
            self._emit("status", {"message": "Training interrupted by user"})
        except Exception as e:
            self._emit("error", {"message": str(e)})
            raise
        finally:
            self.training_active = False

    def stop(self):
        """Stop training gracefully."""
        self.training_active = False
        self._emit("status", {"message": "Stopping training..."})


def load_config_from_yaml(path: str) -> TrainingConfig:
    """Load training config from a YAML file."""
    import yaml

    with open(path) as f:
        raw = yaml.safe_load(f)

    model = raw.get("model", {})
    training = raw.get("training", {})
    data = raw.get("data", {})
    output = raw.get("output", {})

    return TrainingConfig(
        base_model=model.get("base", "TinyLlama/TinyLlama-1.1B-Chat-v1.0"),
        strategy=model.get("strategy", "lora"),
        quantization=model.get("quantization", "4bit"),
        lora_r=raw.get("lora", {}).get("r", 16),
        lora_alpha=raw.get("lora", {}).get("alpha", 32),
        lora_dropout=raw.get("lora", {}).get("dropout", 0.05),
        lora_target_modules=raw.get("lora", {}).get(
            "target_modules", ["q_proj", "v_proj", "k_proj", "o_proj"]
        ),
        epochs=training.get("epochs", 3),
        batch_size=training.get("batch_size", 4),
        learning_rate=training.get("learning_rate", 3e-4),
        warmup_steps=training.get("warmup_steps", 100),
        max_seq_length=training.get("max_seq_length", 2048),
        gradient_accumulation_steps=training.get("gradient_accumulation", 4),
        fp16=training.get("fp16", True),
        scheduler=training.get("scheduler", "cosine"),
        train_file=data.get("train_file", "./data/train.jsonl"),
        eval_file=data.get("eval_file"),
        data_format=data.get("format", "alpaca"),
        output_dir=output.get("dir", "./output"),
        save_steps=output.get("save_steps", 500),
        eval_steps=output.get("eval_steps", 250),
        logging_steps=output.get("logging_steps", 10),
    )
