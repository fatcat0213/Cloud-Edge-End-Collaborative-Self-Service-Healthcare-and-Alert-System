package com.yunbd.sim;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class TerminalSimulatorTest {

    @Test
    void constructor_shouldAcceptTerminalCountAndBrokerParams() {
        TerminalSimulator sim = new TerminalSimulator(5, "localhost", 1883);
        assertThat(sim).isNotNull();
        assertThat(sim.getTerminalCount()).isEqualTo(5);
    }

    @Test
    void stop_beforeStart_shouldCompleteWithoutError() throws Exception {
        // Verifies that calling stop() before start() does not throw — e.g. shutdown
        // hook safety when the JVM exits before start() completes.
        TerminalSimulator sim = new TerminalSimulator(2, "localhost", 1883);
        assertThatCode(sim::stop).doesNotThrowAnyException();
    }
}
