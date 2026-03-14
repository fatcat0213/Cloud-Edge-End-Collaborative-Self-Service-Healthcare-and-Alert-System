package com.yunbd.payment.service;

public interface IdempotencyService {
    boolean isDuplicate(String payId);
    PaymentVerifyService.VerifyResult getCachedResult(String payId);
    void cacheResult(String payId, PaymentVerifyService.VerifyResult result);
}
