package com.yunbd.edge.command;

import com.yunbd.edge.mqtt.MqttPublisher;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
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
    private static final String EDGE_COMMANDS_KEY = "edge:commands";
    private static final int MAX_COMMANDS = 200;

    private final MqttPublisher mqttPublisher;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;
    private final Map<String, CommandDto> commandStore = new ConcurrentHashMap<>();

    public CommandService(MqttPublisher mqttPublisher, ObjectMapper objectMapper, StringRedisTemplate redisTemplate) {
        this.mqttPublisher = mqttPublisher;
        this.objectMapper = objectMapper;
        this.redisTemplate = redisTemplate;
    }

    @PostConstruct
    public void init() {
        try {
            List<String> cmdJsonList = redisTemplate.opsForList().range(EDGE_COMMANDS_KEY, 0, MAX_COMMANDS - 1);
            if (cmdJsonList != null) {
                for (int i = cmdJsonList.size() - 1; i >= 0; i--) {
                    CommandDto cmd = objectMapper.readValue(cmdJsonList.get(i), CommandDto.class);
                    commandStore.put(cmd.getCommandId(), cmd);
                }
                log.info("Loaded {} commands from Redis", commandStore.size());
            }
        } catch (Exception e) {
            log.warn("Failed to load commands from Redis: {}", e.getMessage());
        }
    }

    private void persistToRedis(CommandDto command) {
        if (redisTemplate == null) return;
        try {
            String json = objectMapper.writeValueAsString(command);
            redisTemplate.opsForList().leftPush(EDGE_COMMANDS_KEY, json);
            redisTemplate.opsForList().trim(EDGE_COMMANDS_KEY, 0, MAX_COMMANDS - 1);
            log.debug("Persisted command to Redis: commandId={}", command.getCommandId());
        } catch (Exception e) {
            log.error("Failed to persist command to Redis", e);
        }
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
        persistToRedis(command);

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
            persistToRedis(command);
            log.info("Command dispatched: commandId={}, terminalId={}, type={}", commandId, terminalId, type);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize command payload: {}", e.getMessage());
            command.setStatus(CommandDto.CommandStatus.FAILED);
            command.setResult("Serialization error: " + e.getMessage());
            persistToRedis(command);
        } catch (Exception e) {
            log.error("Failed to publish command to MQTT: {}", e.getMessage());
            command.setStatus(CommandDto.CommandStatus.FAILED);
            command.setResult("MQTT publish error: " + e.getMessage());
            persistToRedis(command);
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
