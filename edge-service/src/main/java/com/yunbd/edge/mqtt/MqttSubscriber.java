package com.yunbd.edge.mqtt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yunbd.common.dto.AlertDto;
import com.yunbd.common.dto.TerminalStatusDto;
import com.yunbd.common.util.HmacUtil;
import com.yunbd.edge.rules.DroolsEngine;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;

@Slf4j
public class MqttSubscriber {
    private static final String HMAC_SECRET =
        System.getenv().getOrDefault("HMAC_SECRET", "yunbd-terminal-secret-2026");

    private final String brokerHost;
    private final int brokerPort;
    private final DroolsEngine droolsEngine;
    private final Consumer<AlertDto> alertHandler;
    private final ObjectMapper mapper = new ObjectMapper();
    private MqttAsyncClient client;

    private final AtomicLong messageCount = new AtomicLong(0);
    private final AtomicLong alertCount = new AtomicLong(0);
    private final Map<String, AtomicLong> typeCounter = new ConcurrentHashMap<>();

    public MqttSubscriber(String brokerHost, int brokerPort,
                          DroolsEngine droolsEngine, Consumer<AlertDto> alertHandler) {
        this.brokerHost = brokerHost;
        this.brokerPort = brokerPort;
        this.droolsEngine = droolsEngine;
        this.alertHandler = alertHandler;
    }

    public void start() throws Exception {
        client = new MqttAsyncClient("tcp://" + brokerHost + ":" + brokerPort,
            "edge-subscriber", new MemoryPersistence());
        client.setCallback(new MqttCallback() {
            @Override
            public void connectionLost(Throwable cause) {
                log.warn("MQTT connection lost: {}", cause.getMessage());
            }

            @Override
            public void messageArrived(String topic, MqttMessage message) {
                try {
                    String json = new String(message.getPayload(), StandardCharsets.UTF_8);
                    log.info("Received MQTT message on topic {}: {}", topic, json);

                    // Increment total message counter
                    messageCount.incrementAndGet();

                    if ("terminal/alerts".equals(topic)) {
                        // Direct alert from simulator - parse as AlertDto
                        AlertDto alert = mapper.readValue(json, AlertDto.class);
                        // Increment alert counter
                        alertCount.incrementAndGet();
                        // Track by type
                        String alertType = alert.getType() != null ? alert.getType() : "unknown";
                        typeCounter.computeIfAbsent(alertType, k -> new AtomicLong(0)).incrementAndGet();
                        // Ensure consistent ID field
                        if (alert.getId() == null && alert.getAlertId() != null) {
                            alert.setId(alert.getAlertId());
                        }
                        // Set source for simulator alerts
                        if (alert.getSource() == null) {
                            alert.setSource("simulator");
                        }
                        log.info("Processing direct alert: level={} type={} terminal={} source={}",
                            alert.getLevel(), alert.getType(), alert.getTerminalId(), alert.getSource());
                        alertHandler.accept(alert);
                    } else {
                        // Terminal status - parse with HMAC verification
                        TerminalStatusDto status = mapper.readValue(json, TerminalStatusDto.class);
                        // Track by status field
                        String statusValue = status.getStatus() != null ? status.getStatus() : "unknown";
                        typeCounter.computeIfAbsent(statusValue, k -> new AtomicLong(0)).incrementAndGet();
                        // HMAC verification: strip hmac field, re-serialize, verify
                        String receivedHmac = status.getHmac();
                        status.setHmac(null);
                        String payload = mapper.writeValueAsString(status);
                        if (!HmacUtil.verify(payload, HMAC_SECRET, receivedHmac)) {
                            log.warn("HMAC verification failed for terminal {}, dropping message",
                                status.getTerminalId());
                            return;
                        }
                        List<AlertDto> alerts = droolsEngine.evaluate(status);
                        alerts.forEach(alertHandler);
                    }
                } catch (Exception e) {
                    log.error("Message processing error on topic {}", topic, e);
                }
            }

            @Override
            public void deliveryComplete(IMqttDeliveryToken token) {}
        });
        MqttConnectOptions opts = new MqttConnectOptions();
        opts.setCleanSession(true);
        client.connect(opts).waitForCompletion(5000);
        client.subscribe("terminal/+/status", 1).waitForCompletion(3000);
        client.subscribe("terminal/alerts", 1).waitForCompletion(3000);
        log.info("Edge MQTT subscriber started, listening on terminal/+/status and terminal/alerts");
    }

    public void stop() throws Exception {
        if (client != null && client.isConnected()) {
            client.disconnect().waitForCompletion(3000);
        }
    }

    public Map<String, Long> getMessageStats() {
        Map<String, Long> stats = new ConcurrentHashMap<>();
        stats.put("total", messageCount.get());
        stats.put("alerts", alertCount.get());
        typeCounter.forEach((type, count) -> stats.put("type." + type, count.get()));
        return stats;
    }
}
