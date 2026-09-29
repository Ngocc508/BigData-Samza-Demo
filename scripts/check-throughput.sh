#!/usr/bin/env bash
set -euo pipefail

TOPIC="${1:-order-events}"
WINDOW_SECONDS="${2:-10}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KAFKA_BIN="$PROJECT_ROOT/kafka/kafka_2.13-3.6.1/bin"

get_offset_total() {
  local topic="$1"

  if ! "$KAFKA_BIN/kafka-run-class.sh" kafka.tools.GetOffsetShell --broker-list localhost:9092 --topic "$topic" >/tmp/offsets.txt 2>/dev/null; then
    echo "0"
    return 0
  fi

  awk -F: '{sum += $NF} END {print sum + 0}' /tmp/offsets.txt
}

if ! pgrep -f 'kafka\.Kafka' >/dev/null 2>&1; then
  echo "[throughput] Kafka chưa chạy. Hãy chạy ./scripts/start-demo.sh trước."
  exit 1
fi

start_total=$(get_offset_total "$TOPIC")
start_epoch=$(date +%s)

sleep "$WINDOW_SECONDS"
end_total=$(get_offset_total "$TOPIC")
end_epoch=$(date +%s)

messages=$((end_total - start_total))
duration=$((end_epoch - start_epoch))
if [ "$duration" -le 0 ]; then
  duration=1
fi

rate=$(awk -v m="$messages" -v d="$duration" 'BEGIN { printf "%.2f", m / d }')

echo "[throughput] Topic: $TOPIC"
echo "[throughput] Khoảng thời gian: ${WINDOW_SECONDS}s"
echo "[throughput] Số tin nhắn mới: $messages"
echo "[throughput] Throughput: ${rate} msg/s"
