package com.yunbd.sim;

import com.yunbd.common.dto.TerminalStatusDto;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class TerminalClientTest {

    @Test
    void buildStatusPayload_shouldIncludeTerminalIdAndTimestamp() {
        TerminalClient client = new TerminalClient("T001", "localhost", 1883);
        TerminalStatusDto dto = client.buildStatusPayload();

        assertThat(dto.getTerminalId()).isEqualTo("T001");
        assertThat(dto.getTimestamp()).isPositive();
        assertThat(dto.getStatus()).isEqualTo("online");
        assertThat(dto.getHardware()).isNotNull();
        assertThat(dto.getHardware().getPrinter()).isEqualTo("ok");
    }

    @Test
    void buildStatusPayload_shouldHaveHmacSignature() throws Exception {
        TerminalClient client = new TerminalClient("T001", "localhost", 1883);
        TerminalStatusDto dto = client.buildStatusPayload();
        assertThat(dto.getHmac()).startsWith("sha256:");
    }
}
