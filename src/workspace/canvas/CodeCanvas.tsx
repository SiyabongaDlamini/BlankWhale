import { useState, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { Plus, Play, FileCode2, FileJson, FileText } from 'lucide-react';

interface CodeFile {
  name: string;
  language: string;
  content: string;
}

const DEFAULT_FILES: CodeFile[] = [
  {
    name: 'train_config.yaml',
    language: 'yaml',
    content: `# BlankWhale Training Configuration
# Edit these parameters to customize your training run

model:
  base: "meta-llama/Llama-3.1-8B"
  strategy: "lora"        # lora | qlora | full
  quantization: "4bit"    # 4bit | 8bit | none

lora:
  r: 16
  alpha: 32
  dropout: 0.05
  target_modules:
    - q_proj
    - v_proj
    - k_proj
    - o_proj

training:
  epochs: 5
  batch_size: 16
  learning_rate: 3.0e-4
  warmup_steps: 100
  max_seq_length: 2048
  gradient_accumulation: 4
  fp16: true
  scheduler: "cosine"

data:
  train_file: "./data/train.jsonl"
  eval_file: "./data/eval.jsonl"
  format: "alpaca"         # alpaca | sharegpt | completion
  num_workers: 4

output:
  dir: "./output"
  save_steps: 500
  eval_steps: 250
  logging_steps: 10
  push_to_hub: false
`,
  },
  {
    name: 'custom_loss.py',
    language: 'python',
    content: `"""
Custom loss function for BlankWhale training.
Override the default cross-entropy loss with your own implementation.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class FocalLoss(nn.Module):
    """
    Focal Loss for handling class imbalance in training data.
    Reduces the loss for well-classified examples, focusing
    training on hard, misclassified examples.
    """

    def __init__(self, alpha: float = 0.25, gamma: float = 2.0):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        ce_loss = F.cross_entropy(logits, targets, reduction="none")
        pt = torch.exp(-ce_loss)
        focal_loss = self.alpha * (1 - pt) ** self.gamma * ce_loss
        return focal_loss.mean()


class ContrastiveLoss(nn.Module):
    """
    Contrastive loss for learning better token embeddings.
    Pulls similar tokens closer and pushes dissimilar ones apart.
    """

    def __init__(self, temperature: float = 0.07):
        super().__init__()
        self.temperature = temperature

    def forward(self, embeddings: torch.Tensor, labels: torch.Tensor) -> torch.Tensor:
        embeddings = F.normalize(embeddings, dim=1)
        similarity = torch.matmul(embeddings, embeddings.T) / self.temperature

        # Create mask for positive pairs
        mask = labels.unsqueeze(0) == labels.unsqueeze(1)
        mask.fill_diagonal_(False)

        # InfoNCE loss
        exp_sim = torch.exp(similarity)
        log_prob = similarity - torch.log(exp_sim.sum(dim=1, keepdim=True))
        loss = -(mask * log_prob).sum(dim=1) / mask.sum(dim=1).clamp(min=1)

        return loss.mean()


# Register your custom loss
def get_loss_function(name: str = "focal") -> nn.Module:
    losses = {
        "focal": FocalLoss(),
        "contrastive": ContrastiveLoss(),
        "cross_entropy": nn.CrossEntropyLoss(),
    }
    return losses.get(name, nn.CrossEntropyLoss())
`,
  },
  {
    name: 'data_pipeline.py',
    language: 'python',
    content: `"""
Data pipeline for BlankWhale training.
Handles loading, cleaning, tokenizing, and batching your dataset.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Optional
import json


@dataclass
class DataConfig:
    train_file: str
    eval_file: Optional[str] = None
    format: str = "alpaca"          # alpaca | sharegpt | completion
    max_seq_length: int = 2048
    num_workers: int = 4


def load_dataset(config: DataConfig) -> dict:
    """Load and parse the training dataset."""
    path = Path(config.train_file)

    if not path.exists():
        raise FileNotFoundError(f"Training file not found: {path}")

    if path.suffix == ".jsonl":
        data = []
        with open(path) as f:
            for line in f:
                data.append(json.loads(line))
        return {"train": data}

    elif path.suffix == ".json":
        with open(path) as f:
            return {"train": json.load(f)}

    elif path.suffix == ".csv":
        import csv
        data = []
        with open(path) as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(dict(row))
        return {"train": data}

    else:
        raise ValueError(f"Unsupported file format: {path.suffix}")


def format_alpaca(example: dict) -> str:
    """Format an example in Alpaca instruction format."""
    instruction = example.get("instruction", "")
    input_text = example.get("input", "")
    output = example.get("output", "")

    if input_text:
        return (
            f"### Instruction:\\n{instruction}\\n\\n"
            f"### Input:\\n{input_text}\\n\\n"
            f"### Response:\\n{output}"
        )
    return (
        f"### Instruction:\\n{instruction}\\n\\n"
        f"### Response:\\n{output}"
    )


def format_sharegpt(example: dict) -> list[dict]:
    """Format a ShareGPT conversation."""
    conversations = example.get("conversations", [])
    return [
        {"role": turn.get("from", "user"), "content": turn.get("value", "")}
        for turn in conversations
    ]


def preprocess(config: DataConfig):
    """Full preprocessing pipeline."""
    print(f"Loading dataset from {config.train_file}...")
    dataset = load_dataset(config)

    formatter = {
        "alpaca": format_alpaca,
        "sharegpt": format_sharegpt,
    }.get(config.format, format_alpaca)

    processed = []
    for example in dataset["train"]:
        processed.append(formatter(example))

    print(f"Processed {len(processed)} examples")
    print(f"Format: {config.format}")
    print(f"Max sequence length: {config.max_seq_length}")

    return processed
`,
  },
  {
    name: 'run_training.py',
    language: 'python',
    content: `"""
BlankWhale Training Runner
Execute this script to start training from the command line.

Usage:
    python run_training.py --config train_config.yaml
"""

import argparse
import yaml
import torch
from pathlib import Path


def detect_hardware():
    """Detect available compute hardware."""
    info = {
        "device": "cpu",
        "gpu_name": None,
        "gpu_memory": None,
        "cuda_version": None,
    }

    if torch.cuda.is_available():
        info["device"] = "cuda"
        info["gpu_name"] = torch.cuda.get_device_name(0)
        info["gpu_memory"] = f"{torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB"
        info["cuda_version"] = torch.version.cuda
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        info["device"] = "mps"  # Apple Silicon
        info["gpu_name"] = "Apple Silicon (Metal)"

    return info


def load_config(path: str) -> dict:
    """Load YAML training configuration."""
    with open(path) as f:
        return yaml.safe_load(f)


def main():
    parser = argparse.ArgumentParser(description="BlankWhale Training")
    parser.add_argument("--config", type=str, default="train_config.yaml")
    args = parser.parse_args()

    # Load config
    config = load_config(args.config)
    print("=" * 60)
    print("  BlankWhale Training Engine")
    print("=" * 60)

    # Detect hardware
    hw = detect_hardware()
    print(f"  Device:       {hw['device']}")
    print(f"  GPU:          {hw['gpu_name'] or 'None'}")
    print(f"  GPU Memory:   {hw['gpu_memory'] or 'N/A'}")
    print(f"  CUDA:         {hw['cuda_version'] or 'N/A'}")
    print(f"  PyTorch:      {torch.__version__}")
    print("=" * 60)

    # Model info
    model_cfg = config.get("model", {})
    print(f"  Base Model:   {model_cfg.get('base', 'N/A')}")
    print(f"  Strategy:     {model_cfg.get('strategy', 'lora')}")
    print(f"  Quantization: {model_cfg.get('quantization', 'none')}")

    # Training info
    train_cfg = config.get("training", {})
    print(f"  Epochs:       {train_cfg.get('epochs', 3)}")
    print(f"  Batch Size:   {train_cfg.get('batch_size', 8)}")
    print(f"  LR:           {train_cfg.get('learning_rate', 3e-4)}")
    print("=" * 60)
    print()

    # TODO: Actual training will be wired here when the
    # Python engine (Phase 6) is implemented.
    print("Training engine is ready.")
    print("Connect this to BlankWhale desktop for full training.")


if __name__ == "__main__":
    main()
`,
  },
];

function getFileIcon(name: string) {
  if (name.endsWith('.py')) return <FileCode2 className="w-3.5 h-3.5" style={{ color: '#3572A5' }} />;
  if (name.endsWith('.yaml') || name.endsWith('.yml')) return <FileText className="w-3.5 h-3.5" style={{ color: '#cb171e' }} />;
  if (name.endsWith('.json')) return <FileJson className="w-3.5 h-3.5" style={{ color: '#f1e05a' }} />;
  return <FileCode2 className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />;
}

export default function CodeCanvas() {
  const [files] = useState<CodeFile[]>(DEFAULT_FILES);
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [fileContents, setFileContents] = useState<Record<number, string>>(
    Object.fromEntries(DEFAULT_FILES.map((f, i) => [i, f.content]))
  );
  const editorRef = useRef<any>(null);

  const activeFile = files[activeFileIdx];

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setFileContents(prev => ({ ...prev, [activeFileIdx]: value }));
    }
  };

  const handleRun = () => {
    // In Phase 6, this will send the config/script to the Python training engine
    console.log(`Running ${activeFile.name}...`);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* File Tabs */}
      <div
        className="flex items-center border-b flex-shrink-0 overflow-x-auto"
        style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-panel)' }}
      >
        {files.map((file, idx) => (
          <button
            key={file.name}
            onClick={() => setActiveFileIdx(idx)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-r transition-colors flex-shrink-0 ${
              idx === activeFileIdx ? 'border-b-2' : ''
            }`}
            style={{
              borderColor: 'var(--border-panel)',
              borderBottomColor: idx === activeFileIdx ? '#0071e3' : 'transparent',
              background: idx === activeFileIdx ? 'var(--bg-panel)' : 'var(--bg-surface)',
              color: idx === activeFileIdx ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {getFileIcon(file.name)}
            {file.name}
            {fileContents[idx] !== file.content && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1" title="Modified" />
            )}
          </button>
        ))}

        {/* Add file button */}
        <button
          className="p-2 hover:bg-[var(--bg-surface)] transition-colors flex-shrink-0"
          title="New file"
        >
          <Plus className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        </button>

        {/* Spacer */}
        <div className="flex-1" style={{ background: 'var(--bg-surface)' }} />

        {/* Run button */}
        <button
          onClick={handleRun}
          className="flex items-center gap-1.5 px-3 py-1.5 m-1 rounded text-xs font-semibold transition-colors"
          style={{ background: 'rgba(0, 113, 227, 0.08)', color: '#0071e3' }}
        >
          <Play className="w-3 h-3" />
          Run
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={activeFile.language}
          value={fileContents[activeFileIdx]}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="light"
          options={{
            fontSize: 13,
            fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
            minimap: { enabled: true, maxColumn: 80 },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            renderLineHighlight: 'gutter',
            bracketPairColorization: { enabled: true },
            autoClosingBrackets: 'always',
            tabSize: 4,
            wordWrap: 'on',
            padding: { top: 12 },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            suggest: { showKeywords: true, showSnippets: true },
            folding: true,
            foldingHighlight: true,
            guides: { indentation: true, bracketPairs: true },
          }}
        />
      </div>
    </div>
  );
}
