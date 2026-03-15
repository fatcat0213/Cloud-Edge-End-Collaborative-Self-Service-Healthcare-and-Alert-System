package com.yunbd.edge;

import com.yunbd.common.dto.AlertDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
public class AlertController {
    private final AlertStore alertStore;

    @GetMapping
    public List<AlertDto> getAlerts() {
        return alertStore.getAll();
    }
}
