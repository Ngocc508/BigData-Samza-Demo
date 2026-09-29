# Demo Samza Order Analytics

Dự án này chứa một job Samza nhận các sự kiện đơn hàng từ Kafka, theo dõi hoạt động của từng người dùng trong local RocksDB state store và phát ra các sự kiện cảnh báo khi vượt ngưỡng.

## Yêu cầu trước khi chạy

- Java 11+
- Maven
- Python 3

## Chạy nhanh

```bash
cd /home/lenovo/samza-demo
./scripts/start-demo.sh
```

Script này sẽ:

- build project nếu cần
- khởi động ZooKeeper và Kafka ở local
- tạo các topic cần thiết
- khởi động producer mẫu
- khởi động job Samza

## Dừng chạy

```bash
cd /home/lenovo/samza-demo
./scripts/stop-demo.sh
```

## Topics

- `order-events`: input stream
- `alert-events`: output alerts
- `order-user-state-changelog`: state store changelog

## Kiểm tra cảnh báo

```bash
cd /home/lenovo/samza-demo
./kafka/kafka_2.13-3.6.1/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic alert-events \
  --from-beginning \
  --max-messages 5
```

## Ghi chú

Producer sử dụng virtual environment đã tạo sẵn ở `venv/` và gửi sự kiện đến Kafka trên `localhost:9092`.
