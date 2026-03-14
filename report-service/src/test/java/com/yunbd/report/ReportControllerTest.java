package com.yunbd.report;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ReportController.class)
class ReportControllerTest {
    @Autowired MockMvc mvc;

    @Test
    void getReports_shouldReturn200() throws Exception {
        mvc.perform(get("/api/v1/report/P001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.patientId").value("P001"));
    }
}
