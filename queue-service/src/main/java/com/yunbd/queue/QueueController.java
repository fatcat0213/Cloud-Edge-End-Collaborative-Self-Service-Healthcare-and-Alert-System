package com.yunbd.queue;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/queue")
public class QueueController {
    @GetMapping("/{deptCode}")
    public ResponseEntity<Map<String,Object>> getQueue(@PathVariable String deptCode) {
        return ResponseEntity.ok(Map.of(
            "deptCode", deptCode,
            "depth", 8,
            "avgWaitMs", 45000L));
    }
}
