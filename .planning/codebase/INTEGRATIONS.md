# External Integrations

**Analysis Date:** 2026-04-21

## APIs & External Services

**MQTT Broker (Eclipse Mosquitto):**
- Version: 2.0
- Purpose: IoT device communication with edge terminals
- Client: org.eclipse.paho.client.mqttv3 1.2.5
- Used by: edge-service, simulator-service
- Auth: None (local dev) / HMAC_SECRET for terminal auth
- Container: yunbd-mosquitto (port 1883)

**Kafka Message Queue:**
- Version: 3.6 (bitnami/kafka image)
- Purpose: Async event streaming between services
- Client: Spring Kafka (spring-kafka)
- Profile: "full" (not started by default in docker-compose)
- Used by: payment-service, registration-service, insurance-service, queue-service, report-service, flink-jobs

## Data Storage

**MySQL Database:**
- Driver: com.mysql:mysql-connector-j
- Used by: registration-service, insurance-service, queue-service, report-service
- Connection: ${DB_URL:jdbc:mysql://mysql:3306/yunbianduan?useSSL=false&serverTimezone=UTC}
- Default credentials: root / (empty password in docker-compose)
- JPA/Hibernate for ORM with ddl-auto: none (schema managed externally)

**Redis Cache/Session:**
- Version: 7-alpine
- Used by: cloud-gateway (rate limiting), edge-service, payment-service, queue-service, simulator-service, registration-service
- Connection: ${REDIS_HOST:redis}:${REDIS_PORT:6379}
- Password: ${REDIS_PASSWORD:} (empty in docker-compose, secrets in K8s)

**Local Filesystem (Simulation):**
- simulator-service uses local JSON file for test data
- Simulation scripts in `simulation/` directory (Python)

## Authentication & Authorization

**Terminal Authentication:**
- HMAC-based secret: HMAC_SECRET=yunbd-terminal-secret-2026
- Implemented in edge-service for command validation
- K8s secret: terminal-secret (key: hmac-secret)

**API Gateway:**
- Spring Cloud Gateway for route-based access
- Redis-backed rate limiting (spring-boot-starter-data-redis-reactive)
- Resilience4j circuit breaker for fault tolerance

**No external auth provider detected** - Custom HMAC-based terminal auth only

## Monitoring & Observability

**Spring Boot Actuator:**
- Included in cloud-gateway (spring-boot-starter-actuator)
- Health endpoints available at /actuator/health

**Testcontainers:**
- Version: 1.19.6
- Purpose: Integration testing with Docker containers

**Error Tracking:**
- Not detected (no Sentry, DataDog, or similar)

**Logging:**
- SLF4J with Logback (Spring Boot default)
- No centralized logging solution detected

## CI/CD & Deployment

**Containerization:**
- Docker and Docker Compose for local development
- Multi-stage builds for Java services (eclipse-temurin:21-jre-alpine)
- Multi-stage build for frontend (node:20-alpine + nginx:alpine)

**Kubernetes:**
- Manifests in `infra/k8s/` and `infra/cloud-services/`
- deployments, services, and secrets defined
- Namespaces: yunbianduan-cloud, yunbianduan-edge

**Image Registry:**
- Local registry: localhost:5500 (for K8s dev)
- Production images pushed to external registry (configuration not in codebase)

## Infrastructure Services

**Service Discovery:**
- Docker Compose DNS (service names resolve as hostnames)
- Kubernetes Service (ClusterIP) for in-cluster communication

**Message Queue:**
- Kafka for event streaming (profile: full)
- MQTT for IoT/device communication

**Load Balancing:**
- Spring Cloud Gateway routes to backend services
- K8s Service load balancing for pods

## Environment Configuration

**Required env vars for docker-compose:**

| Variable | Services | Description |
|----------|----------|-------------|
| REDIS_HOST | All Java services | Redis hostname |
| REDIS_PASSWORD | All Java services | Redis password |
| MQTT_HOST | edge, simulator | Mosquitto hostname |
| MQTT_PORT | edge, simulator | Mosquitto port |
| KAFKA_BOOTSTRAP_SERVERS | payment, registration, insurance, queue, report | Kafka brokers |
| DB_URL | registration, insurance, queue, report | MySQL connection URL |
| DB_USER | registration, insurance, queue, report | MySQL username |
| DB_PASSWORD | registration, insurance, queue, report | MySQL password |
| HMAC_SECRET | edge | Terminal auth secret |

**Frontend environment (VITE_ prefixed):**

| Variable | Description |
|----------|-------------|
| VITE_SIM_TARGET | Simulator API endpoint |
| VITE_EDGE_TARGET | Edge service endpoint |
| VITE_API_TARGET | Main API gateway endpoint |

## Third-Party SDKs

**Java:**
- Eclipse Paho MQTT Client 1.2.5 - MQTT protocol
- Drools 8.41.0.Final - Business rule engine
- gRPC 1.62.2 - RPC framework
- Protocol Buffers 3.25.3 - Serialization
- Kubernetes Java Client 18.0.0 - K8s API
- Flink 1.18.1 - Stream processing
- Lombok 1.18.40 - Boilerplate reduction

**JavaScript:**
- Element Plus 2.7.0 - UI component library
- ECharts 5.5.0 - Charting library
- Axios 1.7.0 - HTTP client

## Network Topology

```
Internet
    |
    v
Frontend (nginx:3000)
    |
    v
Cloud Gateway (8080) ---> Redis (6379)
    |                       |
    +-----> Payment (8081) -+
    +-----> Registration (8082) ---> MySQL
    +-----> Report (8083) --------> MySQL
    +-----> Queue (8084) ---------> MySQL + Redis
    +-----> Insurance (8085) ------> MySQL
    +-----> Edge (8090) ----------> Redis + Mosquitto (MQTT)
    +-----> Simulator (8095) ------> Redis + Mosquitto (MQTT)

IoT Terminals <----MQTT----> Mosquitto (1883)
```

---

*Integration audit: 2026-04-21*
