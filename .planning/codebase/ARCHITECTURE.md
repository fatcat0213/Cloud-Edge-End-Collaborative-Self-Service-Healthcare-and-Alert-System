# Architecture

**Analysis Date:** 2026-04-21

## Pattern Overview

**Overall:** Microservices architecture with cloud-edge hybrid topology

**Key Characteristics:**
- Spring Boot 3.2.3 microservices deployed as Docker containers
- MQTT-based pub/sub communication between edge and cloud
- REST API gateway routing all external traffic
- Redis for shared state (alerts, rate limiting, caching)
- Drools rule engine for edge-side alert generation
- KubeEdge integration for edge node management

## Service Decomposition

### Infrastructure Layer

| Service | Port | Purpose | Dependencies |
|---------|------|---------|--------------|
| `mosquitto` | 1883 | MQTT message broker for terminal-to-edge communication | None |
| `redis` | 6379 | Shared state store, rate limiting, alert persistence | None |
| `kafka` | 9092 | Async messaging (optional, profile: full) | None |

### Business Microservices

| Service | Port | Purpose | Data Store |
|---------|------|---------|------------|
| `cloud-gateway` | 8080 | API gateway, routing, rate limiting | Redis |
| `edge-service` | 8090 | Edge computing, Drools rules, alert management | Redis |
| `payment-service` | 8081 | Payment processing, idempotency, risk checks | Redis, Kafka, Insurance |
| `registration-service` | 8082 | Patient registration workflow | MySQL, Redis |
| `queue-service` | 8084 | Queue management | None |
| `insurance-service` | 8085 | Insurance verification | None |
| `report-service` | 8083 | Report generation | None |
| `simulator-service` | 8095 | Terminal/event simulator for testing | MQTT, Redis |

### Frontend

| Service | Port | Purpose |
|---------|------|---------|
| `frontend` | 3000 | Vue 3 SPA dashboard |

## Communication Patterns

### Edge-to-Cloud (MQTT)

```
Terminals --> [MQTT:1883] --> edge-service --> [MQTT] --> simulator-service
                                      |
                                      v
                              [Redis:6379] (alert store)
```

- **Protocol:** MQTT (org.eclipse.paho.client.mqttv3)
- **Topics:**
  - `terminal/+/status` - Terminal status events (HMAC-verified)
  - `terminal/alerts` - Direct alert messages from simulator
- **Security:** HMAC-SHA256 payload verification in `HmacUtil`
- **Location:** `D:\yunbianduan\edge-service\src\main\java\com\yunbd\edge\mqtt\MqttSubscriber.java`

### Cloud Internal (REST)

All inter-service communication within cloud uses REST over HTTP:

- `cloud-gateway` routes to all backend services based on path
- `payment-service` calls `insurance-service` via HTTP
- `frontend` calls `cloud-gateway` at `/api/v1/{service}`

### Gateway Routing Configuration

Location: `D:\yunbianduan\cloud-gateway\src\main\resources\application.yml`

```
/simulator/**              --> simulator-service:8095
/api/v1/simulator/**        --> simulator-service:8095
/api/v1/payment/**          --> payment-service:8081
/api/v1/registration/**    --> registration-service:8082
/api/v1/report/**          --> report-service:8083
/api/v1/queue/**           --> queue-service:8084
/api/v1/insurance/**       --> insurance-service:8085
/api/v1/alerts/**          --> edge-service:8090
/api/v1/commands/**        --> edge-service:8090
/api/v1/stats/**           --> edge-service:8090
```

## Data Flow

### Alert Flow (Terminal -> Cloud Dashboard)

1. **Terminal/Simulator** publishes status to MQTT topic `terminal/{id}/status`
2. **edge-service** MqttSubscriber receives message
3. **HmacUtil.verify()** validates payload integrity
4. **DroolsEngine.evaluate()** runs Drools rules from `TerminalRules.drl`
5. Generated **AlertDto** objects stored in Redis via `AlertStore`
6. **AlertController** serves alerts via REST API
7. **frontend** polls/retrieves alerts via `getEdgeAlerts()` in `api/index.js`

### Business Transaction Flow (Payment)

1. **frontend** calls `/api/v1/payment` via gateway
2. **payment-service** validates idempotency via Redis
3. **payment-service** calls **insurance-service** for verification
4. **payment-service** publishes to Kafka (optional profile)
5. Response returned to frontend

## Cloud vs Edge Topology

### Edge Layer (`edge-service`)
- **Location:** Deployed near terminals (local network or KubeEdge node)
- **Responsibilities:**
  - MQTT message consumption
  - Drools rule execution for alert generation
  - Terminal status HMAC verification
  - Local alert storage in Redis
  - KubeEdge node client integration
- **Key Files:**
  - `D:\yunbianduan\edge-service\src\main\java\com\yunbd\edge\rules\DroolsEngine.java`
  - `D:\yunbianduan\edge-service\src\main\java\com\yunbd\edge\mqtt\MqttSubscriber.java`
  - `D:\yunbianduan\edge-service\src\main\java\com\yunbd\edge\AlertStore.java`

### Cloud Layer (All other services)
- **Location:** Central data center / cloud
- **Responsibilities:**
  - API gateway and routing
  - Business logic (payment, registration, queue, insurance)
  - Report generation
  - Simulator service
  - Dashboard frontend

## Key Abstractions

### AlertDto (Shared DTO)
- Location: `D:\yunbianduan\common\src\main\java\com\yunbd\common\dto\AlertDto.java`
- Used for alert data transfer across MQTT and REST

### TerminalStatusDto
- Location: `D:\yunbianduan\common\src\main\java\com\yunbd\common\dto\TerminalStatusDto.java`
- Carries terminal status with HMAC for integrity

### AlertStore
- Location: `D:\yunbianduan\edge-service\src\main\java\com\yunbd\edge\AlertStore.java`
- In-memory alert storage backed by Redis (ConcurrentHashMap + Redis)

### DroolsEngine
- Location: `D:\yunbianduan\edge-service\src\main\java\com\yunbd\edge\rules\DroolsEngine.java`
- Loads rules from classpath: `rules/TerminalRules.drl`

## Technology Stack

- **Runtime:** Java 17
- **Framework:** Spring Boot 3.2.3, Spring Cloud 2023.0.0
- **MQTT Client:** Eclipse Paho 1.2.5
- **Rules Engine:** Drools 8.41.0.Final
- **gRPC:** 1.62.2 (for KubeEdge communication)
- **Kubernetes Client:** io.kubernetes:client-java 18.0.0
- **Frontend:** Vue 3.4, Vite 5.2, Element Plus 2.7, Pinia 2.1

---

*Architecture analysis: 2026-04-21*
