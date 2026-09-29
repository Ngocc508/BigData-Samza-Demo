import json
import random
import time
import uuid
import sys
import os
from kafka import KafkaProducer

BROKER = "localhost:9092"
TOPIC = "order-events"

USERS = [f"user-{i:05d}" for i in range(200)]
ACTIONS = ["VIEW", "ADD_TO_CART", "CHECKOUT", "PAY_FAIL"]
ACTION_WEIGHTS = [0.60, 0.25, 0.10, 0.05]

HIGH_RATE_USERS = set(random.sample(USERS, 3))
PAY_FAIL_USERS = set(random.sample(USERS, 2))

# Ghi ground truth ra file để dùng cho alert_accuracy.py sau này
ground_truth_path = os.path.join(os.path.dirname(__file__), "ground_truth.txt")
with open(ground_truth_path, "w") as f:
    f.write("HIGH_RATE_USERS=" + ",".join(HIGH_RATE_USERS) + "\n")
    f.write("PAY_FAIL_USERS=" + ",".join(PAY_FAIL_USERS) + "\n")

print(f"Ground truth saved: {ground_truth_path}")
print(f"  HIGH_RATE_USERS: {sorted(HIGH_RATE_USERS)}")
print(f"  PAY_FAIL_USERS: {sorted(PAY_FAIL_USERS)}")

producer = KafkaProducer(
    bootstrap_servers=BROKER,
    key_serializer=lambda k: k.encode('utf-8'),
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    acks=1,
    linger_ms=10
)

seq = {u: 0 for u in USERS}

def make_event(user_id, forced_action=None):
    seq[user_id] += 1
    action = forced_action or random.choices(ACTIONS, ACTION_WEIGHTS)[0]
    amount = 0
    if action == "CHECKOUT":
        amount = random.randint(50000, 500000)
    return {
        "eventId": str(uuid.uuid4()),
        "userId": user_id,
        "itemId": f"item-{random.randint(1, 500):04d}",
        "actionType": action,
        "amount": amount,
        "timestamp": int(time.time() * 1000),
        "sequenceNo": seq[user_id]
    }

def produce(target_rate):
    interval = 1.0 / target_rate
    count = 0
    start = time.time()
    print(f"Producing at ~{target_rate} records/s...")
    try:
        while True:
            user = random.choice(USERS)
            if user in HIGH_RATE_USERS:
                action = "CHECKOUT"
            elif user in PAY_FAIL_USERS:
                action = "PAY_FAIL"
            else:
                action = None
            event = make_event(user, action)
            producer.send(TOPIC, key=user, value=event)
            count += 1
            if count % 1000 == 0:
                elapsed = time.time() - start
                print(f"  Sent {count} events in {elapsed:.1f}s ({count/elapsed:.0f} rec/s)")
            time.sleep(interval)
    except KeyboardInterrupt:
        producer.flush()
        print(f"\nStopped. Total sent: {count}")

if __name__ == "__main__":
    rate = int(sys.argv[1]) if len(sys.argv) > 1 else 200
    produce(rate)