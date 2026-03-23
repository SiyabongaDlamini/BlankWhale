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


def load_pdf(path: Path) -> str:
    """Extract and clean text from PDF using PyMuPDF."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise ImportError("PyMuPDF not found. Install with: pip install pymupdf")

    doc = fitz.open(path)
    text_blocks = []
    for page in doc:
        # Extract text as blocks to better preserve structure
        blocks = page.get_text("blocks")
        for b in blocks:
            # b[4] is the text content of the block
            block_text = b[4].strip()
            if block_text:
                text_blocks.append(block_text)
    doc.close()
    
    # Join blocks and normalize whitespace
    combined_text = "\n\n".join(text_blocks)
    import re
    # Remove multiple spaces and normalize newlines
    combined_text = re.sub(r' +', ' ', combined_text)
    combined_text = re.sub(r'\n{3,}', '\n\n', combined_text)
    
    return combined_text.strip()


def chunk_text(text: str, chunk_size: int = 1024, overlap: int = 200) -> list[str]:
    """
    Split text into overlapping chunks, attempting to keep paragraphs together.
    """
    if not text or len(text) <= chunk_size:
        return [text] if text else []

    # Try to split by double newlines (paragraphs) first
    paragraphs = text.split("\n\n")
    chunks = []
    current_chunk = ""

    for p in paragraphs:
        p = p.strip()
        if not p:
            continue
            
        # If adding this paragraph exceeds chunk_size, save current_chunk
        if current_chunk and len(current_chunk) + len(p) > chunk_size:
            chunks.append(current_chunk.strip())
            # Start new chunk with some overlap if possible
            overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
            current_chunk = overlap_text + "\n\n" + p
        else:
            if current_chunk:
                current_chunk += "\n\n" + p
            else:
                current_chunk = p
                
    if current_chunk:
        chunks.append(current_chunk.strip())

    # If any chunk is still too large (e.g. one giant paragraph), handle it with hard splits
    final_chunks = []
    for c in chunks:
        if len(c) > chunk_size + overlap:
            # Fallback to character-based split for huge blocks
            sub_start = 0
            while sub_start < len(c):
                sub_end = sub_start + chunk_size
                final_chunks.append(c[sub_start:sub_end])
                sub_start += (chunk_size - overlap)
                if len(c) - sub_start < overlap:
                    break
        else:
            final_chunks.append(c)

    return final_chunks


def load_raw_data(path: str, chunk_size: int = 4000, overlap: int = 400) -> list[dict]:
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
            text = f.read()
            chunks = chunk_text(text, chunk_size, overlap)
            return [{"text": c} for c in chunks]

    elif p.suffix == ".pdf":
        text = load_pdf(p)
        chunks = chunk_text(text, chunk_size, overlap)
        return [{"text": c} for c in chunks]

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
    # Map max_seq_length to rough character chunk size (approx 4 chars/token)
    chunk_size = config.max_seq_length * 4
    overlap = int(chunk_size * 0.15)
    
    raw_data = load_raw_data(config.train_file, chunk_size=chunk_size, overlap=overlap)
    print(f"Loaded {len(raw_data)} chunks/examples")

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
        eval_raw = load_raw_data(config.eval_file, chunk_size=chunk_size, overlap=overlap)
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
