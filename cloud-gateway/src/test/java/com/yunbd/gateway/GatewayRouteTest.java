package com.yunbd.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.gateway.route.RouteLocator;
import java.util.List;
import static org.assertj.core.api.Assertions.*;

// Redis and rate-limiter are excluded via src/test/resources/application.yml so no
// real Redis connection or Mockito class-mocking is required.
@SpringBootTest
class GatewayRouteTest {

    @Autowired
    RouteLocator routeLocator;

    @Test
    void routeLocator_shouldHaveAllFiveRoutes() {
        List<String> ids = routeLocator.getRoutes()
            .map(r -> r.getId())
            .collectList()
            .block();
        assertThat(ids).contains(
            "payment-service",
            "registration-service",
            "report-service",
            "queue-service",
            "insurance-service");
    }
}
