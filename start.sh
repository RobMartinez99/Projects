#!/bin/bash
# Alfred — Start Script
# Usage: ./start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

# Load .env if present
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo ""
  echo "⚠  ANTHROPIC_API_KEY is not set."
  echo "   Create a .env file: cp .env.example .env"
  echo "   Then add your Anthropic API key to .env"
  echo ""
  echo "   Starting anyway — chat will show an error until the key is set."
  echo ""
fi

echo "Starting Alfred..."
python3 "$SCRIPT_DIR/server.py"
