package com.yunbd.edge.mqtt;

import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.*;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;

@Slf4j
@Component
public class MqttPublisher {
    private final String brokerHost;
    private final int brokerPort;
    private MqttAsyncClient client;

    public MqttPublisher(
            @Value("${mqtt.broker-host:localhost}") String brokerHost,
            @Value("${mqtt.broker-port:1883}") int brokerPort) {
        this.brokerHost = brokerHost;
        this.brokerPort = brokerPort;
    }

    @PostConstruct
    public void connect() throws Exception {
        try {
            client = new MqttAsyncClient("tcp://" + brokerHost + ":" + brokerPort,
                "edge-publisher-" + System.currentTimeMillis(), new MemoryPersistence());
            MqttConnectOptions opts = new MqttConnectOptions();
            opts.setCleanSession(true);
            client.connect(opts).waitForCompletion(5000);
            log.info("MQTT publisher connected to {}:{}", brokerHost, brokerPort);
        } catch (Exception e) {
            log.warn("Failed to connect MQTT publisher (will retry on publish): {}", e.getMessage());
        }
    }

    public void publish(String topic, String payload) throws Exception {
        if (client == null || !client.isConnected()) {
            connect();
        }
        MqttMessage msg = new MqttMessage(payload.getBytes(StandardCharsets.UTF_8));
        msg.setQos(1);
        client.publish(topic, msg).waitForCompletion(3000);
    }

    public void disconnect() throws Exception {
        if (client != null && client.isConnected()) {
            client.disconnect().waitForCompletion(3000);
        }
    }
}
