#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$PROJECT_ROOT/venv"
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
fi

"$VENV_DIR/bin/pip" install -q Flask kafka-python >/dev/null 2>&1 || true

if pgrep -f 'dashboard.py' >/dev/null 2>&1; then
  echo "[dashboard] Web dashboard already running"
  exit 0
fi

nohup "$VENV_DIR/bin/python" "$PROJECT_ROOT/dashboard.py" > "$LOG_DIR/dashboard.log" 2>&1 &

echo "[dashboard] Dashboard is starting on http://localhost:5000"
