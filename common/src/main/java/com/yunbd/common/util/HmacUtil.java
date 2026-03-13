package com.yunbd.common.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class HmacUtil {
    private static final String ALGORITHM = "HmacSHA256";

    public static String sign(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance(ALGORITHM);
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), ALGORITHM));
        return "sha256:" + Base64.getEncoder().encodeToString(
            mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }

    public static boolean verify(String data, String secret, String expected) throws Exception {
        if (expected == null) return false;
        return sign(data, secret).equals(expected);
    }
}
