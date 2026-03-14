package com.yunbd.queue;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(QueueController.class)
class QueueControllerTest {
    @Autowired MockMvc mvc;

    @Test
    void getQueueStatus_shouldReturnDepthAndWait() throws Exception {
        mvc.perform(get("/api/v1/queue/NEU"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.depth").isNumber())
            .andExpect(jsonPath("$.avgWaitMs").isNumber());
    }
}
