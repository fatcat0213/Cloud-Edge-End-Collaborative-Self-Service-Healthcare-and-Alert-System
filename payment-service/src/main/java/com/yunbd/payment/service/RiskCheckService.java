package com.yunbd.payment.service;

import com.yunbd.common.dto.PaymentRequestDto;
import java.util.concurrent.CompletableFuture;

public interface RiskCheckService {
    CompletableFuture<Boolean> checkAsync(PaymentRequestDto req);
}
