package com.yunbd.edge;

import com.yunbd.common.dto.AlertDto;
import org.springframework.stereotype.Component;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

@Component
public class AlertStore {
    private static final int MAX_SIZE = 200;
    private final Deque<AlertDto> alerts = new ArrayDeque<>();

    public synchronized void add(AlertDto alert) {
        alerts.addFirst(alert);
        if (alerts.size() > MAX_SIZE) alerts.removeLast();
    }

    public synchronized List<AlertDto> getAll() {
        return new ArrayList<>(alerts);
    }
}
