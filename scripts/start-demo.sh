#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KAFKA_HOME="$PROJECT_ROOT/kafka/kafka_2.13-3.6.1"
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

if [ ! -f "$PROJECT_ROOT/target/samza-order-analytics-1.0-SNAPSHOT.jar" ]; then
  echo "[demo] Building project jar..."
  (cd "$PROJECT_ROOT" && mvn -q clean package)
fi

if ! pgrep -f 'QuorumPeerMain' >/dev/null 2>&1; then
  echo "[demo] Starting ZooKeeper..."
  nohup "$KAFKA_HOME/bin/zookeeper-server-start.sh" "$KAFKA_HOME/config/zookeeper.properties" > "$LOG_DIR/zookeeper.log" 2>&1 &
else
  echo "[demo] ZooKeeper already running"
fi

sleep 5

if ! pgrep -f 'kafka\.Kafka' >/dev/null 2>&1; then
  echo "[demo] Starting Kafka..."
  nohup "$KAFKA_HOME/bin/kafka-server-start.sh" "$KAFKA_HOME/config/server.properties" > "$LOG_DIR/kafka.log" 2>&1 &
else
  echo "[demo] Kafka already running"
fi

sleep 10

for topic in order-events alert-events order-user-state-changelog; do
  "$KAFKA_HOME/bin/kafka-topics.sh" \
    --bootstrap-server localhost:9092 \
    --create \
    --topic "$topic" \
    --partitions 3 \
    --replication-factor 1 \
    --if-not-exists >/dev/null 2>&1 || true
  done

if [ ! -d "$PROJECT_ROOT/venv" ]; then
  echo "[demo] Creating Python virtual environment..."
  python3 -m venv "$PROJECT_ROOT/venv"
fi

"$PROJECT_ROOT/venv/bin/pip" install -q kafka-python >/dev/null 2>&1 || true

if ! pgrep -f 'python.*load-generator/producer.py' >/dev/null 2>&1; then
  echo "[demo] Starting producer..."
  nohup "$PROJECT_ROOT/venv/bin/python" "$PROJECT_ROOT/load-generator/producer.py" 5 > "$LOG_DIR/producer.log" 2>&1 &
else
  echo "[demo] Producer already running"
fi

if ! pgrep -f 'samza-order-analytics-1.0-SNAPSHOT.jar' >/dev/null 2>&1; then
  echo "[demo] Starting Samza job..."
  nohup java -jar "$PROJECT_ROOT/target/samza-order-analytics-1.0-SNAPSHOT.jar" > "$LOG_DIR/samza.log" 2>&1 &
else
  echo "[demo] Samza job already running"
fi

echo "[demo] Started successfully."
echo "[demo] Logs: $LOG_DIR"
echo "[demo] To stop: ./scripts/stop-demo.sh"
