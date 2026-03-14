package com.yunbd.edge.mqtt;

import com.yunbd.edge.rules.DroolsEngine;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.SmartLifecycle;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Wires MqttSubscriber into the Spring lifecycle so it starts with the application
 * and shuts down cleanly on context close.
 */
@Slf4j
@Configuration
public class MqttConfig {

    @Value("${mqtt.broker-host:localhost}")
    private String brokerHost;

    @Value("${mqtt.broker-port:1883}")
    private int brokerPort;

    @Bean
    public SmartLifecycle mqttSubscriberLifecycle(DroolsEngine droolsEngine) {
        MqttSubscriber subscriber = new MqttSubscriber(brokerHost, brokerPort, droolsEngine,
            alert -> log.info("Alert generated: level={} type={} terminal={}",
                alert.getLevel(), alert.getType(), alert.getTerminalId()));

        return new SmartLifecycle() {
            private volatile boolean running = false;

            @Override
            public void start() {
                try {
                    subscriber.start();
                    running = true;
                } catch (Exception e) {
                    log.error("Failed to start MQTT subscriber", e);
                }
            }

            @Override
            public void stop() {
                try {
                    subscriber.stop();
                } catch (Exception e) {
                    log.error("Error stopping MQTT subscriber", e);
                } finally {
                    running = false;
                }
            }

            @Override
            public boolean isRunning() { return running; }
        };
    }
}
