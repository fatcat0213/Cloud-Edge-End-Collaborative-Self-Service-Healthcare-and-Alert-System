package com.yunbd.flink;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;

/**
 * Flink streaming job that reads payment events from Kafka and detects
 * terminals with abnormal payment success rates using a 1-minute tumbling window.
 */
public class TransactionSuccessRateJob {

    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        String bootstrapServers = System.getenv().getOrDefault(
                "KAFKA_BOOTSTRAP_SERVERS", "kafka:9092");

        KafkaSource<String> kafkaSource = KafkaSource.<String>builder()
                .setBootstrapServers(bootstrapServers)
                .setTopics("payment-events")
                .setGroupId("flink-anomaly")
                .setStartingOffsets(OffsetsInitializer.latest())
                .setValueOnlyDeserializer(new SimpleStringSchema())
                .build();

        ObjectMapper mapper = new ObjectMapper();

        DataStream<PaymentEvent> paymentStream = env
                .fromSource(kafkaSource, WatermarkStrategy.noWatermarks(), "Kafka payment-events")
                .map(json -> mapper.readValue(json, PaymentEvent.class))
                .name("parse-payment-events");

        DataStream<AlertEvent> alertStream = paymentStream
                .keyBy(PaymentEvent::getTerminalId)
                .process(new SuccessRateProcessFunction())
                .name("success-rate-anomaly-detector");

        alertStream.print().name("alert-sink");

        env.execute("Payment Success Rate Anomaly Detection");
    }
}
