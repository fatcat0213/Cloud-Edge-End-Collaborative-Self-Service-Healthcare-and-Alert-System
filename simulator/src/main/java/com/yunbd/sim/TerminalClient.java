package com.yunbd.sim;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yunbd.common.dto.TerminalStatusDto;
import com.yunbd.common.util.HmacUtil;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.MqttAsyncClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;

@Slf4j
public class TerminalClient {
    private static final String HMAC_SECRET =
        System.getenv().getOrDefault("HMAC_SECRET", "yunbd-terminal-secret-2026");
    private final String terminalId;
    private final String brokerHost;
    private final int brokerPort;
    private final ObjectMapper mapper = new ObjectMapper();
    private MqttAsyncClient mqttClient;

    public TerminalClient(String terminalId, String brokerHost, int brokerPort) {
        this.terminalId = terminalId;
        this.brokerHost = brokerHost;
        this.brokerPort = brokerPort;
    }

    public void connect() throws Exception {
        String broker = "tcp://" + brokerHost + ":" + brokerPort;
        mqttClient = new MqttAsyncClient(broker, terminalId, new MemoryPersistence());
        MqttConnectOptions opts = new MqttConnectOptions();
        opts.setCleanSession(false);
        opts.setKeepAliveInterval(30);
        mqttClient.connect(opts).waitForCompletion(5000);
        log.info("Terminal {} connected to {}", terminalId, broker);
    }

    public TerminalStatusDto buildStatusPayload() {
        TerminalStatusDto dto = new TerminalStatusDto();
        dto.setTerminalId(terminalId);
        dto.setTimestamp(System.currentTimeMillis());
        dto.setStatus("online");

        TerminalStatusDto.HardwareStatus hw = new TerminalStatusDto.HardwareStatus();
        hw.setPrinter("ok");
        hw.setCardReader("ok");
        hw.setScreen("ok");
        dto.setHardware(hw);

        TerminalStatusDto.QueueStatus qs = new TerminalStatusDto.QueueStatus();
        qs.setDepth((int)(Math.random() * 10));
        qs.setAvgWaitMs((long)(Math.random() * 120000));
        dto.setQueue(qs);

        try {
            String payload = mapper.writeValueAsString(dto);
            dto.setHmac(HmacUtil.sign(payload, HMAC_SECRET));
        } catch (Exception e) {
            log.error("HMAC signing failed", e);
        }
        return dto;
    }

    public void publishStatus() throws Exception {
        TerminalStatusDto dto = buildStatusPayload();
        String topic = "terminal/" + terminalId + "/status";
        String payload = mapper.writeValueAsString(dto);
        MqttMessage msg = new MqttMessage(payload.getBytes());
        msg.setQos(1);
        mqttClient.publish(topic, msg).waitForCompletion(3000);
    }

    public void disconnect() throws Exception {
        if (mqttClient != null && mqttClient.isConnected()) {
            mqttClient.disconnect().waitForCompletion(3000);
        }
    }
}
