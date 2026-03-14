package com.yunbd.payment.service;

// Note: VerifyResult is a static inner class of PaymentVerifyService. Both live in the
// same package so this reference compiles cleanly; if VerifyResult is later promoted to a
// standalone DTO, only this interface and its implementations need updating.
public interface IdempotencyService {
    boolean isDuplicate(String payId);
    PaymentVerifyService.VerifyResult getCachedResult(String payId);
    void cacheResult(String payId, PaymentVerifyService.VerifyResult result);
}
