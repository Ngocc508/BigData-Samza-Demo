package vn.edu.task;

import org.apache.samza.context.Context;
import org.apache.samza.context.TaskContext;
import org.apache.samza.storage.kv.KeyValueStore;
import org.apache.samza.storage.kv.KeyValueStore;
import org.apache.samza.system.IncomingMessageEnvelope;
import org.apache.samza.system.OutgoingMessageEnvelope;
import org.apache.samza.system.SystemStream;
import org.apache.samza.task.*;
import vn.edu.model.*;
import vn.edu.serde.JsonSerde;

import java.util.UUID;

public class OrderAnalyticsTask implements StreamTask, InitableTask {

    private static final long WINDOW_MS = 30_000L;
    private static final long COOLDOWN_MS = 60_000L;
    private static final int ORDER_THRESHOLD = 10;
    private static final int PAY_FAIL_THRESHOLD = 3;
    private static final SystemStream ALERT_STREAM = new SystemStream("kafka", "alert-events");

    private KeyValueStore<String, UserState> store;

    @Override
	@SuppressWarnings("unchecked")
	public void init(Context context) {
    	TaskContext taskContext = context.getTaskContext();
    	this.store = (KeyValueStore<String, UserState>) taskContext.getStore("user-state");
	}

    @Override
    public void process(IncomingMessageEnvelope envelope, MessageCollector collector, TaskCoordinator coordinator) {
        Object rawMsg = envelope.getMessage();
        OrderEvent event;
        if (rawMsg instanceof OrderEvent) {
            event = (OrderEvent) rawMsg;
        } else if (rawMsg instanceof byte[]) {
           JsonSerde<OrderEvent> serde = new JsonSerde<>(OrderEvent.class);
          event = serde.fromBytes((byte[]) rawMsg);
        } else {
           return; 
        }
        if (event == null || event.userId == null) return;

        long now = System.currentTimeMillis();
        UserState state = store.get(event.userId);
        if (state == null) state = new UserState();

        evictOldEvents(state, event.timestamp);
        state.window.addLast(new UserState.EventRecord(event.timestamp, event.actionType, event.amount));
        state.eventCount30s++;

        if ("CHECKOUT".equals(event.actionType) && event.amount > 0) {
            state.orderCount30s++;
            state.successAmount30s += event.amount;
            state.consecutivePayFail = 0;
        } else if ("PAY_FAIL".equals(event.actionType)) {
            state.consecutivePayFail++;
        }
        state.lastEventTimestamp = event.timestamp;
        store.put(event.userId, state);
        evaluateRules(event, state, now, collector);
    }

    private void evictOldEvents(UserState state, long currentTs) {
        while (!state.window.isEmpty()) {
            UserState.EventRecord head = state.window.peekFirst();
            if (currentTs - head.ts > WINDOW_MS) {
                state.window.pollFirst();
                state.eventCount30s--;
                if ("CHECKOUT".equals(head.actionType) && head.amount > 0) {
                    state.orderCount30s--;
                    state.successAmount30s -= head.amount;
                }
            } else break;
        }
    }

    private void evaluateRules(OrderEvent event, UserState state, long now, MessageCollector collector) {
        if (state.orderCount30s > ORDER_THRESHOLD
                && now - state.lastHighRateAlertTime > COOLDOWN_MS) {
            emitAlert(collector, event.userId, "HIGH_ORDER_RATE", "HIGH",
                    state.orderCount30s, ORDER_THRESHOLD, event.eventId, now);
            state.lastHighRateAlertTime = now;
        }
        if (state.consecutivePayFail >= PAY_FAIL_THRESHOLD
                && now - state.lastFailAlertTime > COOLDOWN_MS) {
            emitAlert(collector, event.userId, "CONSECUTIVE_PAYMENT_FAILURE", "CRITICAL",
                    state.consecutivePayFail, PAY_FAIL_THRESHOLD, event.eventId, now);
            state.lastFailAlertTime = now;
        }
    }

    private void emitAlert(MessageCollector collector, String userId, String rule,
                           String severity, long observed, long threshold,
                           String triggerId, long now) {
        AlertEvent alert = new AlertEvent();
        alert.alertId = UUID.randomUUID().toString();
        alert.userId = userId;
        alert.ruleCode = rule;
        alert.severity = severity;
        alert.windowEnd = now;
        alert.windowStart = now - WINDOW_MS;
        alert.observedValue = observed;
        alert.threshold = threshold;
        alert.triggerEventId = triggerId;
        alert.createdAt = now;

        JsonSerde<AlertEvent> serde = new JsonSerde<>(AlertEvent.class);
        collector.send(new OutgoingMessageEnvelope(ALERT_STREAM, userId, serde.toBytes(alert)));
    }
}

