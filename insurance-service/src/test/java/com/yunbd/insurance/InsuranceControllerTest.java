package com.yunbd.insurance;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(InsuranceController.class)
class InsuranceControllerTest {
    @Autowired MockMvc mvc;

    @Test
    void verify_shouldReturnEligible() throws Exception {
        mvc.perform(post("/api/v1/insurance/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"patientId\":\"P001\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.eligible").value(true));
    }
}
