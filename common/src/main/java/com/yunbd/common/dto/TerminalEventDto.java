package com.yunbd.common.dto;
import lombok.Data;

@Data
public class TerminalEventDto {
    private String eventId;
    private String terminalId;
    private long timestamp;
    private String eventType;   // PAYMENT / REGISTRATION / REPORT / QUEUE
    private String status;      // success / failure
    private String patientId;
    private long durationMs;
}
