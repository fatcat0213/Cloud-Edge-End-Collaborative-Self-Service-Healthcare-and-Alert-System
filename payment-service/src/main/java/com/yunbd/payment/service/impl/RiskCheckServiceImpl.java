package com.yunbd.payment.service.impl;

import com.yunbd.common.dto.PaymentRequestDto;
import com.yunbd.payment.service.RiskCheckService;
import org.springframework.stereotype.Service;
import java.util.concurrent.CompletableFuture;

/** Demo stub: all requests pass risk check. */
@Service
public class RiskCheckServiceImpl implements RiskCheckService {
    @Override
    public CompletableFuture<Boolean> checkAsync(PaymentRequestDto req) {
        return CompletableFuture.completedFuture(true);
    }
}
