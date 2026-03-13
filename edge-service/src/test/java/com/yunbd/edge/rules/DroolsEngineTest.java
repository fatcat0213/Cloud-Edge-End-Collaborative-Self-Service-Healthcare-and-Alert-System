package com.yunbd.edge.rules;

import com.yunbd.common.dto.AlertDto;
import com.yunbd.common.dto.TerminalStatusDto;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import java.util.List;

class DroolsEngineTest {

    private final DroolsEngine engine = new DroolsEngine();

    @Test
    void evaluate_printerError_shouldGenerateP0Alert() {
        TerminalStatusDto status = new TerminalStatusDto();
        status.setTerminalId("T001");
        status.setTimestamp(System.currentTimeMillis());
        status.setStatus("online");
        TerminalStatusDto.HardwareStatus hw = new TerminalStatusDto.HardwareStatus();
        hw.setPrinter("paper_jam");
        hw.setCardReader("ok");
        hw.setScreen("ok");
        status.setHardware(hw);
        TerminalStatusDto.QueueStatus qs = new TerminalStatusDto.QueueStatus();
        qs.setDepth(3);
        status.setQueue(qs);

        List<AlertDto> alerts = engine.evaluate(status);

        assertThat(alerts).hasSize(1);
        assertThat(alerts.get(0).getLevel()).isEqualTo("P0");
        assertThat(alerts.get(0).getType()).isEqualTo("HARDWARE");
        assertThat(alerts.get(0).getTerminalId()).isEqualTo("T001");
    }

    @Test
    void evaluate_queueOverload_shouldGenerateP1Alert() {
        TerminalStatusDto status = new TerminalStatusDto();
        status.setTerminalId("T002");
        status.setTimestamp(System.currentTimeMillis());
        status.setStatus("online");
        TerminalStatusDto.HardwareStatus hw = new TerminalStatusDto.HardwareStatus();
        hw.setPrinter("ok");
        hw.setCardReader("ok");
        hw.setScreen("ok");
        status.setHardware(hw);
        TerminalStatusDto.QueueStatus qs = new TerminalStatusDto.QueueStatus();
        qs.setDepth(55);  // > 50 threshold
        status.setQueue(qs);

        List<AlertDto> alerts = engine.evaluate(status);

        assertThat(alerts).hasSize(1);
        assertThat(alerts.get(0).getLevel()).isEqualTo("P1");
        assertThat(alerts.get(0).getType()).isEqualTo("BUSINESS");
    }

    @Test
    void evaluate_normalStatus_shouldReturnEmptyAlerts() {
        TerminalStatusDto status = new TerminalStatusDto();
        status.setTerminalId("T003");
        status.setTimestamp(System.currentTimeMillis());
        status.setStatus("online");
        TerminalStatusDto.HardwareStatus hw = new TerminalStatusDto.HardwareStatus();
        hw.setPrinter("ok");
        hw.setCardReader("ok");
        hw.setScreen("ok");
        status.setHardware(hw);
        TerminalStatusDto.QueueStatus qs = new TerminalStatusDto.QueueStatus();
        qs.setDepth(5);
        status.setQueue(qs);

        List<AlertDto> alerts = engine.evaluate(status);

        assertThat(alerts).isEmpty();
    }

    @Test
    void evaluate_highAvgWait_shouldGenerateP1Alert() {
        TerminalStatusDto status = new TerminalStatusDto();
        status.setTerminalId("T004");
        status.setTimestamp(System.currentTimeMillis());
        status.setStatus("online");
        TerminalStatusDto.HardwareStatus hw = new TerminalStatusDto.HardwareStatus();
        hw.setPrinter("ok");
        hw.setCardReader("ok");
        hw.setScreen("ok");
        status.setHardware(hw);
        TerminalStatusDto.QueueStatus qs = new TerminalStatusDto.QueueStatus();
        qs.setDepth(5);
        qs.setAvgWaitMs(35000L);  // > 30000ms threshold
        status.setQueue(qs);

        List<AlertDto> alerts = engine.evaluate(status);

        assertThat(alerts).hasSize(1);
        assertThat(alerts.get(0).getLevel()).isEqualTo("P1");
        assertThat(alerts.get(0).getType()).isEqualTo("BUSINESS");
    }
}
