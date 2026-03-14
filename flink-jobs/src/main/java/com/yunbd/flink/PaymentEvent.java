package com.yunbd.flink;

/**
 * Represents a payment event from a self-service terminal.
 */
public class PaymentEvent {

    private String terminalId;
    private boolean success;
    private long timestamp;

    public PaymentEvent() {
    }

    public PaymentEvent(String terminalId, boolean success, long timestamp) {
        this.terminalId = terminalId;
        this.success = success;
        this.timestamp = timestamp;
    }

    public String getTerminalId() {
        return terminalId;
    }

    public void setTerminalId(String terminalId) {
        this.terminalId = terminalId;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    @Override
    public String toString() {
        return "PaymentEvent{terminalId='" + terminalId + "', success=" + success + ", timestamp=" + timestamp + '}';
    }
}
