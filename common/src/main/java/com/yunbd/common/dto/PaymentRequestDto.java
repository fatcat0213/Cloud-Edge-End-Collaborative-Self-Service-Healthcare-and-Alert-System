package com.yunbd.common.dto;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class PaymentRequestDto {
    private String payId;
    private String terminalId;
    private String patientId;
    private BigDecimal amount;
    private String method;      // insurance / self_pay / mixed
}
