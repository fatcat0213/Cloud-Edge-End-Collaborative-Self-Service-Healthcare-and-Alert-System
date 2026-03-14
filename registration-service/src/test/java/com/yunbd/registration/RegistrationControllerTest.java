package com.yunbd.registration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RegistrationController.class)
class RegistrationControllerTest {
    @Autowired MockMvc mvc;

    @Test
    void register_validRequest_shouldReturn200() throws Exception {
        mvc.perform(post("/api/v1/registration")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"patientId\":\"P001\",\"deptCode\":\"NEU\",\"date\":\"2026-03-12\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.registrationId").isNotEmpty());
    }
}
