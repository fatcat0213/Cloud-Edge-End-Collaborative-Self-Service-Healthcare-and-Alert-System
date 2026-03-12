# 云边端就医自助终端监测及预警系统 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建基于 KubeEdge + Spring Cloud 的单医院就医自助终端云边端监测预警系统，满足 50ms 延迟、1s 支付响应、98% F1 异常检测等核心 KPI。

**Architecture:** 三层架构 — 端层（Java 仿真终端 × 20）→ 边缘层（KubeEdge EdgeCore + Spring Boot + Drools）→ 云端层（Spring Cloud 微服务 + Kafka + Flink），使用 MQTT/gRPC/Kafka 通信，K8s 统一编排。

**Tech Stack:** Java 17、Spring Boot 3.2、Spring Cloud 2023、KubeEdge 1.16、Apache Kafka 3.6、Apache Flink 1.18、Drools 8.x、MySQL 8.0、Redis 7.2、Mosquitto 2.0、Prometheus + Grafana + Jaeger、JUnit 5、Testcontainers 1.19

---

## 项目文件结构

```
yunbianduan/
├── pom.xml                          # 父 POM（多模块）
├── common/                          # 共享 DTO、接口、工具类
│   └── src/main/java/com/yunbd/common/
│       ├── dto/TerminalStatusDto.java
│       ├── dto/TerminalEventDto.java
│       ├── dto/AlertDto.java
│       ├── dto/PaymentRequestDto.java
│       ├── dto/PaymentResultDto.java
│       └── util/HmacUtil.java
├── simulator/                       # 终端仿真客户端（20台并发）
│   └── src/main/java/com/yunbd/sim/
│       ├── TerminalSimulator.java
│       ├── TerminalClient.java
│       └── ScenarioRunner.java
├── edge-service/                    # 边缘层 Spring Boot 服务
│   └── src/main/java/com/yunbd/edge/
│       ├── EdgeApplication.java
│       ├── mqtt/MqttSubscriber.java
│       ├── mqtt/MqttPublisher.java
│       ├── rules/DroolsEngine.java
│       ├── rules/TerminalRules.drl
│       ├── cache/PatientCacheService.java
│       └── grpc/EdgeCloudGrpcClient.java
├── cloud-gateway/                   # Spring Cloud Gateway
│   └── src/main/java/com/yunbd/gateway/
│       ├── GatewayApplication.java
│       └── config/RouteConfig.java
├── payment-service/                 # 支付验证微服务
│   └── src/main/java/com/yunbd/payment/
│       ├── PaymentApplication.java
│       ├── api/PaymentController.java
│       ├── service/PaymentVerifyService.java
│       ├── service/InsuranceClient.java
│       ├── service/RiskCheckService.java
│       └── service/IdempotencyService.java
├── registration-service/            # 挂号预约微服务
├── report-service/                  # 报告查询微服务
├── queue-service/                   # 叫号导诊微服务
├── insurance-service/               # 医保结算微服务
├── flink-jobs/                      # Flink 异常检测作业
│   └── src/main/java/com/yunbd/flink/
│       ├── FlinkJobMain.java
│       ├── job/TransactionSuccessRateJob.java
│       ├── job/SecurityAnomalyJob.java
│       └── sink/AlertSink.java
├── infra/                           # K8s / KubeEdge 部署清单
│   ├── namespaces.yaml
│   ├── kafka/kafka-deployment.yaml
│   ├── mysql/mysql-deployment.yaml
│   ├── redis/redis-deployment.yaml
│   ├── flink/flink-deployment.yaml
│   ├── kubeedge/edgecore-config.yaml
│   ├── monitoring/prometheus.yaml
│   ├── monitoring/grafana.yaml
│   └── monitoring/jaeger.yaml
├── simulation/                      # 延迟仿真脚本
│   ├── inject-delay.sh
│   └── remove-delay.sh
├── test-data/                       # 异常检测标注样本
│   └── anomaly-samples.json
└── docs/
    ├── baseline/T0-measurement.md
    └── superpowers/
        ├── specs/2026-03-12-yunbianduan-design.md
        └── plans/2026-03-12-yunbianduan-implementation.md
```

---

## Chunk 1: 项目骨架与基础设施

### Task 1: 创建 Maven 多模块父项目

**Files:**
- Create: `pom.xml`
- Create: `common/pom.xml`

- [ ] **Step 1: 初始化父 POM**

```xml
<!-- pom.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.yunbd</groupId>
    <artifactId>yunbianduan-parent</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>pom</packaging>

    <modules>
        <module>common</module>
        <module>simulator</module>
        <module>edge-service</module>
        <module>cloud-gateway</module>
        <module>payment-service</module>
        <module>registration-service</module>
        <module>report-service</module>
        <module>queue-service</module>
        <module>insurance-service</module>
        <module>flink-jobs</module>
    </modules>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.3</version>
    </parent>

    <properties>
        <java.version>17</java.version>
        <spring-cloud.version>2023.0.0</spring-cloud.version>
        <testcontainers.version>1.19.6</testcontainers.version>
        <flink.version>1.18.1</flink.version>
        <drools.version>8.41.0.Final</drools.version>
        <grpc.version>1.62.2</grpc.version>
        <protobuf.version>3.25.3</protobuf.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.cloud</groupId>
                <artifactId>spring-cloud-dependencies</artifactId>
                <version>${spring-cloud.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
            <dependency>
                <groupId>org.testcontainers</groupId>
                <artifactId>testcontainers-bom</artifactId>
                <version>${testcontainers.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
            <dependency>
                <groupId>com.yunbd</groupId>
                <artifactId>common</artifactId>
                <version>${project.version}</version>
            </dependency>
        </dependencies>
    </dependencyManagement>
</project>
```

- [ ] **Step 2: 创建 common 模块 POM**

```xml
<!-- common/pom.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>com.yunbd</groupId>
        <artifactId>yunbianduan-parent</artifactId>
        <version>1.0.0-SNAPSHOT</version>
    </parent>
    <artifactId>common</artifactId>
    <dependencies>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
        </dependency>
    </dependencies>
</project>
```

- [ ] **Step 3: 创建共享 DTO（含 TerminalEventDto、PaymentResultDto）**

```java
// common/src/main/java/com/yunbd/common/dto/TerminalEventDto.java
package com.yunbd.common.dto;

import lombok.Data;

@Data
public class TerminalEventDto {
    private String eventId;
    private String terminalId;
    private long timestamp;
    private String eventType;   // PAYMENT / REGISTRATION / REPORT / QUEUE
    private String status;      // success / failure
    private String patientId;
    private long durationMs;
}
```

```java
// common/src/main/java/com/yunbd/common/dto/PaymentResultDto.java
package com.yunbd.common.dto;

import lombok.Data;

@Data
public class PaymentResultDto {
    private String payId;
    private boolean success;
    private String reason;
    private boolean fallbackToSelfPay;
    private long processedAt;
}
```

```java
// common/src/main/java/com/yunbd/common/dto/TerminalStatusDto.java
package com.yunbd.common.dto;

import lombok.Data;
import java.time.Instant;

@Data
public class TerminalStatusDto {
    private String terminalId;
    private long timestamp;
    private String status;          // online / offline / degraded
    private HardwareStatus hardware;
    private QueueStatus queue;
    private String hmac;

    @Data
    public static class HardwareStatus {
        private String printer;     // ok / error / paper_jam
        private String cardReader;  // ok / error
        private String screen;      // ok / error
    }

    @Data
    public static class QueueStatus {
        private int depth;
        private long avgWaitMs;
    }
}
```

```java
// common/src/main/java/com/yunbd/common/dto/AlertDto.java
package com.yunbd.common.dto;

import lombok.Data;

@Data
public class AlertDto {
    private String alertId;
    private String terminalId;
    private String level;       // P0 / P1 / P2
    private String type;        // HARDWARE / BUSINESS / SECURITY
    private String message;
    private long timestamp;
}
```

```java
// common/src/main/java/com/yunbd/common/dto/PaymentRequestDto.java
package com.yunbd.common.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class PaymentRequestDto {
    private String payId;
    private String terminalId;
    private String patientId;
    private BigDecimal amount;
    private String method;      // insurance / self_pay / mixed
}
```

```java
// common/src/main/java/com/yunbd/common/util/HmacUtil.java
package com.yunbd.common.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

public class HmacUtil {
    private static final String ALGORITHM = "HmacSHA256";

    public static String sign(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance(ALGORITHM);
        mac.init(new SecretKeySpec(secret.getBytes(), ALGORITHM));
        return "sha256:" + Base64.getEncoder().encodeToString(mac.doFinal(data.getBytes()));
    }

    public static boolean verify(String data, String secret, String expected) throws Exception {
        return sign(data, secret).equals(expected);
    }
}
```

