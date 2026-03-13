package com.yunbd.common.util;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class HmacUtilTest {

    @Test
    void sign_shouldReturnSha256PrefixedString() throws Exception {
        String result = HmacUtil.sign("hello", "secret");
        assertThat(result).startsWith("sha256:");
        assertThat(result).hasSizeGreaterThan(10);
    }

    @Test
    void verify_withCorrectSecret_shouldReturnTrue() throws Exception {
        String data = "test-payload";
        String secret = "my-secret";
        String hmac = HmacUtil.sign(data, secret);
        assertThat(HmacUtil.verify(data, secret, hmac)).isTrue();
    }

    @Test
    void verify_withWrongSecret_shouldReturnFalse() throws Exception {
        String hmac = HmacUtil.sign("data", "secret");
        assertThat(HmacUtil.verify("data", "wrong-secret", hmac)).isFalse();
    }

    @Test
    void verify_withNullExpected_shouldReturnFalse() throws Exception {
        assertThat(HmacUtil.verify("data", "secret", null)).isFalse();
    }
}
