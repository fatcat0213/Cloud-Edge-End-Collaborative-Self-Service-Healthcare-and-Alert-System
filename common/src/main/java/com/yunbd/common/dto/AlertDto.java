package com.yunbd.common.dto;
import lombok.Data;

@Data
public class AlertDto {
    private String alertId;
    private String terminalId;
    private String level;       // P0 / P1 / P2
    private String type;        // HARDWARE / BUSINESS / SECURITY
    private String message;
    private long timestamp;
}
