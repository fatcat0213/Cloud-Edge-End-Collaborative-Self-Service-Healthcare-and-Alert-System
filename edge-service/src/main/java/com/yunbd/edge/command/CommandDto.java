package com.yunbd.edge.command;

import lombok.Data;
import java.time.Instant;

@Data
public class CommandDto {
    private String commandId;
    private String terminalId;
    private CommandType type;
    private String payload;
    private CommandStatus status;
    private Instant createdAt;
    private Instant executedAt;
    private String result;

    public enum CommandType {
        RESTART, MAINTENANCE, HEALTH_CHECK, UPGRADE, CONFIG_UPDATE
    }

    public enum CommandStatus {
        PENDING, SENT, EXECUTED, FAILED, TIMEOUT
    }
}