- [ ] **Step 4: 验证编译**

```bash
cd D:/yunbianduan
mvn clean compile -pl common
```

Expected: `BUILD SUCCESS`

- [ ] **Step 5: 提交**

```bash
git add pom.xml common/
git commit -m "feat: init multi-module maven project with common DTOs"
```

---

### Task 2: K8s 基础设施清单

**Files:**
- Create: `infra/namespaces.yaml`
- Create: `infra/kafka/kafka-deployment.yaml`
- Create: `infra/mysql/mysql-deployment.yaml`
- Create: `infra/redis/redis-cloud-deployment.yaml`

- [ ] **Step 1: 创建 Namespace 清单**

```yaml
# infra/namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: yunbianduan-cloud
---
apiVersion: v1
kind: Namespace
metadata:
  name: yunbianduan-edge
---
apiVersion: v1
kind: Namespace
metadata:
  name: yunbianduan-sim
---
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
```

- [ ] **Step 2: 应用 Namespace**

```bash
kubectl apply -f infra/namespaces.yaml
kubectl get namespaces | grep yunbianduan
```

Expected: 3 个 yunbianduan-* 和 monitoring namespace 出现

- [ ] **Step 3: 创建 Kafka 部署清单（单节点开发模式）**

```yaml
# infra/kafka/kafka-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka
  namespace: yunbianduan-cloud
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
      - name: kafka
        image: bitnami/kafka:3.6
        env:
        - name: KAFKA_CFG_NODE_ID
          value: "0"
        - name: KAFKA_CFG_PROCESS_ROLES
          value: "controller,broker"
        - name: KAFKA_CFG_LISTENERS
          value: "PLAINTEXT://:9092,CONTROLLER://:9093"
        - name: KAFKA_CFG_ADVERTISED_LISTENERS
          value: "PLAINTEXT://kafka.yunbianduan-cloud.svc.cluster.local:9092"
        - name: KAFKA_CFG_CONTROLLER_QUORUM_VOTERS
          value: "0@kafka:9093"
        - name: KAFKA_CFG_CONTROLLER_LISTENER_NAMES
          value: "CONTROLLER"
        ports:
        - containerPort: 9092
---
apiVersion: v1
kind: Service
metadata:
  name: kafka
  namespace: yunbianduan-cloud
spec:
  selector:
    app: kafka
  ports:
  - port: 9092
    targetPort: 9092
```

- [ ] **Step 4: 创建 MySQL 部署清单**

```yaml
# infra/mysql/mysql-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
  namespace: yunbianduan-cloud
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: root-password
        - name: MYSQL_DATABASE
          value: "yunbianduan"
        ports:
        - containerPort: 3306
        volumeMounts:
        - name: mysql-data
          mountPath: /var/lib/mysql
      volumes:
      - name: mysql-data
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: yunbianduan-cloud
spec:
  selector:
    app: mysql
  ports:
  - port: 3306
    targetPort: 3306
```

- [ ] **Step 5: 创建 Redis 部署清单**

```yaml
# infra/redis/redis-cloud-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: yunbianduan-cloud
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7.2
        command: ["redis-server", "--requirepass", "yunbd_redis_2026"]
        ports:
        - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: yunbianduan-cloud
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

- [ ] **Step 6: 创建 K8s Secret 并部署基础设施**

```bash
# 先创建 MySQL Secret（不提交明文密码到 git）
kubectl create secret generic mysql-secret \
  --from-literal=root-password=yunbd_root_2026 \
  -n yunbianduan-cloud

kubectl apply -f infra/kafka/kafka-deployment.yaml
kubectl apply -f infra/mysql/mysql-deployment.yaml
kubectl apply -f infra/redis/redis-cloud-deployment.yaml
kubectl get pods -n yunbianduan-cloud
```

Expected: kafka, mysql, redis Pod 全部 Running

- [ ] **Step 7: 初始化数据库 Schema**

```sql
-- 在 MySQL Pod 内执行：kubectl exec -it <mysql-pod> -n yunbianduan-cloud -- mysql -u root -pyunbd_root_2026 yunbianduan

