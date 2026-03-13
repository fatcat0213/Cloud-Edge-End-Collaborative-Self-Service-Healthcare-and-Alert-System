package com.yunbd.edge.mqtt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yunbd.common.dto.AlertDto;
import com.yunbd.common.dto.TerminalStatusDto;
import com.yunbd.edge.rules.DroolsEngine;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.BindMode;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

@Testcontainers
class MqttSubscriberIntegrationTest {

    @Container
    static GenericContainer<?> mosquitto = new GenericContainer<>("eclipse-mosquitto:2.0")
        .withExposedPorts(1883)
        .withClasspathResourceMapping(
            "mosquitto-no-auth.conf",
            "/mosquitto/config/mosquitto.conf",
            BindMode.READ_ONLY);

    @Test
    void whenPrinterError_thenAlertPublished() throws Exception {
        String host = mosquitto.getHost();
        int port = mosquitto.getMappedPort(1883);

        DroolsEngine engine = new DroolsEngine();
        BlockingQueue<AlertDto> received = new LinkedBlockingQueue<>();
        MqttSubscriber subscriber = new MqttSubscriber(host, port, engine,
            alert -> received.offer(alert));
        subscriber.start();

        Thread.sleep(1000);

        MqttPublisher publisher = new MqttPublisher(host, port);
        publisher.connect();

        TerminalStatusDto status = buildPrinterErrorStatus("T001");
        ObjectMapper mapper = new ObjectMapper();
        publisher.publish("terminal/T001/status", mapper.writeValueAsString(status));

        AlertDto alert = received.poll(5, TimeUnit.SECONDS);
        assertThat(alert).isNotNull();
        assertThat(alert.getLevel()).isEqualTo("P0");
        assertThat(alert.getType()).isEqualTo("HARDWARE");

        subscriber.stop();
        publisher.disconnect();
    }

    private TerminalStatusDto buildPrinterErrorStatus(String id) throws Exception {
        TerminalStatusDto s = new TerminalStatusDto();
        s.setTerminalId(id);
        s.setTimestamp(System.currentTimeMillis());
        s.setStatus("online");
        TerminalStatusDto.HardwareStatus hw = new TerminalStatusDto.HardwareStatus();
        hw.setPrinter("paper_jam");
        hw.setCardReader("ok");
        hw.setScreen("ok");
        s.setHardware(hw);
        TerminalStatusDto.QueueStatus qs = new TerminalStatusDto.QueueStatus();
        qs.setDepth(2);
        s.setQueue(qs);
        // Compute HMAC: sign the payload WITHOUT hmac field (hmac=null at this point)
        ObjectMapper mapper = new ObjectMapper();
        String payloadForSign = mapper.writeValueAsString(s);
        s.setHmac(com.yunbd.common.util.HmacUtil.sign(payloadForSign, "yunbd-terminal-secret-2026"));
        return s;
    }
}
