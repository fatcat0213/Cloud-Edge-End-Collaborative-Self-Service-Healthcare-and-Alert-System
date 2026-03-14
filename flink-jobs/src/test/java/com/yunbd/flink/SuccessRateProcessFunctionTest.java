package com.yunbd.flink;

import org.apache.flink.streaming.api.operators.KeyedProcessOperator;
import org.apache.flink.streaming.util.KeyedOneInputStreamOperatorTestHarness;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link SuccessRateProcessFunction} using Flink's test harness.
 */
class SuccessRateProcessFunctionTest {

    private KeyedOneInputStreamOperatorTestHarness<String, PaymentEvent, AlertEvent> harness;

    @BeforeEach
    void setUp() throws Exception {
        SuccessRateProcessFunction processFunction = new SuccessRateProcessFunction();
        KeyedProcessOperator<String, PaymentEvent, AlertEvent> operator =
                new KeyedProcessOperator<>(processFunction);

        harness = new KeyedOneInputStreamOperatorTestHarness<>(
                operator,
                PaymentEvent::getTerminalId,
                org.apache.flink.api.common.typeinfo.TypeInformation.of(String.class));

        harness.open();
    }

    @AfterEach
    void tearDown() throws Exception {
        if (harness != null) {
            harness.close();
        }
    }

    /**
     * Feed 10 failed events for a single terminal → should emit a P0 alert.
     */
    @Test
    void allFailures_belowThreshold_shouldEmitP0Alert() throws Exception {
        String terminalId = "T001";
        long baseTime = 1_000L;

        // Set processing time to 0 and feed 10 failed events
        harness.setProcessingTime(baseTime);
        for (int i = 0; i < 10; i++) {
            harness.processElement(
                    new PaymentEvent(terminalId, false, baseTime + i * 100L),
                    baseTime + i * 100L);
        }

        // Advance processing time past the 60-second window to trigger the timer
        harness.setProcessingTime(baseTime + 61_000L);

        List<AlertEvent> alerts = harness.extractOutputValues();

        assertThat(alerts).isNotEmpty();
        AlertEvent alert = alerts.get(0);
        assertThat(alert.getTerminalId()).isEqualTo(terminalId);
        assertThat(alert.getLevel()).isEqualTo("P0");
        assertThat(alert.getSuccessRate()).isEqualTo(0.0);
    }

    /**
     * Feed 9 successes + 1 failure (90% success rate) → should emit no alert.
     */
    @Test
    void mixedResults_above80Percent_shouldEmitNoAlert() throws Exception {
        String terminalId = "T002";
        long baseTime = 1_000L;

        harness.setProcessingTime(baseTime);

        // 9 successes
        for (int i = 0; i < 9; i++) {
            harness.processElement(
                    new PaymentEvent(terminalId, true, baseTime + i * 100L),
                    baseTime + i * 100L);
        }
        // 1 failure
        harness.processElement(
                new PaymentEvent(terminalId, false, baseTime + 900L),
                baseTime + 900L);

        // Advance past the window
        harness.setProcessingTime(baseTime + 61_000L);

        List<AlertEvent> alerts = harness.extractOutputValues();

        assertThat(alerts).isEmpty();
    }
}
