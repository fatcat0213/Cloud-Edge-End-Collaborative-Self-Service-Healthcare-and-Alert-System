package com.yunbd.edge;

import com.yunbd.edge.mqtt.MqttSubscriber;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/stats")
public class StatsController {

    private final MqttSubscriber mqttSubscriber;

    public StatsController(MqttSubscriber mqttSubscriber) {
        this.mqttSubscriber = mqttSubscriber;
    }

    @GetMapping("/messages")
    public Map<String, Object> getMessageStats() {
        Map<String, Long> raw = mqttSubscriber.getMessageStats();
        long total = raw.getOrDefault("total", 0L);
        long alerts = raw.getOrDefault("alerts", 0L);
        return Map.of(
            "success", true,
            "data", Map.of(
                "totalMessages", total,
                "alertMessages", alerts,
                "byType", raw
            )
        );
    }
}