CREATE TABLE terminal_status (
    terminal_id VARCHAR(20) PRIMARY KEY,
    edge_id VARCHAR(20),
    status VARCHAR(20),
    last_heartbeat BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE payment_record (
    pay_id VARCHAR(64) PRIMARY KEY,
    terminal_id VARCHAR(20),
    patient_id VARCHAR(32),
    amount DECIMAL(10,2),
    method VARCHAR(20),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alert_record (
    alert_id VARCHAR(64) PRIMARY KEY,
    terminal_id VARCHAR(20),
    level VARCHAR(5),
    type VARCHAR(20),
    message TEXT,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_terminal (terminal_id),
    INDEX idx_created (created_at)
);

CREATE TABLE audit_log (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    terminal_id VARCHAR(20),
    operator VARCHAR(50),
    action VARCHAR(50),
    detail_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED;

CREATE TABLE satisfaction_log (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    terminal_id VARCHAR(20),
    business_type VARCHAR(30),
    score TINYINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 8: 提交**

```bash
git add infra/
git commit -m "feat: add k8s infra manifests for kafka/mysql/redis"
```

---

### Task 3: Mosquitto MQTT Broker 部署（边缘层）

**Files:**
- Create: `infra/kubeedge/mosquitto-deployment.yaml`

- [ ] **Step 1: 创建 Mosquitto 部署**

```yaml
# infra/kubeedge/mosquitto-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mosquitto
  namespace: yunbianduan-edge
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mosquitto
  template:
    metadata:
      labels:
        app: mosquitto
    spec:
      containers:
      - name: mosquitto
        image: eclipse-mosquitto:2.0
        ports:
        - containerPort: 1883   # MQTT
        - containerPort: 8883   # MQTT over TLS
        volumeMounts:
        - name: mosquitto-config
          mountPath: /mosquitto/config
      volumes:
      - name: mosquitto-config
        configMap:
          name: mosquitto-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mosquitto-config
  namespace: yunbianduan-edge
data:
  mosquitto.conf: |
    listener 1883
    allow_anonymous true
    persistence true
    persistence_location /mosquitto/data/
    log_dest stdout
---
apiVersion: v1
kind: Service
metadata:
  name: mosquitto
  namespace: yunbianduan-edge
spec:
  selector:
    app: mosquitto
  ports:
  - name: mqtt
    port: 1883
    targetPort: 1883
```

- [ ] **Step 2: 部署并验证**

```bash
kubectl apply -f infra/kubeedge/mosquitto-deployment.yaml
kubectl get pods -n yunbianduan-edge
```

Expected: mosquitto Pod Running

- [ ] **Step 3: 提交**

```bash
git add infra/kubeedge/
git commit -m "feat: add mosquitto mqtt broker deployment for edge namespace"
```

---

## Chunk 2: 终端仿真客户端

### Task 4: 终端仿真器 Maven 模块

**Files:**
- Create: `simulator/pom.xml`
- Create: `simulator/src/main/java/com/yunbd/sim/TerminalClient.java`
- Create: `simulator/src/main/java/com/yunbd/sim/TerminalSimulator.java`
- Create: `simulator/src/main/resources/application.yml`
- Create: `simulator/src/test/java/com/yunbd/sim/TerminalClientTest.java`
- Create: `simulator/src/test/java/com/yunbd/sim/TerminalSimulatorTest.java`

- [ ] **Step 0: 创建 simulator/pom.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>com.yunbd</groupId>
        <artifactId>yunbianduan-parent</artifactId>
        <version>1.0.0-SNAPSHOT</version>
    </parent>
    <artifactId>simulator</artifactId>

    <dependencies>
        <dependency>
            <groupId>com.yunbd</groupId>
            <artifactId>common</artifactId>
        </dependency>
        <dependency>
            <groupId>org.eclipse.paho</groupId>
            <artifactId>org.eclipse.paho.mqttv5.client</artifactId>
            <version>1.2.5</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>ch.qos.logback</groupId>
            <artifactId>logback-classic</artifactId>
        </dependency>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.assertj</groupId>
            <artifactId>assertj-core</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>
```

- [ ] **Step 1: 编写 TerminalClient 单元测试（先写失败测试）**

```java
// simulator/src/test/java/com/yunbd/sim/TerminalClientTest.java
package com.yunbd.sim;

import com.yunbd.common.dto.TerminalStatusDto;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class TerminalClientTest {

    @Test
    void buildStatusPayload_shouldIncludeTerminalIdAndTimestamp() {
        TerminalClient client = new TerminalClient("T001", "localhost", 1883);
        TerminalStatusDto dto = client.buildStatusPayload();

        assertThat(dto.getTerminalId()).isEqualTo("T001");
        assertThat(dto.getTimestamp()).isPositive();
        assertThat(dto.getStatus()).isEqualTo("online");
        assertThat(dto.getHardware()).isNotNull();
        assertThat(dto.getHardware().getPrinter()).isEqualTo("ok");
    }

    @Test
    void buildStatusPayload_shouldHaveHmacSignature() throws Exception {
        TerminalClient client = new TerminalClient("T001", "localhost", 1883);
        TerminalStatusDto dto = client.buildStatusPayload();
        assertThat(dto.getHmac()).startsWith("sha256:");
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd D:/yunbianduan
mvn test -pl simulator -Dtest=TerminalClientTest
```

Expected: FAIL with `TerminalClient not found`

- [ ] **Step 3: 实现 TerminalClient**

```java
// simulator/src/main/java/com/yunbd/sim/TerminalClient.java
package com.yunbd.sim;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yunbd.common.dto.TerminalStatusDto;
import com.yunbd.common.util.HmacUtil;
import org.eclipse.paho.mqttv5.client.*;
import org.eclipse.paho.mqttv5.client.persist.MemoryPersistence;
import org.eclipse.paho.mqttv5.common.MqttMessage;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class TerminalClient {
    // 从环境变量读取，dev 模式回退到默认值（生产环境需通过 K8s Secret 注入）
    private static final String HMAC_SECRET =
        System.getenv().getOrDefault("HMAC_SECRET", "yunbd-terminal-secret-2026");
    private final String terminalId;
    private final String brokerHost;
    private final int brokerPort;
    private final ObjectMapper mapper = new ObjectMapper();
    private MqttAsyncClient mqttClient;

    public TerminalClient(String terminalId, String brokerHost, int brokerPort) {
        this.terminalId = terminalId;
        this.brokerHost = brokerHost;
        this.brokerPort = brokerPort;
    }

    public void connect() throws Exception {
        String broker = "tcp://" + brokerHost + ":" + brokerPort;
        mqttClient = new MqttAsyncClient(broker, terminalId, new MemoryPersistence());
        MqttConnectionOptions opts = new MqttConnectionOptions();
        opts.setCleanStart(false);
        opts.setKeepAliveInterval(30);
        opts.setSessionExpiryInterval(86400L);
        mqttClient.connect(opts).waitForCompletion(5000);
        log.info("Terminal {} connected to {}", terminalId, broker);
    }

    public TerminalStatusDto buildStatusPayload() {
        TerminalStatusDto dto = new TerminalStatusDto();
        dto.setTerminalId(terminalId);
        dto.setTimestamp(System.currentTimeMillis());
        dto.setStatus("online");

        TerminalStatusDto.HardwareStatus hw = new TerminalStatusDto.HardwareStatus();
        hw.setPrinter("ok");
        hw.setCardReader("ok");
        hw.setScreen("ok");
        dto.setHardware(hw);

        TerminalStatusDto.QueueStatus qs = new TerminalStatusDto.QueueStatus();
        qs.setDepth((int)(Math.random() * 10));
        qs.setAvgWaitMs((long)(Math.random() * 120000));
        dto.setQueue(qs);

        try {
            String payload = mapper.writeValueAsString(dto);
            dto.setHmac(HmacUtil.sign(payload, HMAC_SECRET));
        } catch (Exception e) {
            log.error("HMAC signing failed", e);
        }
        return dto;
    }

    public void publishStatus() throws Exception {
        TerminalStatusDto dto = buildStatusPayload();
        String topic = "terminal/" + terminalId + "/status";
        String payload = mapper.writeValueAsString(dto);
        MqttMessage msg = new MqttMessage(payload.getBytes());
        msg.setQos(1);
        mqttClient.publish(topic, msg).waitForCompletion(3000);
    }

    public void disconnect() throws Exception {
        if (mqttClient != null && mqttClient.isConnected()) {
            mqttClient.disconnect().waitForCompletion(3000);
        }
    }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
mvn test -pl simulator -Dtest=TerminalClientTest
```

Expected: PASS（2 tests）

- [ ] **Step 4b: 编写 TerminalSimulator 测试（先失败）**

```java
// simulator/src/test/java/com/yunbd/sim/TerminalSimulatorTest.java
package com.yunbd.sim;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class TerminalSimulatorTest {

    @Test
    void constructor_shouldAcceptTerminalCountAndBrokerParams() {
        TerminalSimulator sim = new TerminalSimulator(5, "localhost", 1883);
        assertThat(sim).isNotNull();
        assertThat(sim.getTerminalCount()).isEqualTo(5);
    }
}
```

Run: `mvn test -pl simulator -Dtest=TerminalSimulatorTest`
Expected: FAIL with `TerminalSimulator not found`

- [ ] **Step 5: 实现 TerminalSimulator（20台并发）**

```java
// simulator/src/main/java/com/yunbd/sim/TerminalSimulator.java
package com.yunbd.sim;

import lombok.extern.slf4j.Slf4j;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

@Slf4j
public class TerminalSimulator {
    private final int terminalCount;
    private final String brokerHost;
    private final int brokerPort;
    private final ScheduledExecutorService scheduler;
    private final List<TerminalClient> clients = new ArrayList<>();

    public TerminalSimulator(int terminalCount, String brokerHost, int brokerPort) {
        this.terminalCount = terminalCount;
        this.brokerHost = brokerHost;
        this.brokerPort = brokerPort;
        this.scheduler = Executors.newScheduledThreadPool(terminalCount);
    }

    public void start() throws Exception {
        for (int i = 1; i <= terminalCount; i++) {
            TerminalClient client = new TerminalClient(
                String.format("T%03d", i), brokerHost, brokerPort);
            client.connect();
            clients.add(client);
            // 每5秒上报一次心跳
            final TerminalClient c = client;
            scheduler.scheduleAtFixedRate(
                () -> { try { c.publishStatus(); } catch (Exception e) { log.error("Publish error", e); }},
                i * 100L, 5000L, TimeUnit.MILLISECONDS);
        }
        log.info("Started {} terminal simulators", terminalCount);
    }

    public int getTerminalCount() { return terminalCount; }

    public void stop() throws Exception {
        scheduler.shutdown();
        scheduler.awaitTermination(5, TimeUnit.SECONDS);
        for (TerminalClient c : clients) c.disconnect();
    }

    public static void main(String[] args) throws Exception {
        String brokerHost = System.getenv().getOrDefault("MQTT_HOST", "localhost");
        int brokerPort = Integer.parseInt(System.getenv().getOrDefault("MQTT_PORT", "1883"));
        int count = Integer.parseInt(System.getenv().getOrDefault("TERMINAL_COUNT", "20"));
        TerminalSimulator sim = new TerminalSimulator(count, brokerHost, brokerPort);
        sim.start();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try { sim.stop(); } catch (Exception e) { log.error("Shutdown error", e); }
        }));
        Thread.currentThread().join();
    }
}
```

- [ ] **Step 5b: 创建 simulator/src/main/resources/application.yml**

```yaml
# simulator/src/main/resources/application.yml
mqtt:
  host: ${MQTT_HOST:localhost}
  port: ${MQTT_PORT:1883}
terminal:
  count: ${TERMINAL_COUNT:20}
  hmac-secret: ${HMAC_SECRET:yunbd-terminal-secret-2026}
```

- [ ] **Step 6: 运行 TerminalSimulatorTest 确认通过**

```bash
mvn test -pl simulator -Dtest=TerminalSimulatorTest
```

Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add simulator/
git commit -m "feat: implement terminal simulator with MQTT heartbeat publishing"
```

---

## Chunk 3: 边缘层 — Spring Boot + Drools

### Task 5: 边缘服务 Drools 规则引擎

**Files:**
- Create: `edge-service/pom.xml`
- Create: `edge-service/src/main/java/com/yunbd/edge/rules/DroolsEngine.java`
- Create: `edge-service/src/main/resources/rules/TerminalRules.drl`
- Create: `edge-service/src/test/java/com/yunbd/edge/rules/DroolsEngineTest.java`

**注意（在写任何代码之前）：** 先创建 `edge-service/pom.xml`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>com.yunbd</groupId>
        <artifactId>yunbianduan-parent</artifactId>
        <version>1.0.0-SNAPSHOT</version>
    </parent>
    <artifactId>edge-service</artifactId>

    <dependencies>
        <dependency>
            <groupId>com.yunbd</groupId>
            <artifactId>common</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-redis</artifactId>
        </dependency>
        <dependency>
            <groupId>org.eclipse.paho</groupId>
            <artifactId>org.eclipse.paho.mqttv5.client</artifactId>
            <version>1.2.5</version>
        </dependency>
        <dependency>
            <groupId>org.kie</groupId>
            <artifactId>kie-api</artifactId>
            <version>${drools.version}</version>
        </dependency>
        <dependency>
            <groupId>org.drools</groupId>
            <artifactId>drools-core</artifactId>
            <version>${drools.version}</version>
        </dependency>
        <dependency>
            <groupId>org.drools</groupId>
            <artifactId>drools-compiler</artifactId>
            <version>${drools.version}</version>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>testcontainers</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>junit-jupiter</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>
```

- [ ] **Step 1: 编写 Drools 规则引擎测试（先失败）**

```java
// edge-service/src/test/java/com/yunbd/edge/rules/DroolsEngineTest.java
package com.yunbd.edge.rules;

import com.yunbd.common.dto.AlertDto;
import com.yunbd.common.dto.TerminalStatusDto;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import java.util.List;

class DroolsEngineTest {

    private final DroolsEngine engine = new DroolsEngine();

    @Test
    void evaluate_printerError_shouldGenerateP0Alert() {
        TerminalStatusDto status = new TerminalStatusDto();
        status.setTerminalId("T001");
        status.setTimestamp(System.currentTimeMillis());
        status.setStatus("online");
        TerminalStatusDto.HardwareStatus hw = new TerminalStatusDto.HardwareStatus();
        hw.setPrinter("paper_jam");
        hw.setCardReader("ok");
        hw.setScreen("ok");
        status.setHardware(hw);
        TerminalStatusDto.QueueStatus qs = new TerminalStatusDto.QueueStatus();
        qs.setDepth(3);
        status.setQueue(qs);

        List<AlertDto> alerts = engine.evaluate(status);

        assertThat(alerts).hasSize(1);
        assertThat(alerts.get(0).getLevel()).isEqualTo("P0");
        assertThat(alerts.get(0).getType()).isEqualTo("HARDWARE");
        assertThat(alerts.get(0).getTerminalId()).isEqualTo("T001");
    }

    @Test
    void evaluate_queueOverload_shouldGenerateP1Alert() {
        TerminalStatusDto status = new TerminalStatusDto();
        status.setTerminalId("T002");
        status.setTimestamp(System.currentTimeMillis());
        status.setStatus("online");
        TerminalStatusDto.HardwareStatus hw = new TerminalStatusDto.HardwareStatus();
        hw.setPrinter("ok");
        hw.setCardReader("ok");
        hw.setScreen("ok");
        status.setHardware(hw);
        TerminalStatusDto.QueueStatus qs = new TerminalStatusDto.QueueStatus();
        qs.setDepth(55);  // > 50 阈值
        status.setQueue(qs);

        List<AlertDto> alerts = engine.evaluate(status);

        assertThat(alerts).hasSize(1);
        assertThat(alerts.get(0).getLevel()).isEqualTo("P1");
        assertThat(alerts.get(0).getType()).isEqualTo("BUSINESS");
    }

    @Test
    void evaluate_normalStatus_shouldReturnEmptyAlerts() {
        TerminalStatusDto status = new TerminalStatusDto();
        status.setTerminalId("T003");
        status.setTimestamp(System.currentTimeMillis());
        status.setStatus("online");
        TerminalStatusDto.HardwareStatus hw = new TerminalStatusDto.HardwareStatus();
        hw.setPrinter("ok");
        hw.setCardReader("ok");
        hw.setScreen("ok");
        status.setHardware(hw);
        TerminalStatusDto.QueueStatus qs = new TerminalStatusDto.QueueStatus();
        qs.setDepth(5);
        status.setQueue(qs);

        List<AlertDto> alerts = engine.evaluate(status);

        assertThat(alerts).isEmpty();
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

```bash
mvn test -pl edge-service -Dtest=DroolsEngineTest
```

Expected: FAIL with `DroolsEngine not found`

- [ ] **Step 3: 实现 Drools 规则文件**

```drl
// edge-service/src/main/resources/rules/TerminalRules.drl
package com.yunbd.edge.rules

import com.yunbd.common.dto.TerminalStatusDto
import com.yunbd.common.dto.AlertDto
import java.util.List
import java.util.ArrayList
import java.util.UUID

global List alerts

rule "Printer Paper Jam - P0"
    when
        $s : TerminalStatusDto(hardware.printer == "paper_jam" || hardware.printer == "error")
    then
        AlertDto alert = new AlertDto();
        alert.setAlertId(UUID.randomUUID().toString());
        alert.setTerminalId($s.getTerminalId());
        alert.setLevel("P0");
        alert.setType("HARDWARE");
        alert.setMessage("打印机异常: " + $s.getHardware().getPrinter());
        alert.setTimestamp($s.getTimestamp());
        alerts.add(alert);
end

rule "Card Reader Error - P0"
    when
        $s : TerminalStatusDto(hardware.cardReader == "error")
    then
        AlertDto alert = new AlertDto();
        alert.setAlertId(UUID.randomUUID().toString());
        alert.setTerminalId($s.getTerminalId());
        alert.setLevel("P0");
        alert.setType("HARDWARE");
        alert.setMessage("读卡器故障");
        alert.setTimestamp($s.getTimestamp());
        alerts.add(alert);
end

rule "Terminal Offline - P0"
    when
        $s : TerminalStatusDto(status == "offline")
    then
        AlertDto alert = new AlertDto();
        alert.setAlertId(UUID.randomUUID().toString());
        alert.setTerminalId($s.getTerminalId());
        alert.setLevel("P0");
        alert.setType("HARDWARE");
        alert.setMessage("终端离线");
        alert.setTimestamp($s.getTimestamp());
        alerts.add(alert);
end

rule "Queue Overload - P1"
    when
        $s : TerminalStatusDto(queue.depth > 50)
    then
        AlertDto alert = new AlertDto();
        alert.setAlertId(UUID.randomUUID().toString());
        alert.setTerminalId($s.getTerminalId());
        alert.setLevel("P1");
        alert.setType("BUSINESS");
        alert.setMessage("队列积压: " + $s.getQueue().getDepth() + " 人");
        alert.setTimestamp($s.getTimestamp());
        alerts.add(alert);
end
```

- [ ] **Step 4: 实现 DroolsEngine**

```java
// edge-service/src/main/java/com/yunbd/edge/rules/DroolsEngine.java
package com.yunbd.edge.rules;

import com.yunbd.common.dto.AlertDto;
import com.yunbd.common.dto.TerminalStatusDto;
import lombok.extern.slf4j.Slf4j;
import org.kie.api.builder.Message;
import org.kie.api.builder.Results;
import org.kie.api.io.ResourceType;
import org.kie.api.runtime.KieContainer;
import org.kie.api.runtime.KieSession;
import org.kie.internal.utils.KieHelper;
import java.util.ArrayList;
import java.util.List;

@Slf4j
public class DroolsEngine {
    private final KieContainer kieContainer;

    public DroolsEngine() {
        KieHelper helper = new KieHelper();
        helper.addResourceFromClasspath("rules/TerminalRules.drl", ResourceType.DRL);
        Results results = helper.verify();
        if (results.hasMessages(Message.Level.ERROR)) {
            throw new RuntimeException("Drools compile error: " + results.getMessages());
        }
        // build() 只调用一次，避免 ReleaseId 不匹配
        this.kieContainer = helper.build().newKieContainer();
        log.info("Drools engine initialized");
    }

    public List<AlertDto> evaluate(TerminalStatusDto status) {
        List<AlertDto> alerts = new ArrayList<>();
        KieSession session = kieContainer.newKieSession();
        try {
            session.setGlobal("alerts", alerts);
            session.insert(status);
            session.fireAllRules();
        } finally {
            session.dispose();
        }
        return alerts;
    }
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
mvn test -pl edge-service -Dtest=DroolsEngineTest
```

Expected: PASS（3 tests）

- [ ] **Step 5b: 创建 edge-service/src/main/resources/application.yml**

```yaml
# edge-service/src/main/resources/application.yml
server:
  port: 8090

spring:
  application:
    name: edge-service
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      password: ${REDIS_PASSWORD:yunbd_redis_2026}

mqtt:
  broker-host: ${MQTT_HOST:localhost}
  broker-port: ${MQTT_PORT:1883}

cloud:
  grpc-host: ${CLOUD_GRPC_HOST:localhost}
  grpc-port: ${CLOUD_GRPC_PORT:9090}
```

- [ ] **Step 6: 提交**

```bash
git add edge-service/
git commit -m "feat: implement Drools rules engine with hardware/business anomaly detection"
```

---

### Task 6: 边缘层 MQTT 订阅与告警处理

**Files:**
- Create: `edge-service/src/main/java/com/yunbd/edge/mqtt/MqttSubscriber.java`
- Create: `edge-service/src/main/java/com/yunbd/edge/mqtt/MqttPublisher.java`
- Create: `edge-service/src/main/java/com/yunbd/edge/EdgeApplication.java`
- Create: `edge-service/src/main/resources/application.yml`
- Create: `edge-service/src/test/java/com/yunbd/edge/mqtt/MqttSubscriberIntegrationTest.java`

- [ ] **Step 0b: 创建 Mosquitto 测试配置文件（Testcontainers 所需）**

```text
# edge-service/src/test/resources/mosquitto-no-auth.conf
listener 1883
allow_anonymous true
persistence false
log_dest stdout
```

- [ ] **Step 1: 集成测试（Testcontainers + Mosquitto）**

```java
// edge-service/src/test/java/com/yunbd/edge/mqtt/MqttSubscriberIntegrationTest.java
package com.yunbd.edge.mqtt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yunbd.common.dto.AlertDto;
import com.yunbd.common.dto.TerminalStatusDto;
import com.yunbd.edge.rules.DroolsEngine;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.BindMode;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

@Testcontainers
class MqttSubscriberIntegrationTest {

    @Container
    static GenericContainer<?> mosquitto = new GenericContainer<>("eclipse-mosquitto:2.0")
        .withExposedPorts(1883)
        .withClasspathResourceMapping(
            "mosquitto-no-auth.conf",
            "/mosquitto/config/mosquitto.conf",
            BindMode.READ_ONLY);

    @Test
    void whenPrinterError_thenAlertPublished() throws Exception {
        String host = mosquitto.getHost();
        int port = mosquitto.getMappedPort(1883);

        DroolsEngine engine = new DroolsEngine();
        BlockingQueue<AlertDto> received = new LinkedBlockingQueue<>();
        MqttSubscriber subscriber = new MqttSubscriber(host, port, engine,
            alert -> received.offer(alert));
        subscriber.start();

        // 发布一个打印机故障状态
        // 等待容器完全就绪
        Thread.sleep(1000);

        MqttPublisher publisher = new MqttPublisher(host, port);
        publisher.connect();

        TerminalStatusDto status = buildPrinterErrorStatus("T001");
        ObjectMapper mapper = new ObjectMapper();
        publisher.publish("terminal/T001/status", mapper.writeValueAsString(status));

        AlertDto alert = received.poll(5, TimeUnit.SECONDS);
        assertThat(alert).isNotNull();
        assertThat(alert.getLevel()).isEqualTo("P0");
        assertThat(alert.getType()).isEqualTo("HARDWARE");

        subscriber.stop();
        publisher.disconnect();
    }

    private TerminalStatusDto buildPrinterErrorStatus(String id) {
        TerminalStatusDto s = new TerminalStatusDto();
        s.setTerminalId(id);
        s.setTimestamp(System.currentTimeMillis());
        s.setStatus("online");
        TerminalStatusDto.HardwareStatus hw = new TerminalStatusDto.HardwareStatus();
        hw.setPrinter("paper_jam");
        hw.setCardReader("ok");
        hw.setScreen("ok");
        s.setHardware(hw);
        TerminalStatusDto.QueueStatus qs = new TerminalStatusDto.QueueStatus();
        qs.setDepth(2);
        s.setQueue(qs);
        return s;
    }
}
```

- [ ] **Step 2: 运行确认失败**

```bash
mvn test -pl edge-service -Dtest=MqttSubscriberIntegrationTest
```

Expected: FAIL with `MqttSubscriber not found`

- [ ] **Step 3: 实现 MqttSubscriber**

```java
// edge-service/src/main/java/com/yunbd/edge/mqtt/MqttSubscriber.java
package com.yunbd.edge.mqtt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yunbd.common.dto.AlertDto;
import com.yunbd.common.dto.TerminalStatusDto;
import com.yunbd.edge.rules.DroolsEngine;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.mqttv5.client.*;
import org.eclipse.paho.mqttv5.client.persist.MemoryPersistence;
import org.eclipse.paho.mqttv5.common.MqttMessage;
import org.eclipse.paho.mqttv5.common.packet.MqttProperties;
import java.util.List;
import java.util.function.Consumer;

@Slf4j
public class MqttSubscriber {
    private final String brokerHost;
    private final int brokerPort;
    private final DroolsEngine droolsEngine;
    private final Consumer<AlertDto> alertHandler;
    private final ObjectMapper mapper = new ObjectMapper();
    private MqttAsyncClient client;

    public MqttSubscriber(String brokerHost, int brokerPort,
                          DroolsEngine droolsEngine, Consumer<AlertDto> alertHandler) {
        this.brokerHost = brokerHost;
        this.brokerPort = brokerPort;
        this.droolsEngine = droolsEngine;
        this.alertHandler = alertHandler;
    }

    public void start() throws Exception {
        client = new MqttAsyncClient("tcp://" + brokerHost + ":" + brokerPort,
            "edge-subscriber", new MemoryPersistence());
        client.setCallback(new MqttCallback() {
            @Override
            public void messageArrived(String topic, MqttMessage message) {
                try {
                    TerminalStatusDto status = mapper.readValue(
                        message.getPayload(), TerminalStatusDto.class);
                    List<AlertDto> alerts = droolsEngine.evaluate(status);
                    alerts.forEach(alertHandler);
                } catch (Exception e) {
                    log.error("Message processing error: {}", e.getMessage());
                }
            }
            @Override public void disconnected(MqttDisconnectResponse r) { log.warn("Disconnected: {}", r); }
            @Override public void mqttErrorOccurred(MqttException e) { log.error("MQTT error", e); }
            @Override public void deliveryComplete(IMqttToken t) {}
            @Override public void connectComplete(boolean r, String s) {}
            @Override public void authPacketArrived(int r, MqttProperties p) {}
        });
        MqttConnectionOptions opts = new MqttConnectionOptions();
        opts.setCleanStart(true);
        client.connect(opts).waitForCompletion(5000);
        client.subscribe("terminal/+/status", 1).waitForCompletion(3000);
        log.info("Edge MQTT subscriber started, listening on terminal/+/status");
    }

    public void stop() throws Exception {
        if (client != null && client.isConnected()) {
            client.disconnect().waitForCompletion(3000);
        }
    }
}
```

- [ ] **Step 4: 实现 MqttPublisher**

```java
// edge-service/src/main/java/com/yunbd/edge/mqtt/MqttPublisher.java
package com.yunbd.edge.mqtt;

import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.mqttv5.client.*;
import org.eclipse.paho.mqttv5.client.persist.MemoryPersistence;
import org.eclipse.paho.mqttv5.common.MqttMessage;

@Slf4j
public class MqttPublisher {
    private final String brokerHost;
    private final int brokerPort;
    private MqttAsyncClient client;

    public MqttPublisher(String brokerHost, int brokerPort) {
        this.brokerHost = brokerHost;
        this.brokerPort = brokerPort;
    }

    public void connect() throws Exception {
        client = new MqttAsyncClient("tcp://" + brokerHost + ":" + brokerPort,
            "edge-publisher-" + System.currentTimeMillis(), new MemoryPersistence());
        MqttConnectionOptions opts = new MqttConnectionOptions();
        opts.setCleanStart(true);
        client.connect(opts).waitForCompletion(5000);
    }

    public void publish(String topic, String payload) throws Exception {
        MqttMessage msg = new MqttMessage(payload.getBytes());
        msg.setQos(1);
        client.publish(topic, msg).waitForCompletion(3000);
    }

    public void disconnect() throws Exception {
        if (client != null && client.isConnected()) {
            client.disconnect().waitForCompletion(3000);
        }
    }
}
```

- [ ] **Step 5: 运行集成测试确认通过**

```bash
mvn test -pl edge-service -Dtest=MqttSubscriberIntegrationTest
```

Expected: PASS（1 test）

- [ ] **Step 6: 提交**

```bash
git add edge-service/
git commit -m "feat: implement edge MQTT subscriber with Drools alert pipeline"
```

---

## Chunk 4: 云端微服务 — 支付服务（核心路径）

### Task 7: payment-service 支付验证核心逻辑

**Files:**
- Create: `payment-service/pom.xml`
- Create: `payment-service/src/main/java/com/yunbd/payment/service/PaymentVerifyService.java`
- Create: `payment-service/src/main/java/com/yunbd/payment/service/IdempotencyService.java`
- Create: `payment-service/src/test/java/com/yunbd/payment/service/PaymentVerifyServiceTest.java`

- [ ] **Step 1: 编写支付验证单元测试（先失败）**

```java
// payment-service/src/test/java/com/yunbd/payment/service/PaymentVerifyServiceTest.java
package com.yunbd.payment.service;

import com.yunbd.common.dto.PaymentRequestDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.concurrent.CompletableFuture;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentVerifyServiceTest {

    @Mock
    InsuranceClient insuranceClient;

    @Mock
    RiskCheckService riskCheckService;

    @Mock
    IdempotencyService idempotencyService;

    @InjectMocks
    PaymentVerifyService verifyService;

    @Test
    void verify_normalPayment_shouldSucceedWithin1Second() throws Exception {
        PaymentRequestDto req = new PaymentRequestDto();
        req.setPayId("PAY-001");
        req.setTerminalId("T001");
        req.setPatientId("P12345");
        req.setAmount(new BigDecimal("150.00"));
        req.setMethod("insurance");

        when(idempotencyService.isDuplicate("PAY-001")).thenReturn(false);
        when(insuranceClient.verifyAsync("P12345"))
            .thenReturn(CompletableFuture.supplyAsync(() -> {
                try { Thread.sleep(200); } catch (Exception e) {}
                return true;
            }));
        when(riskCheckService.checkAsync(any()))
            .thenReturn(CompletableFuture.supplyAsync(() -> {
                try { Thread.sleep(100); } catch (Exception e) {}
                return true;
            }));

        long start = System.currentTimeMillis();
        PaymentVerifyService.VerifyResult result = verifyService.verify(req);
        long elapsed = System.currentTimeMillis() - start;

        assertThat(result.isSuccess()).isTrue();
        assertThat(elapsed).isLessThan(1000L);
    }

    @Test
    void verify_duplicatePayId_shouldReturnCachedResult() {
        PaymentRequestDto req = new PaymentRequestDto();
        req.setPayId("PAY-DUP");
        req.setPatientId("P99999");
        req.setAmount(new BigDecimal("50.00"));
        req.setMethod("self_pay");

        when(idempotencyService.isDuplicate("PAY-DUP")).thenReturn(true);
        when(idempotencyService.getCachedResult("PAY-DUP"))
            .thenReturn(new PaymentVerifyService.VerifyResult(true, "cached"));

        PaymentVerifyService.VerifyResult result = verifyService.verify(req);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getReason()).isEqualTo("cached");
        verify(insuranceClient, never()).verifyAsync(any());
    }

    @Test
    void verify_insuranceTimeout_shouldFallbackToSelfPay() {
        PaymentRequestDto req = new PaymentRequestDto();
        req.setPayId("PAY-002");
        req.setPatientId("P22222");
        req.setAmount(new BigDecimal("200.00"));
        req.setMethod("insurance");

        when(idempotencyService.isDuplicate("PAY-002")).thenReturn(false);
        when(insuranceClient.verifyAsync("P22222"))
            .thenReturn(CompletableFuture.supplyAsync(() -> {
                try { Thread.sleep(500); } catch (Exception e) {} // 超时
                return false;
            }));
        when(riskCheckService.checkAsync(any()))
            .thenReturn(CompletableFuture.completedFuture(true));

        PaymentVerifyService.VerifyResult result = verifyService.verify(req);

        assertThat(result.isFallbackToSelfPay()).isTrue();
    }
}
```

- [ ] **Step 2: 运行确认失败**

```bash
mvn test -pl payment-service -Dtest=PaymentVerifyServiceTest
```

Expected: FAIL

- [ ] **Step 3: 实现 PaymentVerifyService**

```java
// payment-service/src/main/java/com/yunbd/payment/service/PaymentVerifyService.java
package com.yunbd.payment.service;

import com.yunbd.common.dto.PaymentRequestDto;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.concurrent.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentVerifyService {
    private static final long INSURANCE_TIMEOUT_MS = 400;
    private final InsuranceClient insuranceClient;
    private final RiskCheckService riskCheckService;
    private final IdempotencyService idempotencyService;

    public VerifyResult verify(PaymentRequestDto req) {
        // 幂等检查
        if (idempotencyService.isDuplicate(req.getPayId())) {
            return idempotencyService.getCachedResult(req.getPayId());
        }

        try {
            // 并行执行三路验证
            CompletableFuture<Boolean> insuranceFuture = "insurance".equals(req.getMethod())
                ? insuranceClient.verifyAsync(req.getPatientId())
                    .orTimeout(INSURANCE_TIMEOUT_MS, TimeUnit.MILLISECONDS)
                    .exceptionally(e -> { log.warn("Insurance timeout, fallback"); return null; })
                : CompletableFuture.completedFuture(true);

            CompletableFuture<Boolean> riskFuture = riskCheckService.checkAsync(req);

            // 等待两路完成（支付渠道预授权在 riskFuture 内模拟）
            Boolean insuranceOk = insuranceFuture.get(500, TimeUnit.MILLISECONDS);
            Boolean riskOk = riskFuture.get(200, TimeUnit.MILLISECONDS);

            boolean fallback = (insuranceOk == null);
            boolean success = (fallback || Boolean.TRUE.equals(insuranceOk))
                && Boolean.TRUE.equals(riskOk);

            VerifyResult result = new VerifyResult(success,
                fallback ? "insurance_unavailable_self_pay_fallback" : "ok");
            result.setFallbackToSelfPay(fallback);
            idempotencyService.cacheResult(req.getPayId(), result);
            return result;
        } catch (Exception e) {
            log.error("Payment verify error: {}", e.getMessage());
            return new VerifyResult(false, "system_error");
        }
    }

    @Data
    public static class VerifyResult {
        private final boolean success;
        private final String reason;
        private boolean fallbackToSelfPay;

        public VerifyResult(boolean success, String reason) {
            this.success = success;
            this.reason = reason;
        }
    }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
mvn test -pl payment-service -Dtest=PaymentVerifyServiceTest
```

Expected: PASS（3 tests）

- [ ] **Step 5: 实现 PaymentController（REST API）**

```java
// payment-service/src/main/java/com/yunbd/payment/api/PaymentController.java
package com.yunbd.payment.api;

import com.yunbd.common.dto.PaymentRequestDto;
import com.yunbd.payment.service.PaymentVerifyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payment")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentVerifyService verifyService;

    @PostMapping("/verify")
    public ResponseEntity<PaymentVerifyService.VerifyResult> verify(
            @RequestBody PaymentRequestDto req) {
        return ResponseEntity.ok(verifyService.verify(req));
    }
}
```

- [ ] **Step 6: 提交**

```bash
git add payment-service/
git commit -m "feat: implement payment verification service with parallel async verify and idempotency"
```

---

### Task 8: Spring Cloud Gateway 路由配置

**Files:**
- Create: `cloud-gateway/pom.xml`
- Create: `cloud-gateway/src/main/resources/application.yml`
- Create: `cloud-gateway/src/main/java/com/yunbd/gateway/GatewayApplication.java`
- Create: `cloud-gateway/src/test/java/com/yunbd/gateway/GatewayRouteTest.java`

- [ ] **Step 1: Gateway 路由测试**

```java
// cloud-gateway/src/test/java/com/yunbd/gateway/GatewayRouteTest.java
package com.yunbd.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.gateway.route.RouteLocator;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest
class GatewayRouteTest {
    @Autowired
    RouteLocator routeLocator;

    @Test
    void routeLocator_shouldHavePaymentRoute() {
        boolean hasPayment = routeLocator.getRoutes()
            .any(r -> r.getId().equals("payment-service"))
            .block();
        assertThat(hasPayment).isTrue();
    }
}
```

- [ ] **Step 2: 实现 Gateway 配置**

```yaml
# cloud-gateway/src/main/resources/application.yml
server:
  port: 8080

spring:
  application:
    name: cloud-gateway
  cloud:
    gateway:
      routes:
        - id: payment-service
          uri: http://payment-service:8081
          predicates:
            - Path=/api/v1/payment/**
          filters:
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 100
                redis-rate-limiter.burstCapacity: 200
        - id: registration-service
          uri: http://registration-service:8082
          predicates:
            - Path=/api/v1/registration/**
        - id: report-service
          uri: http://report-service:8083
          predicates:
            - Path=/api/v1/report/**
        - id: queue-service
          uri: http://queue-service:8084
          predicates:
            - Path=/api/v1/queue/**
        - id: insurance-service
          uri: http://insurance-service:8085
          predicates:
            - Path=/api/v1/insurance/**
      default-filters:
        - name: CircuitBreaker
          args:
            name: defaultCB
            fallbackUri: forward:/fallback
  redis:
    host: ${REDIS_HOST:redis}
    port: 6379
    password: ${REDIS_PASSWORD:yunbd_redis_2026}
```

- [ ] **Step 3: 提交**

```bash
git add cloud-gateway/
git commit -m "feat: configure spring cloud gateway routes with rate limiting and circuit breaker"
```

---

## Chunk 5: 其余云端微服务（挂号/报告/叫号/医保）

### Task 9: 四个业务微服务骨架（并行结构相同）

**Files:**
- Create: `registration-service/`, `report-service/`, `queue-service/`, `insurance-service/` 各自的 Application.java 和 Controller.java

- [ ] **Step 1: 挂号服务核心测试与实现**

```java
// registration-service/src/test/java/com/yunbd/registration/RegistrationControllerTest.java
@SpringBootTest
@AutoConfigureMockMvc
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
```

- [ ] **Step 2: 挂号服务实现**

```java
// registration-service/src/main/java/com/yunbd/registration/RegistrationController.java
@RestController
@RequestMapping("/api/v1/registration")
public class RegistrationController {
    @PostMapping
    public ResponseEntity<Map<String,String>> register(@RequestBody Map<String,String> req) {
        String regId = "REG-" + System.currentTimeMillis();
        return ResponseEntity.ok(Map.of("registrationId", regId,
            "patientId", req.get("patientId"), "status", "confirmed"));
    }
}
```

- [ ] **Step 3: 叫号服务核心测试与实现**

```java
// queue-service/src/test/java/com/yunbd/queue/QueueControllerTest.java
@Test
void getQueueStatus_shouldReturnDepthAndWait() throws Exception {
    mvc.perform(get("/api/v1/queue/NEU"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.depth").isNumber())
        .andExpect(jsonPath("$.avgWaitMs").isNumber());
}
```

```java
// queue-service/src/main/java/com/yunbd/queue/QueueController.java
@GetMapping("/{deptCode}")
public ResponseEntity<Map<String,Object>> getQueue(@PathVariable String deptCode) {
    // 从 Redis 读取实时队列数据（边缘层上报）
    return ResponseEntity.ok(Map.of("deptCode", deptCode,
        "depth", 8, "avgWaitMs", 45000L));
}
```

- [ ] **Step 4: 报告服务与医保结算服务（同结构）**

参照挂号服务结构，各自实现 GET/POST 端点，有 Spring Boot Test 覆盖主路径。

- [ ] **Step 5: 所有服务编译通过**

```bash
mvn clean compile -pl registration-service,report-service,queue-service,insurance-service
```

Expected: BUILD SUCCESS（4 modules）

- [ ] **Step 6: 所有服务测试通过**

```bash
mvn test -pl registration-service,report-service,queue-service,insurance-service
```

Expected: All PASS

- [ ] **Step 7: 提交**

```bash
git add registration-service/ report-service/ queue-service/ insurance-service/
git commit -m "feat: implement registration/report/queue/insurance service stubs with tests"
```

---

### Task 10: K8s 微服务部署清单

**Files:**
- Create: `infra/cloud-services/payment-deployment.yaml`
- Create: `infra/cloud-services/gateway-deployment.yaml`

- [ ] **Step 1: 支付服务 Deployment**

```yaml
# infra/cloud-services/payment-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: yunbianduan-cloud
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
      - name: payment-service
        image: yunbd/payment-service:latest
        ports:
        - containerPort: 8081
        env:
        - name: SPRING_DATASOURCE_URL
          value: jdbc:mysql://mysql:3306/yunbianduan
        - name: SPRING_DATASOURCE_PASSWORD
          value: yunbd_root_2026
        - name: SPRING_REDIS_HOST
          value: redis
        - name: SPRING_REDIS_PASSWORD
          value: yunbd_redis_2026
        readinessProbe:
          httpGet:
            path: /actuator/health
            port: 8081
          initialDelaySeconds: 20
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: yunbianduan-cloud
spec:
  selector:
    app: payment-service
  ports:
  - port: 8081
    targetPort: 8081
```

- [ ] **Step 2: 提交**

```bash
git add infra/cloud-services/
git commit -m "feat: add k8s deployment manifests for cloud microservices"
```

---

## Chunk 6: Flink 异常检测作业

### Task 11: Flink 事务成功率检测作业

**Files:**
- Create: `flink-jobs/pom.xml`
- Create: `flink-jobs/src/main/java/com/yunbd/flink/job/TransactionSuccessRateJob.java`
- Create: `flink-jobs/src/test/java/com/yunbd/flink/job/TransactionSuccessRateJobTest.java`
- Create: `infra/flink/flink-deployment.yaml`

- [ ] **Step 1: Flink 作业单元测试**

```java
// flink-jobs/src/test/java/com/yunbd/flink/job/TransactionSuccessRateJobTest.java
package com.yunbd.flink.job;

import com.yunbd.common.dto.TerminalEventDto;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.source.SourceFunction;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import static org.assertj.core.api.Assertions.*;

class TransactionSuccessRateJobTest {

    @Test
    void detectLowSuccessRate_shouldTriggerAlert() throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.createLocalEnvironment();
        List<String> capturedAlerts = new CopyOnWriteArrayList<>();

        TransactionSuccessRateJob job = new TransactionSuccessRateJob(env);
        // 注入10个事件，8个失败（成功率20% < 阈值80%）
        job.runWithTestData(buildLowSuccessRateEvents(), capturedAlerts::add);

        env.execute("test");

        assertThat(capturedAlerts).isNotEmpty();
        assertThat(capturedAlerts.get(0)).contains("success_rate_low");
    }

    private List<TerminalEventDto> buildLowSuccessRateEvents() {
        // 2 success, 8 failure in 1 min window
        return List.of(/* ... */);
    }
}
```

- [ ] **Step 2: 运行确认失败**

```bash
mvn test -pl flink-jobs -Dtest=TransactionSuccessRateJobTest
```

Expected: FAIL

- [ ] **Step 3: 实现 Flink 作业**

```java
// flink-jobs/src/main/java/com/yunbd/flink/job/TransactionSuccessRateJob.java
package com.yunbd.flink.job;

import com.yunbd.common.dto.TerminalEventDto;
import lombok.extern.slf4j.Slf4j;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.windowing.assigners.SlidingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;
import java.util.function.Consumer;

@Slf4j
public class TransactionSuccessRateJob {
    private static final double SUCCESS_RATE_THRESHOLD = 0.80;
    private final StreamExecutionEnvironment env;

    public TransactionSuccessRateJob(StreamExecutionEnvironment env) {
        this.env = env;
    }

    public void runWithTestData(java.util.List<TerminalEventDto> events,
                                Consumer<String> alertSink) {
        DataStream<TerminalEventDto> stream = env.fromCollection(events)
            .assignTimestampsAndWatermarks(
                WatermarkStrategy.<TerminalEventDto>forMonotonousTimestamps()
                    .withTimestampAssigner((e, t) -> e.getTimestamp()));

        stream.keyBy(TerminalEventDto::getTerminalId)
            .window(SlidingEventTimeWindows.of(Time.minutes(1), Time.seconds(30)))
            .process(new SuccessRateProcessFunction(SUCCESS_RATE_THRESHOLD))
            .addSink(alert -> {
                log.warn("ALERT: {}", alert);
                alertSink.accept(alert);
            });
    }
}
```

- [ ] **Step 4: Flink K8s 部署清单**

```yaml
# infra/flink/flink-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flink-jobmanager
  namespace: yunbianduan-cloud
spec:
  replicas: 1
  selector:
    matchLabels:
      app: flink-jobmanager
  template:
    metadata:
      labels:
        app: flink-jobmanager
    spec:
      containers:
      - name: jobmanager
        image: flink:1.18-scala_2.12
        args: ["jobmanager"]
        env:
        - name: FLINK_PROPERTIES
          value: |
            jobmanager.rpc.address: flink-jobmanager
            state.backend: rocksdb
            state.checkpoints.dir: file:///flink-checkpoints
            execution.checkpointing.interval: 30000
        ports:
        - containerPort: 6123
        - containerPort: 8081
        resources:
          requests:
            cpu: "2"
            memory: "4Gi"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flink-taskmanager
  namespace: yunbianduan-cloud
spec:
  replicas: 2
  selector:
    matchLabels:
      app: flink-taskmanager
  template:
    spec:
      containers:
      - name: taskmanager
        image: flink:1.18-scala_2.12
        args: ["taskmanager"]
        env:
        - name: FLINK_PROPERTIES
          value: |
            jobmanager.rpc.address: flink-jobmanager
            taskmanager.numberOfTaskSlots: 4
        resources:
          requests:
            cpu: "2"
            memory: "4Gi"
```

- [ ] **Step 5: 运行测试通过**

```bash
mvn test -pl flink-jobs
```

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add flink-jobs/ infra/flink/
git commit -m "feat: implement Flink anomaly detection job with 1min sliding window"
```

---

## Chunk 7: 延迟仿真与端到端验收测试

### Task 12: tc netem 延迟注入脚本

**Files:**
- Create: `simulation/inject-delay.sh`
- Create: `simulation/remove-delay.sh`

- [ ] **Step 1: 创建延迟注入脚本**

```bash
#!/bin/bash
# simulation/inject-delay.sh
# 用法: ./inject-delay.sh <edge-pod-name> <namespace>
# 在 edge Pod 的两个网络接口注入延迟

EDGE_POD=${1:-$(kubectl get pod -n yunbianduan-edge -l app=edge-service -o jsonpath='{.items[0].metadata.name}')}
NAMESPACE=${2:-yunbianduan-edge}

echo "注入延迟到 Pod: $EDGE_POD (namespace: $NAMESPACE)"

# eth0: 模拟边缘→云端 WAN 链路，20ms 延迟 + 2ms 抖动
kubectl exec -n $NAMESPACE $EDGE_POD -- \
    tc qdisc add dev eth0 root netem delay 20ms 2ms distribution normal
echo "✅ eth0 (WAN): 20ms ± 2ms"

# eth1: 模拟终端→边缘局域网，5ms 延迟 + 1ms 抖动（如有 eth1）
kubectl exec -n $NAMESPACE $EDGE_POD -- \
    tc qdisc add dev eth1 root netem delay 5ms 1ms distribution normal 2>/dev/null \
    || echo "ℹ️  eth1 不存在，跳过局域网延迟（使用 loopback 模拟时可忽略）"

echo "延迟注入完成。验证:"
kubectl exec -n $NAMESPACE $EDGE_POD -- tc qdisc show
```

```bash
#!/bin/bash
# simulation/remove-delay.sh
EDGE_POD=${1:-$(kubectl get pod -n yunbianduan-edge -l app=edge-service -o jsonpath='{.items[0].metadata.name}')}
NAMESPACE=${2:-yunbianduan-edge}

kubectl exec -n $NAMESPACE $EDGE_POD -- tc qdisc del dev eth0 root 2>/dev/null && echo "eth0 延迟已移除"
kubectl exec -n $NAMESPACE $EDGE_POD -- tc qdisc del dev eth1 root 2>/dev/null && echo "eth1 延迟已移除"
echo "延迟清除完成"
```

- [ ] **Step 2: 赋予可执行权限并提交**

```bash
chmod +x simulation/inject-delay.sh simulation/remove-delay.sh
git add simulation/
git commit -m "feat: add tc netem delay injection scripts for 50ms simulation"
```

---

### Task 13: 监控栈部署（Prometheus + Grafana + Jaeger）

**Files:**
- Create: `infra/monitoring/prometheus.yaml`
- Create: `infra/monitoring/grafana.yaml`
- Create: `infra/monitoring/jaeger.yaml`

- [ ] **Step 1: 部署 Prometheus**

```yaml
# infra/monitoring/prometheus.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:v2.50.0
        args:
          - "--config.file=/etc/prometheus/prometheus.yml"
          - "--storage.tsdb.retention.time=7d"
        ports:
        - containerPort: 9090
---
apiVersion: v1
kind: Service
metadata:
  name: prometheus
  namespace: monitoring
spec:
  type: NodePort
  selector:
    app: prometheus
  ports:
  - port: 9090
    nodePort: 30090
```

- [ ] **Step 2: 部署 Grafana 和 Jaeger**

```bash
kubectl apply -f infra/monitoring/prometheus.yaml
kubectl apply -f infra/monitoring/grafana.yaml
kubectl apply -f infra/monitoring/jaeger.yaml
kubectl get pods -n monitoring
```

Expected: prometheus, grafana, jaeger Pod 全部 Running

- [ ] **Step 3: 提交**

```bash
git add infra/monitoring/
git commit -m "feat: deploy prometheus/grafana/jaeger monitoring stack"
```

---

### Task 14: 端到端验收测试

**Files:**
- Create: `test-data/anomaly-samples.json`
- Create: `docs/baseline/T0-measurement.md`

- [ ] **Step 1: 验证 <50ms 延迟（注入延迟后）**

```bash
# 1. 注入延迟
./simulation/inject-delay.sh

# 2. 启动 20 台终端仿真器（sim namespace）
kubectl apply -f infra/sim/terminal-simulator-deployment.yaml
kubectl scale deployment terminal-simulator -n yunbianduan-sim --replicas=20

# 3. 等待 2 分钟，然后在 Grafana 查看 Jaeger 指标
# Prometheus 查询：histogram_quantile(0.95, rate(edge_cloud_latency_ms_bucket[5m]))
# 期望值: < 50ms
echo "在 Grafana (http://localhost:30030) 查看 P95 延迟面板"
```

- [ ] **Step 2: 验证支付验证 <1s**

```bash
# JMeter 压测（100并发，持续5分钟）
# 下载并运行 JMeter：
# jmeter -n -t test-plans/payment-load-test.jmx \
#   -Jhost=<gateway-ip> -Jport=8080 -Jthreads=100 -Jduration=300 \
#   -l results/payment-results.jtl -e -o results/payment-report/
#
# 验收标准: P99 < 1000ms
# 在 results/payment-report/index.html 查看报告
echo "检查 P99 响应时间 < 1000ms"
```

- [ ] **Step 3: 验证异常检测 F1 ≥ 0.98**

```bash
# 回放 1000 条标注异常样本
# test-data/anomaly-samples.json 包含标注的正常/异常状态消息
# 运行回放脚本：
# mvn exec:java -pl simulator -Dexec.mainClass=com.yunbd.sim.AnomalyReplayRunner \
#   -Dexec.args="test-data/anomaly-samples.json"
#
# 从 MySQL alert_record 表统计 TP/FP/FN：
# SELECT
#   SUM(CASE WHEN actual=1 AND predicted=1 THEN 1 ELSE 0 END) as TP,
#   SUM(CASE WHEN actual=0 AND predicted=1 THEN 1 ELSE 0 END) as FP,
#   SUM(CASE WHEN actual=1 AND predicted=0 THEN 1 ELSE 0 END) as FN
# FROM anomaly_eval_result;
# 计算 F1 = 2*TP / (2*TP + FP + FN)，要求 >= 0.98，FP Rate < 2%
echo "计算 F1 Score，期望 >= 0.98"
```

- [ ] **Step 4: 验证异常响应 <5s**

```bash
# 手动注入故障事件（打印机故障），观察告警到达时间
# kubectl exec -n yunbianduan-edge <mosquitto-pod> -- \
#   mosquitto_pub -h localhost -t "terminal/T001/status" \
#   -m '{"terminalId":"T001","timestamp":...,"status":"online","hardware":{"printer":"paper_jam",...},...}'
#
# 在 AlertManager 观察告警触发时间
# 期望: 从发布到告警出现 < 5 秒（P0 Drools 路径）
echo "验证 P0 告警响应时间 < 5s"
```

- [ ] **Step 5: 记录 T0 基准数据**

```markdown
<!-- docs/baseline/T0-measurement.md -->
# T0 基准测量记录

测量日期: 2026-03-12
测量协议: 标准化场景脚本（挂号/支付/报告各 200 次，取 3 次均值）

## 结果

| 指标 | T0 基准值 | 优化目标 |
|------|-----------|----------|
| 平均操作步骤数 | TBD（系统上线后填写） | ≤ 4 步 |
| 平均业务完成时长 | TBD | ≤ 120s |
| 平均等待时长 | TBD | ≤ 90s |
| 满意度评分 | TBD | ≥ 4.0/5.0 |
```

- [ ] **Step 6: 最终提交**

```bash
git add test-data/ docs/baseline/ simulation/
git commit -m "feat: add anomaly test data, baseline measurement template, verification scripts"
```

---

## 验收清单

完成所有 Chunk 后逐项核查：

- [ ] `mvn clean test` 全模块通过
- [ ] K8s 所有 Pod Running（`kubectl get pods -A`）
- [ ] Jaeger P95 延迟 < 50ms（注入 tc netem 后）
- [ ] JMeter 支付 P99 < 1000ms
- [ ] 异常检测 F1 ≥ 0.98，FP Rate < 2%
- [ ] P0 告警从注入到显示 < 5s
- [ ] Grafana 监控面板正常展示
- [ ] 断网续传测试（断开 edge-cloud 连接，重连后消息正常同步）
- [ ] 医保 API 超时降级测试（注入 500ms 延迟到 insurance-service）
