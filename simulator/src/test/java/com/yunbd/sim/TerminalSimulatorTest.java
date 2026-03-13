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
}
