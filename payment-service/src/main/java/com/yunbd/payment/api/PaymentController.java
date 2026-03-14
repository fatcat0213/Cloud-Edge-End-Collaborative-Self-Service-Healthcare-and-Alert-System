package com.yunbd.payment.api;

import com.yunbd.common.dto.PaymentRequestDto;
import com.yunbd.payment.service.PaymentVerifyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payment")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentVerifyService verifyService;

    @PostMapping("/verify")
    public ResponseEntity<PaymentVerifyService.VerifyResult> verify(
            @RequestBody PaymentRequestDto req) {
        return ResponseEntity.ok(verifyService.verify(req));
    }
}
