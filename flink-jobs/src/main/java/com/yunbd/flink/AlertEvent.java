package com.yunbd.flink;

/**
 * Represents an alert event emitted when a terminal's payment success rate drops below threshold.
 * level "P1" = success rate < 0.8 (warning)
 * level "P0" = success rate < 0.5 (critical)
 */
public class AlertEvent {

    private String terminalId;
    private double successRate;
    private String level;
    private long windowStart;

    public AlertEvent() {
    }

    public AlertEvent(String terminalId, double successRate, String level, long windowStart) {
        this.terminalId = terminalId;
        this.successRate = successRate;
        this.level = level;
        this.windowStart = windowStart;
    }

    public String getTerminalId() {
        return terminalId;
    }

    public void setTerminalId(String terminalId) {
        this.terminalId = terminalId;
    }

    public double getSuccessRate() {
        return successRate;
    }

    public void setSuccessRate(double successRate) {
        this.successRate = successRate;
    }

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public long getWindowStart() {
        return windowStart;
    }

    public void setWindowStart(long windowStart) {
        this.windowStart = windowStart;
    }

    @Override
    public String toString() {
        return "AlertEvent{terminalId='" + terminalId + "', successRate=" + successRate
                + ", level='" + level + "', windowStart=" + windowStart + '}';
    }
}
