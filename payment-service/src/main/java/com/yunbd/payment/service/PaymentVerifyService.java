package com.yunbd.payment.service;

import com.yunbd.common.dto.PaymentRequestDto;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.concurrent.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentVerifyService {
    private static final long INSURANCE_TIMEOUT_MS = 400;
    private final InsuranceClient insuranceClient;
    private final RiskCheckService riskCheckService;
    private final IdempotencyService idempotencyService;

    public VerifyResult verify(PaymentRequestDto req) {
        if (idempotencyService.isDuplicate(req.getPayId())) {
            return idempotencyService.getCachedResult(req.getPayId());
        }

        try {
            CompletableFuture<Boolean> insuranceFuture = "insurance".equals(req.getMethod())
                ? insuranceClient.verifyAsync(req.getPatientId())
                    .orTimeout(INSURANCE_TIMEOUT_MS, TimeUnit.MILLISECONDS)
                    .exceptionally(e -> { log.warn("Insurance timeout/error, falling back to self-pay"); return null; })
                : CompletableFuture.completedFuture(true);

            CompletableFuture<Boolean> riskFuture = riskCheckService.checkAsync(req);

            // orTimeout(400ms) converts to null on timeout via exceptionally handler.
            // Outer get(500ms) is a safety net for the handler itself; normal path
            // resolves well within 400ms + handler overhead.
            Boolean insuranceOk = insuranceFuture.get(500, TimeUnit.MILLISECONDS);
            Boolean riskOk = riskFuture.get(200, TimeUnit.MILLISECONDS);

            boolean fallback = (insuranceOk == null);
            boolean success = (fallback || Boolean.TRUE.equals(insuranceOk))
                && Boolean.TRUE.equals(riskOk);

            VerifyResult result = new VerifyResult(success,
                fallback ? "insurance_unavailable_self_pay_fallback" : "ok");
            result.setFallbackToSelfPay(fallback);
            idempotencyService.cacheResult(req.getPayId(), result);
            return result;
        } catch (Exception e) {
            log.error("Payment verify error", e);
            return new VerifyResult(false, "system_error");
        }
    }

    @Data
    public static class VerifyResult {
        private final boolean success;
        private final String reason;
        private boolean fallbackToSelfPay;

        public VerifyResult(boolean success, String reason) {
            this.success = success;
            this.reason = reason;
        }
    }
}
