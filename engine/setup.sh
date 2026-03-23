#!/bin/bash
set -e

# Disable python output buffering so Tauri can read lines immediately
export PYTHONUNBUFFERED=1

echo "[BlankWhale] Starting AI Engine initialization..."

# 1. Find a reliable Python 3 executable
PYTHON=""
CANDIDATES=(
    "/usr/local/bin/python3.11"
    "/usr/local/bin/python3.12"
    "/opt/homebrew/bin/python3"
    "/usr/local/bin/python3"
    "python3"
    "/usr/bin/python3"
)

for p in "${CANDIDATES[@]}"; do
    if command -v "$p" >/dev/null 2>&1; then
        if "$p" -c "import sys; sys.exit(0 if sys.version_info >= (3, 8) and sys.version_info < (3, 13) else 1)" >/dev/null 2>&1; then
            PYTHON="$p"
            break
        fi
    fi
done

if [ -z "$PYTHON" ]; then
    echo "[Error] Stable Python (3.8 - 3.12) not found. PyTorch may not support newer versions yet."
    echo "Using fallback: $PYTHON"
    PYTHON="python3"
fi

echo "[BlankWhale] Using Python: $PYTHON"

# 2. Check or create the isolated virtual environment
VENV_DIR="ai_venv"

if [ ! -f "$VENV_DIR/bin/activate" ]; then
    echo "[BlankWhale] Isolated AI environment not found."
    echo "[BlankWhale] Creating high-performance AI virtual environment in $VENV_DIR..."
    "$PYTHON" -m venv "$VENV_DIR"
fi

# 3. Activate environment
source "$VENV_DIR/bin/activate"

# 4. Verify and install dependencies
echo "[BlankWhale] Checking dependencies (PyTorch, Transformers, etc.)..."
echo "[BlankWhale] Note: If this is the first time, downloading AI frameworks may take several minutes."

# Install required packages
pip install --upgrade pip >/dev/null 2>&1
pip install -r engine/requirements.txt

# 5. Start the Engine
echo "[BlankWhale] Environment ready! Starting BlankWhale engine..."
exec python -m engine.server
