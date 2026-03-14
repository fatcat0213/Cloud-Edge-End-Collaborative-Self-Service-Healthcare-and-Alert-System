package com.yunbd.report;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/report")
public class ReportController {
    @GetMapping("/{patientId}")
    public ResponseEntity<Map<String,Object>> getReports(@PathVariable String patientId) {
        return ResponseEntity.ok(Map.of(
            "patientId", patientId,
            "reports", java.util.List.of()));
    }
}
