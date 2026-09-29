package vn.edu.serde;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.samza.serializers.Serde;

public class JsonSerde<T> implements Serde<T> {
    private final ObjectMapper mapper = new ObjectMapper();
    private final Class<T> clazz;

    public JsonSerde(Class<T> clazz) { this.clazz = clazz; }

    @Override
    public T fromBytes(byte[] bytes) {
        try { return mapper.readValue(bytes, clazz); }
        catch (Exception e) { throw new RuntimeException("Deserialize failed", e); }
    }

    @Override
    public byte[] toBytes(T obj) {
        try { return mapper.writeValueAsBytes(obj); }
        catch (Exception e) { throw new RuntimeException("Serialize failed", e); }
    }
}
