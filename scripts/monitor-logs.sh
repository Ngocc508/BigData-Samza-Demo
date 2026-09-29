#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

for file in "$LOG_DIR/samza.log" "$LOG_DIR/producer.log" "$LOG_DIR/kafka.log" "$LOG_DIR/zookeeper.log"; do
  if [ ! -f "$file" ]; then
    touch "$file"
  fi
done

echo "[monitor] Theo dõi log: $LOG_DIR"
echo "[monitor] Phím Ctrl+C để dừng"

tail -n 50 -F \
  "$LOG_DIR/samza.log" \
  "$LOG_DIR/producer.log" \
  "$LOG_DIR/kafka.log" \
  "$LOG_DIR/zookeeper.log"
