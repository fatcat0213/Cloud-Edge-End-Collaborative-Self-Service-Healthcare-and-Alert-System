package com.yunbd.edge.mqtt;

import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;

@Slf4j
public class MqttPublisher {
    private final String brokerHost;
    private final int brokerPort;
    private MqttAsyncClient client;

    public MqttPublisher(String brokerHost, int brokerPort) {
        this.brokerHost = brokerHost;
        this.brokerPort = brokerPort;
    }

    public void connect() throws Exception {
        client = new MqttAsyncClient("tcp://" + brokerHost + ":" + brokerPort,
            "edge-publisher-" + System.currentTimeMillis(), new MemoryPersistence());
        MqttConnectOptions opts = new MqttConnectOptions();
        opts.setCleanSession(true);
        client.connect(opts).waitForCompletion(5000);
    }

    public void publish(String topic, String payload) throws Exception {
        if (client == null || !client.isConnected()) {
            throw new IllegalStateException("Publisher not connected; call connect() first");
        }
        MqttMessage msg = new MqttMessage(payload.getBytes());
        msg.setQos(1);
        client.publish(topic, msg).waitForCompletion(3000);
    }

    public void disconnect() throws Exception {
        if (client != null && client.isConnected()) {
            client.disconnect().waitForCompletion(3000);
        }
    }
}
