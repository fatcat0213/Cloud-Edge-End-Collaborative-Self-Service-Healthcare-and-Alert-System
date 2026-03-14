package com.yunbd.flink;

import org.apache.flink.api.common.state.ListState;
import org.apache.flink.api.common.state.ListStateDescriptor;
import org.apache.flink.api.common.state.StateTtlConfig;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.common.time.Time;
import org.apache.flink.api.common.typeinfo.TypeInformation;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;

/**
 * Keyed process function that accumulates payment events per terminal and
 * emits alert events when the success rate falls below defined thresholds
 * in a tumbling 1-minute window.
 *
 * <p>Alert levels:
 * <ul>
 *   <li>P1 – success rate &lt; 0.8 and event count &ge; 5</li>
 *   <li>P0 – success rate &lt; 0.5 and event count &ge; 5 (overrides P1)</li>
 * </ul>
 */
public class SuccessRateProcessFunction
        extends KeyedProcessFunction<String, PaymentEvent, AlertEvent> {

    private static final long WINDOW_MS = 60_000L;
    private static final int MIN_COUNT = 5;
    private static final double P1_THRESHOLD = 0.8;
    private static final double P0_THRESHOLD = 0.5;

    /** Buffered events for the current window per terminal. */
    private transient ListState<PaymentEvent> eventBuffer;

    /** Timestamp of the currently registered timer (0 means no timer yet). */
    private transient ValueState<Long> timerState;

    @Override
    public void open(Configuration parameters) throws Exception {
        // Configure TTL: automatically expire buffered events after 2 minutes
        StateTtlConfig ttlConfig = StateTtlConfig
                .newBuilder(Time.minutes(2))
                .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
                .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
                .build();

        ListStateDescriptor<PaymentEvent> bufferDesc =
                new ListStateDescriptor<>("payment-buffer", TypeInformation.of(PaymentEvent.class));
        bufferDesc.enableTimeToLive(ttlConfig);
        eventBuffer = getRuntimeContext().getListState(bufferDesc);

        ValueStateDescriptor<Long> timerDesc =
                new ValueStateDescriptor<>("timer-ts", Long.class);
        timerState = getRuntimeContext().getState(timerDesc);
    }

    @Override
    public void processElement(PaymentEvent event,
                               Context ctx,
                               Collector<AlertEvent> out) throws Exception {
        eventBuffer.add(event);

        // Register a processing-time timer for the next window boundary if none is set
        Long currentTimer = timerState.value();
        if (currentTimer == null) {
            long nextFire = ctx.timerService().currentProcessingTime() + WINDOW_MS;
            ctx.timerService().registerProcessingTimeTimer(nextFire);
            timerState.update(nextFire);
        }
    }

    @Override
    public void onTimer(long timestamp,
                        OnTimerContext ctx,
                        Collector<AlertEvent> out) throws Exception {
        // Collect all buffered events
        int total = 0;
        int successes = 0;
        long windowStart = timestamp - WINDOW_MS;

        for (PaymentEvent e : eventBuffer.get()) {
            total++;
            if (e.isSuccess()) {
                successes++;
            }
        }

        // Clear the buffer for the next window
        eventBuffer.clear();

        // Emit alert if we have enough data points and rate is below threshold
        if (total >= MIN_COUNT) {
            double rate = (double) successes / total;
            if (rate < P0_THRESHOLD) {
                out.collect(new AlertEvent(ctx.getCurrentKey(), rate, "P0", windowStart));
            } else if (rate < P1_THRESHOLD) {
                out.collect(new AlertEvent(ctx.getCurrentKey(), rate, "P1", windowStart));
            }
        }

        // Re-register timer for the next window
        long nextFire = timestamp + WINDOW_MS;
        ctx.timerService().registerProcessingTimeTimer(nextFire);
        timerState.update(nextFire);
    }
}
