package com.yunbd.edge.command;

import com.yunbd.edge.mqtt.MqttPublisher;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
public class CommandService {
    private final MqttPublisher mqttPublisher;
    private final ObjectMapper objectMapper;
    private final Map<String, CommandDto> commandStore = new ConcurrentHashMap<>();

    public CommandService(MqttPublisher mqttPublisher, ObjectMapper objectMapper) {
        this.mqttPublisher = mqttPublisher;
        this.objectMapper = objectMapper;
    }

    public CommandDto dispatchCommand(String terminalId, CommandDto.CommandType type, String payload) {
        String commandId = UUID.randomUUID().toString();
        CommandDto command = new CommandDto();
        command.setCommandId(commandId);
        command.setTerminalId(terminalId);
        command.setType(type);
        command.setPayload(payload);
        command.setStatus(CommandDto.CommandStatus.PENDING);
        command.setCreatedAt(Instant.now());

        commandStore.put(commandId, command);

        try {
            String jsonPayload = objectMapper.writeValueAsString(Map.of(
                "commandId", commandId,
                "type", type.name(),
                "payload", payload != null ? payload : ""
            ));
            String topic = "terminal/" + terminalId + "/command";
            mqttPublisher.publish(topic, jsonPayload);
            command.setStatus(CommandDto.CommandStatus.SENT);
            commandStore.put(commandId, command);
            log.info("Command dispatched: commandId={}, terminalId={}, type={}", commandId, terminalId, type);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize command payload: {}", e.getMessage());
            command.setStatus(CommandDto.CommandStatus.FAILED);
            command.setResult("Serialization error: " + e.getMessage());
        } catch (Exception e) {
            log.error("Failed to publish command to MQTT: {}", e.getMessage());
            command.setStatus(CommandDto.CommandStatus.FAILED);
            command.setResult("MQTT publish error: " + e.getMessage());
        }

        return command;
    }

    public CommandDto getCommandStatus(String commandId) {
        return commandStore.get(commandId);
    }

    public List<CommandDto> getRecentCommands(int limit) {
        return commandStore.values().stream()
            .sorted(Comparator.comparing(CommandDto::getCreatedAt).reversed())
            .limit(limit)
            .collect(Collectors.toList());
    }

    public List<CommandDto> getCommandsByTerminal(String terminalId) {
        return commandStore.values().stream()
            .filter(cmd -> cmd.getTerminalId().equals(terminalId))
            .sorted(Comparator.comparing(CommandDto::getCreatedAt).reversed())
            .collect(Collectors.toList());
    }
}
