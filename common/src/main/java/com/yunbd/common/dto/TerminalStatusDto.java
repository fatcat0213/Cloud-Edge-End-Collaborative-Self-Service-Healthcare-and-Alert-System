package com.yunbd.common.dto;
import lombok.Data;

@Data
public class TerminalStatusDto {
    private String terminalId;
    private long timestamp;
    private String status;          // online / offline / degraded
    private HardwareStatus hardware;
    private QueueStatus queue;
    private String hmac;

    @Data
    public static class HardwareStatus {
        private String printer;     // ok / error / paper_jam
        private String cardReader;  // ok / error
        private String screen;      // ok / error
    }

    @Data
    public static class QueueStatus {
        private int depth;
        private long avgWaitMs;
    }
}
