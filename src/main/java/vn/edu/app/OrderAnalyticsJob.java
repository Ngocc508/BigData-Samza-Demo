package vn.edu.app;

import org.apache.samza.config.Config;
import org.apache.samza.config.MapConfig;
import org.apache.samza.job.JobRunner;

import java.util.HashMap;
import java.util.Map;

public class OrderAnalyticsJob {
    public static void main(String[] args) throws Exception {
        Map<String, String> configMap = new HashMap<>();
        configMap.put("job.name", "order-analytics-job");
        configMap.put("job.factory.class", "org.apache.samza.job.local.ThreadJobFactory");
        configMap.put("task.class", "vn.edu.task.OrderAnalyticsTask");
        configMap.put("task.inputs", "kafka.order-events");
        configMap.put("job.coordinator.system", "kafka");
        configMap.put("job.default.system", "kafka");

        configMap.put("systems.kafka.samza.factory",
            "org.apache.samza.system.kafka.KafkaSystemFactory");
        configMap.put("systems.kafka.bootstrap.servers", "localhost:9092");
        configMap.put("systems.kafka.consumer.bootstrap.servers", "localhost:9092");
        configMap.put("systems.kafka.producer.bootstrap.servers", "localhost:9092");    
        configMap.put("systems.kafka.consumer.auto.offset.reset", "earliest");
        configMap.put("systems.kafka.producer.acks", "1");

        configMap.put("streams.order-events.samza.system", "kafka");
        configMap.put("streams.order-events.samza.key.serde", "string");
        configMap.put("streams.order-events.samza.serde", "order-event");

        configMap.put("streams.alert-events.samza.system", "kafka");
        configMap.put("streams.alert-events.samza.key.serde", "string");
        configMap.put("streams.alert-events.samza.serde", "alert-event");

        configMap.put("serializers.registry.order-event.class", "vn.edu.serde.JsonSerdeFactory");
        configMap.put("serializers.registry.alert-event.class", "vn.edu.serde.JsonSerdeFactory");
        configMap.put("serializers.registry.user-state.class", "vn.edu.serde.JsonSerdeFactory");
        configMap.put("serializers.registry.string.class", "org.apache.samza.serializers.StringSerdeFactory");


        configMap.put("stores.user-state.factory",
            "org.apache.samza.storage.kv.RocksDbKeyValueStorageEngineFactory");
        configMap.put("stores.user-state.key.serde", "string");
        configMap.put("stores.user-state.msg.serde", "user-state");
        configMap.put("stores.user-state.changelog", "kafka.order-user-state-changelog");
        configMap.put("stores.user-state.rocksdb.block.cache.size", "134217728");
        configMap.put("stores.user-state.rocksdb.write.buffer.size", "33554432");

        configMap.put("task.commit.ms", "10000");
        configMap.put("job.coordinator.replication.factor", "1");
        configMap.put("job.default.stream.replication.factor", "1");
        configMap.put("systems.kafka.default.stream.replication.factor", "1");

        Config config = new MapConfig(configMap);
        JobRunner runner = new JobRunner(config);
        runner.run(true);
    }
}