#!/bin/bash
# Setup script for Class Notes Extractor Python dependencies
#
# This creates a Python virtual environment and installs dependencies.
# Virtual environments keep project dependencies isolated from your system Python.
#
# Usage:
#   ./scripts/setup.sh
#
# After running, activate the environment with:
#   source scripts/venv/bin/activate

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"

echo "Setting up Python virtual environment..."

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 not found. Please install Python 3.10 or later."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "Found Python $PYTHON_VERSION"

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment in $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
else
    echo "Virtual environment already exists."
fi

# Activate and install dependencies
echo "Installing dependencies..."
source "$VENV_DIR/bin/activate"
pip install --upgrade pip
pip install -r "$SCRIPT_DIR/requirements.txt"

echo ""
echo "Setup complete!"
echo ""
echo "To use the script:"
echo "  1. Activate the environment:"
echo "     source scripts/venv/bin/activate"
echo ""
echo "  2. Run the processor:"
echo "     python3 scripts/process_video.py ~/Videos/class.mp4 ~/ClassNotes"
echo ""
echo "  3. When done, deactivate with:"
echo "     deactivate"
