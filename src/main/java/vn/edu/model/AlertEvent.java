package vn.edu.model;

public class AlertEvent {
    public String alertId;
    public String userId;
    public String ruleCode;
    public String severity;
    public long windowStart;
    public long windowEnd;
    public long observedValue;
    public long threshold;
    public String triggerEventId;
    public long createdAt;

    public AlertEvent() {}
}
