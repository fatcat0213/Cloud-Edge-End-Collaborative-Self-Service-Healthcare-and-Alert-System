package com.yunbd.edge.kubeedge;

import io.kubernetes.client.openapi.ApiClient;
import io.kubernetes.client.openapi.ApiException;
import io.kubernetes.client.openapi.Configuration;
import io.kubernetes.client.openapi.apis.CoreV1Api;
import io.kubernetes.client.openapi.models.V1Node;
import io.kubernetes.client.util.Config;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
public class EdgeNodeClient {

    @Value("${kubeedge.in-cluster:true}")
    private boolean inCluster;

    private CoreV1Api coreApi;

    @PostConstruct
    public void init() throws Exception {
        if (inCluster) {
            ApiClient client = Config.fromCluster();
            Configuration.setDefaultApiClient(client);
        } else {
            String kubeconfig = System.getenv("KUBECONFIG");
            if (kubeconfig != null) {
                ApiClient client = Config.fromConfig(kubeconfig);
                Configuration.setDefaultApiClient(client);
            }
        }
        this.coreApi = new CoreV1Api();
    }

    public List<EdgeNodeInfo> getEdgeNodes() {
        try {
            List<V1Node> edgeNodes = coreApi.listNode(
                null, null, null,
                "node-role.kubernetes.io/edge=true",
                null, null, null, null, null, null
            ).getItems();

            return edgeNodes.stream()
                .map(this::toEdgeNodeInfo)
                .collect(Collectors.toList());

        } catch (ApiException e) {
            log.error("Failed to list edge nodes: {}", e.getMessage());
            return List.of();
        }
    }

    private EdgeNodeInfo toEdgeNodeInfo(V1Node node) {
        EdgeNodeInfo info = new EdgeNodeInfo();
        info.setName(node.getMetadata().getName());
        info.setReady(node.getStatus().getConditions().stream()
            .anyMatch(c -> "Ready".equals(c.getType()) && "True".equals(c.getStatus())));

        var labels = node.getMetadata().getLabels();
        info.setTerminalId(labels.get("terminal/id"));
        info.setLocation(labels.get("terminal/location"));

        var lastHeartbeat = node.getStatus().getConditions().stream()
            .filter(c -> "Ready".equals(c.getType()))
            .findFirst()
            .map(c -> c.getLastHeartbeatTime())
            .orElse(null);
        info.setLastHeartbeatTime(lastHeartbeat);

        return info;
    }

    @Data
    public static class EdgeNodeInfo {
        private String name;
        private boolean ready;
        private String terminalId;
        private String location;
        private Object lastHeartbeatTime; // io.kubernetes.client.openapi.models.V1Time
    }
}