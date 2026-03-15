package com.yunbd.payment.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yunbd.payment.service.IdempotencyService;
import com.yunbd.payment.service.PaymentVerifyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisIdempotencyService implements IdempotencyService {

    private static final String KEY_PREFIX = "pay:";
    private static final Duration TTL = Duration.ofHours(24);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public boolean isDuplicate(String payId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_PREFIX + payId));
    }

    @Override
    public PaymentVerifyService.VerifyResult getCachedResult(String payId) {
        String json = redisTemplate.opsForValue().get(KEY_PREFIX + payId);
        if (json == null) return new PaymentVerifyService.VerifyResult(false, "cache_miss");
        try {
            return objectMapper.readValue(json, PaymentVerifyService.VerifyResult.class);
        } catch (Exception e) {
            log.warn("Failed to deserialize cached result for {}", payId);
            return new PaymentVerifyService.VerifyResult(true, "cached");
        }
    }

    @Override
    public void cacheResult(String payId, PaymentVerifyService.VerifyResult result) {
        try {
            String json = objectMapper.writeValueAsString(result);
            redisTemplate.opsForValue().set(KEY_PREFIX + payId, json, TTL);
        } catch (Exception e) {
            log.warn("Failed to cache result for {}", payId);
        }
    }
}
