package com.yunbd.edge;

import com.yunbd.edge.dto.OpsLogDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/opslog")
public class OpsLogController {
    private static final Logger log = LoggerFactory.getLogger(OpsLogController.class);

    private final OpsLogStore opsLogStore;

    public OpsLogController(OpsLogStore opsLogStore) {
        this.opsLogStore = opsLogStore;
    }

    /**
     * POST /api/v1/opslog
     * Body: { id, timestamp, operator, type, terminalId, status, detail }
     * Persists to Redis and returns the entry.
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public OpsLogDto createOpsLog(@RequestBody OpsLogDto entry) {
        opsLogStore.add(entry);
        log.info("opsLog created: id={}, type={}, terminalId={}", entry.getId(), entry.getType(), entry.getTerminalId());
        return entry;
    }

    /**
     * GET /api/v1/opslog
     * Query params (all optional): startTime, endTime, type, terminalId
     * Returns filtered opsLog entries (newest first in store).
     */
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public List<OpsLogDto> getOpsLogs(
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String terminalId) {

        long start = startTime != null ? startTime : 0;
        long end = endTime != null ? endTime : 0;

        List<OpsLogDto> results = opsLogStore.getByTimeRange(start, end, type, terminalId);
        log.debug("getOpsLogs -> startTime={}, endTime={}, type={}, terminalId={}, resultCount={}",
            start, end, type, terminalId, results.size());
        return results;
    }
}