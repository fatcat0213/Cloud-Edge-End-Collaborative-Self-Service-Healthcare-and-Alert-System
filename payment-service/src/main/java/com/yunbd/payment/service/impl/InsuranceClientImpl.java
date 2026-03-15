package com.yunbd.payment.service.impl;

import com.yunbd.payment.service.InsuranceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class InsuranceClientImpl implements InsuranceClient {

    private final RestTemplate restTemplate;

    @Value("${insurance.service.url:http://insurance-service:8085}")
    private String insuranceServiceUrl;

    @Override
    @SuppressWarnings("unchecked")
    public CompletableFuture<Boolean> verifyAsync(String patientId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Map<String, Object> resp = restTemplate.postForObject(
                    insuranceServiceUrl + "/api/v1/insurance/verify",
                    Map.of("patientId", patientId),
                    Map.class);
                return resp != null && Boolean.TRUE.equals(resp.get("eligible"));
            } catch (Exception e) {
                log.warn("Insurance service call failed for {}: {}", patientId, e.getMessage());
                return null; // null triggers self-pay fallback in PaymentVerifyService
            }
        });
    }
}
