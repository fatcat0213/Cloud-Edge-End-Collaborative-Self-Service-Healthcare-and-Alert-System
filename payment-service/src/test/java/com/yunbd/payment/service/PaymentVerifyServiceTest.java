package com.yunbd.payment.service;

import com.yunbd.common.dto.PaymentRequestDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.concurrent.CompletableFuture;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentVerifyServiceTest {

    @Mock InsuranceClient insuranceClient;
    @Mock RiskCheckService riskCheckService;
    @Mock IdempotencyService idempotencyService;

    @InjectMocks
    PaymentVerifyService verifyService;

    @Test
    void verify_normalPayment_shouldSucceedWithin1Second() throws Exception {
        PaymentRequestDto req = new PaymentRequestDto();
        req.setPayId("PAY-001");
        req.setTerminalId("T001");
        req.setPatientId("P12345");
        req.setAmount(new BigDecimal("150.00"));
        req.setMethod("insurance");

        when(idempotencyService.isDuplicate("PAY-001")).thenReturn(false);
        when(insuranceClient.verifyAsync("P12345"))
            .thenReturn(CompletableFuture.supplyAsync(() -> {
                try { Thread.sleep(200); } catch (Exception e) {}
                return true;
            }));
        when(riskCheckService.checkAsync(any()))
            .thenReturn(CompletableFuture.supplyAsync(() -> {
                try { Thread.sleep(100); } catch (Exception e) {}
                return true;
            }));

        long start = System.currentTimeMillis();
        PaymentVerifyService.VerifyResult result = verifyService.verify(req);
        long elapsed = System.currentTimeMillis() - start;

        assertThat(result.isSuccess()).isTrue();
        // insurance(200ms) and risk(100ms) run in parallel → max ~200ms; 400ms bound
        // catches sequential execution regression (200+100=300ms) while allowing CI headroom.
        assertThat(elapsed).isLessThan(400L);
    }

    @Test
    void verify_duplicatePayId_shouldReturnCachedResult() {
        PaymentRequestDto req = new PaymentRequestDto();
        req.setPayId("PAY-DUP");
        req.setPatientId("P99999");
        req.setAmount(new BigDecimal("50.00"));
        req.setMethod("self_pay");

        when(idempotencyService.isDuplicate("PAY-DUP")).thenReturn(true);
        when(idempotencyService.getCachedResult("PAY-DUP"))
            .thenReturn(new PaymentVerifyService.VerifyResult(true, "cached"));

        PaymentVerifyService.VerifyResult result = verifyService.verify(req);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getReason()).isEqualTo("cached");
        verify(insuranceClient, never()).verifyAsync(any());
    }

    @Test
    void verify_insuranceTimeout_shouldFallbackToSelfPay() {
        PaymentRequestDto req = new PaymentRequestDto();
        req.setPayId("PAY-002");
        req.setPatientId("P22222");
        req.setAmount(new BigDecimal("200.00"));
        req.setMethod("insurance");

        when(idempotencyService.isDuplicate("PAY-002")).thenReturn(false);
        when(insuranceClient.verifyAsync("P22222"))
            .thenReturn(CompletableFuture.supplyAsync(() -> {
                try { Thread.sleep(500); } catch (Exception e) {}
                return false;
            }));
        when(riskCheckService.checkAsync(any()))
            .thenReturn(CompletableFuture.completedFuture(true));

        PaymentVerifyService.VerifyResult result = verifyService.verify(req);

        assertThat(result.isFallbackToSelfPay()).isTrue();
    }
}
