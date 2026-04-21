# Technology Stack

**Analysis Date:** 2026-04-21

## Languages

**Primary:**
- Java 17 - Backend microservices (Spring Boot)
- Node.js 20 - Frontend build tooling

**Secondary:**
- JavaScript/TypeScript - Frontend (Vue 3)
- Python - Simulation/analysis scripts

## Runtime

**Java Runtime:**
- Eclipse Temurin 21 (JRE Alpine) - Production containers
- Java 17 - Development/build

**Node Runtime:**
- Node 20 Alpine - Frontend build (npm ci)
- npm - Package management

## Frameworks

**Backend (Spring Boot):**
- Spring Boot 3.2.3 - Core framework for all microservices
- Spring Cloud 2023.0.0 - Gateway and microservices infrastructure
- Spring Web - REST API endpoints
- Spring Data JPA - Database ORM (registration, insurance, queue, report)
- Spring Data Redis - Redis caching/sessions
- Spring Kafka - Message queue integration
- Spring Cloud Gateway - API routing and rate limiting

**Frontend:**
- Vue 3.4.0 - UI framework
- Vue Router 4.3.0 - Client-side routing
- Pinia 2.1.7 - State management
- Element Plus 2.7.0 - UI component library
- ECharts 5.5.0 - Data visualization
- vue-echarts 7.0.0 - Vue bindings for ECharts
- Axios 1.7.0 - HTTP client

**Rule Engine:**
- Drools 8.41.0.Final - Business rule processing in edge-service

**Build Tools:**
- Maven 3.x - Java build and dependency management
- Vite 5.2.0 - Frontend build tool
- Maven Shade Plugin - Flink job packaging

## Key Dependencies

**Java Dependencies:**

| Dependency | Version | Service | Purpose |
|------------|---------|---------|---------|
| spring-boot-starter-web | 3.2.3 | All services | REST API |
| spring-boot-starter-data-redis | 3.2.3 | gateway, edge, payment, queue | Caching |
| spring-boot-starter-data-jpa | 3.2.3 | registration, insurance, queue, report | ORM |
| mysql-connector-j | (Spring BOM) | registration, insurance, queue, report | MySQL driver |
| spring-kafka | (Spring Kafka BOM) | All services | Message queue |
| spring-cloud-starter-gateway | 2023.0.0 | cloud-gateway | API gateway |
| resilience4j | 2.x | cloud-gateway, payment | Circuit breaker |
| org.eclipse.paho.client.mqttv3 | 1.2.5 | edge-service, simulator-service | MQTT client |
| drools-core, drools-compiler | 8.41.0.Final | edge-service | Rule engine |
| grpc-netty-shaded, grpc-protobuf | 1.62.2 | edge-service | gRPC communication |
| protobuf-java | 3.25.3 | edge-service | Protocol buffers |
| kubernetes-client | 18.0.0 | edge-service | K8s API client |
| flink-streaming-java | 1.18.1 | flink-jobs | Stream processing |
| flink-connector-kafka | 3.1.0-1.18 | flink-jobs | Kafka connector |
| lombok | 1.18.40 | All services | Code generation |
| testcontainers | 1.19.6 | All services | Integration testing |

**Frontend Dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| vue | 3.4.0 | UI framework |
| vue-router | 4.3.0 | Routing |
| pinia | 2.1.7 | State management |
| element-plus | 2.7.0 | UI components |
| echarts | 5.5.0 | Charts |
| vue-echarts | 7.0.0 | Vue ECharts bindings |
| axios | 1.7.0 | HTTP client |
| @element-plus/icons-vue | 2.3.1 | Element Plus icons |
| vite | 5.2.0 | Build tool |
| vitest | 1.6.0 | Testing |
| @vue/test-utils | 2.4.0 | Vue test utilities |

## Configuration

**Build Configuration:**
- Root `pom.xml` - Maven multi-module project with Spring Boot plugin
- Module build order: common, simulator, simulator-service, edge-service, cloud-gateway, payment-service, registration-service, report-service, queue-service, insurance-service, flink-jobs

**Environment Configuration:**
- `docker-compose.yml` - Local development with all services
- Kubernetes manifests in `infra/k8s/` and `infra/cloud-services/`
- Frontend environment via `.env` files (VITE_ prefixed)

**Key Environment Variables:**

| Variable | Used By | Description |
|----------|---------|-------------|
| REDIS_HOST | gateway, edge, payment, queue, simulator | Redis server hostname |
| REDIS_PASSWORD | gateway, edge, payment, queue, simulator | Redis auth password |
| MQTT_HOST | edge, simulator | Mosquitto MQTT broker |
| MQTT_PORT | edge, simulator | MQTT broker port (1883) |
| KAFKA_BOOTSTRAP_SERVERS | payment, registration, insurance, queue, report | Kafka brokers |
| DB_URL | registration, insurance, queue, report | MySQL connection URL |
| DB_USER | registration, insurance, queue, report | MySQL username |
| DB_PASSWORD | registration, insurance, queue, report | MySQL password |
| HMAC_SECRET | edge | Terminal authentication secret |
| INSURANCE_SERVICE_URL | payment | Insurance service endpoint |

## Platform Requirements

**Development:**
- Java 17+
- Maven 3.x
- Node.js 20+
- Docker and Docker Compose

**Production:**
- Docker containers (Alpine-based Java 21 images)
- Kubernetes cluster (for cloud deployment)
- MySQL 8.0+ (for persistence)
- Redis 7+ (for caching)
- Kafka 3.6+ (optional, with profile "full")
- Mosquitto 2.0+ (MQTT broker)

## Service Architecture

**Microservices (Java/Spring Boot):**

| Service | Port | Database | Dependencies |
|---------|------|----------|--------------|
| cloud-gateway | 8080 | Redis | payment, registration, report, queue, insurance, edge |
| edge-service | 8090 | Redis | mosquitto, redis |
| simulator-service | 8095 | Redis | mosquitto, redis |
| payment-service | 8081 | Redis | kafka, insurance-service |
| registration-service | 8082 | MySQL | kafka, redis |
| report-service | 8083 | MySQL | kafka |
| queue-service | 8084 | MySQL | kafka, redis |
| insurance-service | 8085 | MySQL | kafka |
| flink-jobs | N/A | N/A | Kafka (streaming) |

**Frontend (Vue 3):**
- Port 3000 (development via Vite)
- Production served via Nginx Alpine

---

*Stack analysis: 2026-04-21*
