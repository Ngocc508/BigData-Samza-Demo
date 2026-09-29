#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KAFKA_HOME="$PROJECT_ROOT/kafka/kafka_2.13-3.6.1"

for pid in $(pgrep -f 'samza-order-analytics-1.0-SNAPSHOT.jar|load-generator/producer.py|QuorumPeerMain|kafka\.Kafka' || true); do
  echo "Stopping process $pid"
  kill "$pid" || true
done

"$KAFKA_HOME/bin/kafka-server-stop.sh" >/dev/null 2>&1 || true
"$KAFKA_HOME/bin/zookeeper-server-stop.sh" >/dev/null 2>&1 || true

echo "[demo] Shutdown complete."
