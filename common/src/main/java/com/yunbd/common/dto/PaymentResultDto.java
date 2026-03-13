package com.yunbd.common.dto;
import lombok.Data;

@Data
public class PaymentResultDto {
    private String payId;
    private boolean success;
    private String reason;
    private boolean fallbackToSelfPay;
    private long processedAt;
}
