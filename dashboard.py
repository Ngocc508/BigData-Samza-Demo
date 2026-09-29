import json
import time
from collections import deque
from threading import Lock, Thread

from flask import Flask, jsonify, render_template
from kafka import KafkaConsumer

app = Flask(__name__)

MAX_ITEMS = 20
WINDOW_SECONDS = 60


class StreamMonitor:
    def __init__(self):
        self.order_events = deque(maxlen=MAX_ITEMS)
        self.alert_events = deque(maxlen=MAX_ITEMS)
        self.throughput_history = deque(maxlen=30)
        self.order_history = deque(maxlen=30)
        self.alert_history = deque(maxlen=30)
        self.rule_counts = {}
        self.user_counts = {}
        self.lock = Lock()
        self.consumer = None
        self.thread = None

    def start(self):
        if self.consumer is not None:
            return
        self.consumer = KafkaConsumer(
            'order-events',
            'alert-events',
            bootstrap_servers=['localhost:9092'],
            auto_offset_reset='latest',
            enable_auto_commit=True,
            value_deserializer=lambda v: json.loads(v.decode('utf-8')) if v else None,
            api_version=(0, 10, 1),
            consumer_timeout_ms=1000,
        )
        self.thread = Thread(target=self._consume_loop, daemon=True)
        self.thread.start()

    def _consume_loop(self):
        while True:
            try:
                for msg in self.consumer.poll(timeout_ms=1000, max_records=20).values():
                    for record in msg:
                        payload = record.value
                        if payload is None:
                            continue
                        with self.lock:
                            if record.topic == 'order-events':
                                item = {
                                    'timestamp': payload.get('timestamp', 0),
                                    'userId': payload.get('userId', 'unknown'),
                                    'actionType': payload.get('actionType', 'UNKNOWN'),
                                    'amount': payload.get('amount', 0),
                                }
                                self.order_events.append(item)
                                self.user_counts[item['userId']] = self.user_counts.get(item['userId'], 0) + 1
                            elif record.topic == 'alert-events':
                                item = {
                                    'timestamp': payload.get('createdAt', 0),
                                    'userId': payload.get('userId', 'unknown'),
                                    'ruleCode': payload.get('ruleCode', 'UNKNOWN'),
                                    'severity': payload.get('severity', 'INFO'),
                                    'observedValue': payload.get('observedValue', 0),
                                }
                                self.alert_events.append(item)
                                self.rule_counts[item['ruleCode']] = self.rule_counts.get(item['ruleCode'], 0) + 1
            except Exception:
                time.sleep(1)

    def _throughput(self):
        now_ms = int(time.time() * 1000)
        recent_orders = [
            item for item in self.order_events
            if now_ms - int(item.get('timestamp', 0)) <= 10000
        ]
        return round(len(recent_orders) / 10, 2)

    def _unique_users(self):
        with self.lock:
            users = {item.get('userId') for item in self.order_events}
            return len(users)

    def snapshot(self):
        with self.lock:
            recent_orders = list(self.order_events)
            recent_alerts = list(self.alert_events)

        order_count = len(recent_orders)
        alert_count = len(recent_alerts)
        unique_users = self._unique_users()
        throughput = self._throughput()
        self.throughput_history.append({
            'time': int(time.time()),
            'value': throughput,
        })
        self.order_history.append({
            'time': int(time.time()),
            'value': order_count,
        })
        self.alert_history.append({
            'time': int(time.time()),
            'value': alert_count,
        })

        user_counter = {}
        for item in recent_orders:
            user = item.get('userId', 'unknown')
            user_counter[user] = user_counter.get(user, 0) + 1

        user_alert_counter = {}
        for item in recent_alerts:
            user = item.get('userId', 'unknown')
            user_alert_counter[user] = user_alert_counter.get(user, 0) + 1

        rule_counter = {}
        for item in recent_alerts:
            rule = item.get('ruleCode', 'UNKNOWN')
            rule_counter[rule] = rule_counter.get(rule, 0) + 1

        top_users = sorted(user_counter.items(), key=lambda x: x[1], reverse=True)[:5]
        top_rules = sorted(rule_counter.items(), key=lambda x: x[1], reverse=True)[:5]

        alert_heatmap = []
        for user, order_total in sorted(user_counter.items(), key=lambda x: x[1], reverse=True)[:8]:
            alert_total = user_alert_counter.get(user, 0)
            ratio = round(alert_total / max(order_total, 1), 3)
            if ratio >= 0.8:
                level = 'critical'
            elif ratio >= 0.5:
                level = 'warning'
            elif ratio >= 0.2:
                level = 'watch'
            else:
                level = 'normal'
            alert_heatmap.append({
                'userId': user,
                'orderCount': order_total,
                'alertCount': alert_total,
                'ratio': ratio,
                'level': level,
            })

        severity_summary = {'INFO': 0, 'WARNING': 0, 'CRITICAL': 0}
        for item in recent_alerts:
            severity = str(item.get('severity', 'INFO')).upper()
            if severity not in severity_summary:
                severity_summary[severity] = 0
            severity_summary[severity] += 1

        system_health = {
            'pipeline': 'healthy' if throughput > 0 else 'idle',
            'kafka': 'healthy' if (order_count + alert_count) > 0 else 'idle',
            'storage': 'healthy' if unique_users > 0 else 'warming',
            'alerts': 'critical' if severity_summary.get('CRITICAL', 0) > 0 else 'warning' if severity_summary.get('WARNING', 0) > 0 else 'healthy',
        }

        return {
            'status': 'running',
            'throughput': throughput,
            'total_orders': order_count,
            'total_alerts': alert_count,
            'unique_users': unique_users,
            'recent_orders': list(recent_orders)[-10:],
            'recent_alerts': list(recent_alerts)[-10:],
            'throughput_history': list(self.throughput_history),
            'order_history': list(self.order_history),
            'alert_history': list(self.alert_history),
            'top_users': [{'userId': user, 'count': count} for user, count in top_users],
            'top_rules': [{'ruleCode': rule, 'count': count} for rule, count in top_rules],
            'alert_heatmap': alert_heatmap,
            'system_health': system_health,
            'alert_severity_summary': severity_summary,
        }


monitor = StreamMonitor()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/status')
def api_status():
    return jsonify(monitor.snapshot())


if __name__ == '__main__':
    monitor.start()
    app.run(host='0.0.0.0', port=5000, debug=False)
