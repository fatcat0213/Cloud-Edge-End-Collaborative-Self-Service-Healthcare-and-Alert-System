package com.yunbd.insurance;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/insurance")
public class InsuranceController {
    @PostMapping("/verify")
    public ResponseEntity<Map<String,Object>> verify(@RequestBody Map<String,String> req) {
        return ResponseEntity.ok(Map.of(
            "patientId", req.getOrDefault("patientId", ""),
            "eligible", true,
            "coverageRatio", 0.8));
    }
}
