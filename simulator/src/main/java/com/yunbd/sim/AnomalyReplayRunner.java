package com.yunbd.sim;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yunbd.common.dto.TerminalStatusDto;
import com.yunbd.common.util.HmacUtil;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Reads anomaly-samples.json and publishes each sample to MQTT.
 * Usage: java -cp <classpath> com.yunbd.sim.AnomalyReplayRunner [broker-host] [broker-port]
 *        Defaults: localhost 1883
 */
public class AnomalyReplayRunner {
    private static final String HMAC_SECRET =
        System.getenv().getOrDefault("HMAC_SECRET", "yunbd-terminal-secret-2026");

    @SuppressWarnings("unchecked")
    public static void main(String[] args) throws Exception {
        String brokerHost = args.length > 0 ? args[0] : "localhost";
        int brokerPort = args.length > 1 ? Integer.parseInt(args[1]) : 1883;
        String samplesFile = args.length > 2 ? args[2] : "simulation/anomaly-samples.json";

        ObjectMapper mapper = new ObjectMapper();
        List<TerminalStatusDto> samples = mapper.readValue(
            new File(samplesFile),
            mapper.getTypeFactory().constructCollectionType(List.class, TerminalStatusDto.class));

        MqttAsyncClient client = new MqttAsyncClient(
            "tcp://" + brokerHost + ":" + brokerPort,
            "anomaly-replay-" + System.currentTimeMillis(),
            new MemoryPersistence());
        MqttConnectOptions opts = new MqttConnectOptions();
        opts.setCleanSession(true);
        client.connect(opts).waitForCompletion(5000);

        System.out.printf("Connected to %s:%d, replaying %d samples%n",
            brokerHost, brokerPort, samples.size());

        for (TerminalStatusDto sample : samples) {
            String terminalId = sample.getTerminalId();
            // Sign: set hmac=null, serialize (canonical DTO order), compute HMAC
            sample.setHmac(null);
            String payloadToSign = mapper.writeValueAsString(sample);
            String hmac = HmacUtil.sign(payloadToSign, HMAC_SECRET);
            sample.setHmac(hmac);

            String json = mapper.writeValueAsString(sample);
            String topic = "terminal/" + terminalId + "/status";

            MqttMessage msg = new MqttMessage(json.getBytes(StandardCharsets.UTF_8));
            msg.setQos(1);
            client.publish(topic, msg).waitForCompletion(3000);
            System.out.printf("Published to %s: %s%n", topic, json);
            Thread.sleep(200);
        }

        client.disconnect().waitForCompletion(3000);
        System.out.println("Replay complete.");
    }
}
