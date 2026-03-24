# 🐋 BlankWhale — Local AI & Robotics Studio

> **Train private LLMs and robots on your own hardware — no cloud, no leaks, no code required.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20|%20Windows%20|%20Linux-brightgreen)]()
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local-green)]()

---

## What is BlankWhale?

BlankWhale is a **privacy-first desktop application** for training AI models entirely on your own hardware. No data ever leaves your machine. Built for hospitals, law firms, factories, governments, and anyone who needs private AI.

### 🧠 LLM Training Studio
- **Smart Document Extraction** — Drop PDFs, DOCX, TXT, CSV, or images. Our pipeline extracts clean, structured markdown with tables, headers, and semantic boundaries. No more raw chunk garbage.
- **Built-in PII Redaction** — Automatically detect and anonymize emails, phone numbers, names, medical IDs, and more. Uses regex + spaCy NER, all running locally.
- **Auto QA Generation** — Instantly generate training pairs from your documents using vertical templates (Medical, Legal, Knowledge Base, Turkish Medical, Code).
- **No-Code Training** — Visual sliders for chunk size, LoRA rank, learning rate, epochs, batch size. Just drop files and click train.
- **Chat with Your Model** — Test your fine-tuned model instantly in the built-in chat interface.
- **One-Click Export** — Export to safetensors, GGUF (Ollama), ONNX, or merged model.

### 🤖 Robotics & Embodied AI Studio *(Coming Soon)*
- **3D Physics Simulation** — PyBullet + MuJoCo-based training environment with full physics.
- **Visual Scene Builder** — Drag-and-drop floors, walls, objects. Sliders for gravity and friction.
- **RL Training** — Stable-Baselines3 PPO/SAC, with live reward charts and 3D viewport.
- **Natural Language Rewards** — Describe what you want: "pick up fragile objects gently".
- **LLM → Robot Bridge** — Use your trained LLM to command robots via Vision-Language-Action models.

### 🛡️ Enterprise Features
- **Privacy Shield** — Real-time proof that zero bytes left the machine.
- **Audit Logs** — Full compliance logging with "Proof of Local Training" PDF export.
- **Team Templates** — Shared training presets across organizations.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Tauri 2 (Rust) |
| Frontend | React + TypeScript |
| LLM Engine | PyTorch + HuggingFace Transformers + PEFT (LoRA/QLoRA) |
| Document Processing | pdfplumber + PyMuPDF + python-docx + pytesseract |
| PII Detection | Regex + spaCy NER |
| GPU Support | NVIDIA CUDA, Apple Metal (MPS), AMD ROCm |
| Robotics | PyBullet + Gymnasium + Stable-Baselines3 |
| 3D Viewport | Three.js |

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/SiyabongaDlamini/blankWhale.git
cd blankWhale

# Install frontend dependencies
npm install

# Set up Python engine
cd engine && python3 -m venv ai_venv
source ai_venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Run in development
npm run tauri dev
```

Or download the [pre-built app](landing/index.html) for one-click installation.

---

## Supported File Formats

| Format | Extraction Method |
|--------|------------------|
| PDF | pdfplumber (tables/layout) + PyMuPDF (fallback) |
| DOCX | python-docx with heading/table preservation |
| TXT/MD | Direct text loading |
| CSV | Converted to markdown tables |
| JSON/JSONL | Structured preview |
| Images (PNG, JPG, TIFF) | pytesseract OCR |

---

## Training Templates

| Template | Use Case |
|----------|----------|
| Medical QA | Clinical text → diagnosis-style Q&A |
| Legal Summarization | Contracts/legislation → plain language summaries |
| Knowledge Base | Internal docs → factual Q&A pairs |
| Turkish Medical | Tıbbi metinler → Türkçe Soru-Cevap |
| Code QA | Source code → explanation/documentation pairs |

---

## Privacy Guarantee

- ✅ All processing happens on your machine
- ✅ No telemetry, no analytics, no phone-home
- ✅ No cloud APIs — ever
- ✅ Built-in PII redaction for sensitive data
- ✅ Open source under MIT license

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

**Built with ❤️ for privacy-first AI.**
