package com.yunbd.registration;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/registration")
public class RegistrationController {
    @PostMapping
    public ResponseEntity<Map<String,String>> register(@RequestBody Map<String,String> req) {
        String regId = "REG-" + System.currentTimeMillis();
        return ResponseEntity.ok(Map.of(
            "registrationId", regId,
            "patientId", req.getOrDefault("patientId", ""),
            "status", "PENDING"));
    }
}
