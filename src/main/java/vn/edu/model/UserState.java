package vn.edu.model;

import java.util.ArrayDeque;
import java.util.Deque;

public class UserState {
    public Deque<EventRecord> window = new ArrayDeque<>();
    public int eventCount30s = 0;
    public int orderCount30s = 0;
    public long successAmount30s = 0L;
    public int consecutivePayFail = 0;
    public long lastEventTimestamp = 0L;
    public long lastHighRateAlertTime = 0L;
    public long lastFailAlertTime = 0L;

    public static class EventRecord {
        public long ts;
        public String actionType;
        public long amount;
        public EventRecord() {}
        public EventRecord(long ts, String actionType, long amount) {
            this.ts = ts; this.actionType = actionType; this.amount = amount;
        }
    }
}
