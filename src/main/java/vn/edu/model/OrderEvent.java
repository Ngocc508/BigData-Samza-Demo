package vn.edu.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class OrderEvent {
    public String eventId;
    public String userId;
    public String itemId;
    public String actionType;
    public long amount;
    public long timestamp;
    public long sequenceNo;

    public OrderEvent() {}
}
