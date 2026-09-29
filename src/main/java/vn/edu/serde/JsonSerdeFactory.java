package vn.edu.serde;

import org.apache.samza.config.Config;
import org.apache.samza.serializers.Serde;
import org.apache.samza.serializers.SerdeFactory;
import vn.edu.model.AlertEvent;
import vn.edu.model.OrderEvent;
import vn.edu.model.UserState;

public class JsonSerdeFactory implements SerdeFactory<Object> {
    @Override
    @SuppressWarnings("unchecked")
    public Serde<Object> getSerde(String name, Config config) {
        switch (name) {
            case "order-event":
                return (Serde<Object>)(Serde<?>) new JsonSerde<>(OrderEvent.class);
            case "alert-event":
                return (Serde<Object>)(Serde<?>) new JsonSerde<>(AlertEvent.class);
            case "user-state":
                return (Serde<Object>)(Serde<?>) new JsonSerde<>(UserState.class);
            default:
                throw new IllegalArgumentException("Unknown serde: " + name);
        }
    }
}