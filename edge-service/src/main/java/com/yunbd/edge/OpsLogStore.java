package com.yunbd.edge;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yunbd.edge.dto.OpsLogDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;

@Component
public class OpsLogStore {
    private static final Logger log = LoggerFactory.getLogger(OpsLogStore.class);
    private static final int MAX_SIZE = 100;
    private static final String EDGE_OPSLOG_KEY = "edge:opslog";

    // In-memory cache for fast access
    private final List<OpsLogDto> opsLogs = new ArrayList<>();

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public OpsLogStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = new ObjectMapper();
    }

    @PostConstruct
    public void init() {
        // Load existing opsLogs from Redis on startup (newest first via reversed read)
        try {
            List<String> jsonList = redisTemplate.opsForList().range(EDGE_OPSLOG_KEY, 0, MAX_SIZE - 1);
            if (jsonList != null) {
                for (int i = jsonList.size() - 1; i >= 0; i--) {
                    OpsLogDto entry = objectMapper.readValue(jsonList.get(i), OpsLogDto.class);
                    opsLogs.add(entry);
                }
                log.info("Loaded {} opsLog entries from Redis", opsLogs.size());
            }
        } catch (Exception e) {
            log.warn("Failed to load opsLog from Redis: {}", e.getMessage());
        }
    }

    public synchronized void add(OpsLogDto entry) {
        // Ensure defaults
        if (entry.getOperator() == null || entry.getOperator().isEmpty()) {
            entry.setOperator("系统");
        }
        if (entry.getTerminalId() == null || entry.getTerminalId().isEmpty()) {
            entry.setTerminalId("-");
        }
        if (entry.getStatus() == null || entry.getStatus().isEmpty()) {
            entry.setStatus("SUCCESS");
        }

        opsLogs.add(0, entry);  // prepend (newest first)
        if (opsLogs.size() > MAX_SIZE) {
            opsLogs.remove(opsLogs.size() - 1);
        }
        persistToRedis(entry);
    }

    public synchronized List<OpsLogDto> getAll() {
        return new ArrayList<>(opsLogs);
    }

    /**
     * Filter opsLogs by time range and optional type/terminalId.
     * @param startTime epoch millis, 0 means no lower bound
     * @param endTime   epoch millis, 0 means no upper bound
     * @param type      optional filter
     * @param terminalId optional filter
     */
    public synchronized List<OpsLogDto> getByTimeRange(long startTime, long endTime, String type, String terminalId) {
        return opsLogs.stream()
            .filter(e -> startTime <= 0 || e.getTimestamp() >= startTime)
            .filter(e -> endTime <= 0 || e.getTimestamp() <= endTime)
            .filter(e -> type == null || type.isEmpty() || type.equals(e.getType()))
            .filter(e -> terminalId == null || terminalId.isEmpty() || terminalId.equals(e.getTerminalId()))
            .collect(java.util.stream.Collectors.toList());
    }

    private void persistToRedis(OpsLogDto entry) {
        if (redisTemplate == null) return;
        try {
            String json = objectMapper.writeValueAsString(entry);
            redisTemplate.opsForList().leftPush(EDGE_OPSLOG_KEY, json);
            redisTemplate.opsForList().trim(EDGE_OPSLOG_KEY, 0, MAX_SIZE - 1);
            log.debug("Persisted opsLog entry to Redis: {}", entry.getId());
        } catch (Exception e) {
            log.error("Failed to persist opsLog to Redis", e);
        }
    }
}