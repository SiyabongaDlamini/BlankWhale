"""
BlankWhale Data Pipeline
Load, clean, format, and tokenize datasets for training.
"""

import json
import csv
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class DataConfig:
    train_file: str = "./data/train.jsonl"
    eval_file: Optional[str] = None
    format: str = "alpaca"          # alpaca | sharegpt | completion
    max_seq_length: int = 2048
    num_workers: int = 4
    shuffle: bool = True
    validation_split: float = 0.1


def load_raw_data(path: str) -> list[dict]:
    """Load raw data from file."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Data file not found: {path}")

    if p.suffix == ".jsonl":
        data = []
        with open(p, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    data.append(json.loads(line))
        return data

    elif p.suffix == ".json":
        with open(p, encoding="utf-8") as f:
            result = json.load(f)
            return result if isinstance(result, list) else [result]

    elif p.suffix == ".csv":
        data = []
        with open(p, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(dict(row))
        return data

    elif p.suffix == ".txt":
        with open(p, encoding="utf-8") as f:
            return [{"text": f.read()}]

    else:
        raise ValueError(f"Unsupported file format: {p.suffix}")


def format_alpaca(example: dict) -> str:
    """Format in Alpaca instruction style."""
    instruction = example.get("instruction", "")
    input_text = example.get("input", "")
    output_text = example.get("output", "")

    if input_text:
        return (
            f"### Instruction:\n{instruction}\n\n"
            f"### Input:\n{input_text}\n\n"
            f"### Response:\n{output_text}"
        )
    return (
        f"### Instruction:\n{instruction}\n\n"
        f"### Response:\n{output_text}"
    )


def format_sharegpt(example: dict) -> list[dict]:
    """Format ShareGPT conversations."""
    conversations = example.get("conversations", [])
    return [
        {"role": turn.get("from", "user"), "content": turn.get("value", "")}
        for turn in conversations
    ]


def format_completion(example: dict) -> str:
    """Simple text completion format."""
    return example.get("text", "")


FORMATTERS = {
    "alpaca": format_alpaca,
    "sharegpt": format_sharegpt,
    "completion": format_completion,
}


def preprocess_data(config: DataConfig) -> dict:
    """
    Full preprocessing pipeline.
    
    Returns:
        dict with 'train' and optionally 'eval' splits
    """
    print(f"Loading data from {config.train_file}...")
    raw_data = load_raw_data(config.train_file)
    print(f"Loaded {len(raw_data)} examples")

    formatter = FORMATTERS.get(config.format, format_alpaca)

    # Format all examples
    formatted = []
    skipped = 0
    for example in raw_data:
        try:
            result = formatter(example)
            if result:
                formatted.append(result)
        except Exception:
            skipped += 1

    if skipped > 0:
        print(f"Skipped {skipped} malformed examples")

    print(f"Formatted {len(formatted)} examples using '{config.format}' format")

    # Split into train/eval
    if config.eval_file:
        eval_raw = load_raw_data(config.eval_file)
        eval_formatted = [formatter(ex) for ex in eval_raw]
        return {"train": formatted, "eval": eval_formatted}

    elif config.validation_split > 0:
        split_idx = int(len(formatted) * (1 - config.validation_split))
        return {
            "train": formatted[:split_idx],
            "eval": formatted[split_idx:],
        }

    return {"train": formatted, "eval": []}


def tokenize_dataset(data: list, tokenizer, max_length: int = 2048) -> list[dict]:
    """Tokenize a list of text examples."""
    tokenized = []
    for item in data:
        text = item if isinstance(item, str) else json.dumps(item)
        tokens = tokenizer(
            text,
            max_length=max_length,
            truncation=True,
            padding="max_length",
            return_tensors="pt",
        )
        tokenized.append({
            "input_ids": tokens["input_ids"].squeeze(),
            "attention_mask": tokens["attention_mask"].squeeze(),
        })
    return tokenized
