package com.yunbd.payment.service;

import java.util.concurrent.CompletableFuture;

public interface InsuranceClient {
    CompletableFuture<Boolean> verifyAsync(String patientId);
}
