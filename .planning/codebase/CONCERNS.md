# Codebase Concerns

**Analysis Date:** 2026-04-21

## Security Considerations

### Hardcoded Secrets

**HMAC Secret in Source Code:**
- `docker-compose.yml`: `HMAC_SECRET: yunbd-terminal-secret-2026` (line 132)
- `D:\yunbianduan\edge-service\src\main\java\com\yunbd\edge\mqtt\MqttSubscriber.java`: Default fallback hardcoded as `"yunbd-terminal-secret-2026"`
- `D:\yunbianduan\simulator\src\main\resources\application.yml`: `hmac-secret: ${HMAC_SECRET:yunbd-terminal-secret-2026}`
- Multiple `simulator.py` files in worktrees contain `HMAC_SECRET = "yunbd-terminal-secret-2026"`

**Risk:** If this codebase is made public, the HMAC secret is compromised. All terminal-to-edge message integrity verification is bypassable.

**Fix:** Use environment variables only, remove default fallback secrets from source code.

---

### Mock Authentication in Production Code

**Frontend mock login:**
- `D:\yunbianduan\frontend\src\api\index.js` (lines 43-53): Hardcoded credentials `admin`/`admin123` with mock token `mock-token-12345`
- `D:\yunbianduan\frontend\src\stores\auth.js` (lines 21-25): Fallback accepts hardcoded `admin`/`admin123` credentials

**Risk:** Production deployments may accidentally use mock authentication, allowing anyone to access the system.

**Fix:** Remove mock authentication logic from production code paths.

---

### No Backend API Authentication

**Affected endpoints:**
- `D:\yunbianduan\payment-service\src\main\java\com\yunbd\payment\api\PaymentController.java`: No authentication annotations
- `D:\yunbianduan\registration-service\src\main\java\com\yunbd\registration\RegistrationController.java`: No authentication
- `D:\yunbianduan\queue-service\src\main\java\com\yunbd\queue\QueueController.java`: No authentication
- `D:\yunbianduan\edge-service\src\main\java\com\yunbd\edge\command\CommandController.java`: No authentication on command dispatch
- `D:\yunbianduan\simulator-service\src\main\java\com\yunbd\simulator\SimulatorController.java`: No authentication

**Risk:** All backend APIs are publicly accessible without authentication. Anyone can register patients, process payments, or dispatch commands to terminals.

**Fix:** Implement Spring Security with JWT authentication on all microservices.

---

### MQTT Topic Injection Risk

**Location:** `D:\yunbianduan\edge-service\src\main\java\com\yunbd\edge\command\CommandService.java` (line 47)

```java
String topic = "terminal/" + terminalId + "/command";
```

**Risk:** `terminalId` is used directly without sanitization. Malicious input could publish to arbitrary MQTT topics.

**Fix:** Validate `terminalId` against a whitelist of known terminal IDs before constructing the topic.

---

### Token Stored in localStorage

**Locations:**
- `D:\yunbianduan\frontend\src\stores\auth.js`: Token stored via `localStorage.setItem('auth_token', t)`
- `D:\yunbianduan\frontend\src\api\index.js`: Token read from localStorage and sent as Bearer token

**Risk:** XSS attacks can steal tokens from localStorage. Token has no expiration mechanism in the code.

**Fix:** Use httpOnly cookies for token storage, implement token refresh/expiration.

---

## Technical Debt

### Stub RiskCheckService

**Location:** `D:\yunbianduan\payment-service\src\main\java\com\yunbd\payment\service\impl\RiskCheckServiceImpl.java`

```java
@Override
public CompletableFuture<Boolean> checkAsync(PaymentRequestDto req) {
    return CompletableFuture.completedFuture(true);  // Always passes!
}
```

**Risk:** All payments bypass risk checks. No fraud detection or validation.

**Fix:** Implement actual risk scoring logic.

---

### AlertStore In-Memory + Redis Inconsistency

**Location:** `D:\yunbianduan\edge-service\src\main\java\com\yunbd\edge\AlertStore.java`

- In-memory `List<AlertDto>` synchronized but not thread-safe with Redis
- `persistToRedis` uses `leftPush + trim` which is not atomic (lines 124-125)
- On startup (`init()`), loads from Redis but in-memory list may diverge

**Risk:** Alert state can become inconsistent between memory and Redis. Duplicate alerts possible during race conditions.

**Fix:** Use Redis as sole source of truth, or implement proper synchronization.

---

### Drools KieSession Resource Leak

**Location:** `D:\yunbianduan\edge-service\src\main\java\com\yunbd\edge\rules\DroolsEngine.java` (lines 38-45)

```java
KieSession session = kieContainer.newKieSession();
try {
    // ...
} finally {
    session.dispose();
}
```

**Risk:** Each `evaluate()` call creates a new KieSession. Under load, this causes:
- Memory pressure from session object creation
- Potential FD leaks if exceptions occur before dispose
- No session pooling

**Fix:** Use a KieSession pool (e.g., `KieSessionPool`) or StatelessKieSession.

---

### Exception Swallowing (Empty Catch Blocks)

**Locations:**
- `D:\yunbianduan\payment-service\src\main\java\com\yunbd\payment\api\PaymentController.java` (line 55): `catch (Exception ignored) {}`
- `D:\yunbianduan\queue-service\src\main\java\com\yunbd\queue\QueueController.java` (line 37): `catch (Exception ignored) {}`
- `D:\yunbianduan\registration-service\src\main\java\com\yunbd\registration\RegistrationController.java` (line 189): `catch (Exception ignored) {}`

**Risk:** Errors are silently ignored. Payment records, queue data, and registrations may fail to persist without any indication.

**Fix:** Log errors at minimum, implement retry logic or dead-letter queue.

---

### No Input Validation on Critical Endpoints

**PaymentController:**
- `D:\yunbianduan\payment-service\src\main\java\com\yunbd\payment\api\PaymentController.java`: No `@Valid` annotation on `@RequestBody`

**RegistrationController:**
- `D:\yunbianduan\registration-service\src\main\java\com\yunbd\registration\RegistrationController.java`: Accepts any Map without schema validation

**Risk:** Malformed requests can cause runtime exceptions or unexpected behavior.

**Fix:** Add Bean Validation annotations (`@NotNull`, `@Min`, `@Max`) or implement input DTOs with validation.

---

### Hardcoded Magic Numbers

**Examples:**
- `AlertStore.MAX_SIZE = 200`
- `PaymentVerifyService.INSURANCE_TIMEOUT_MS = 400`
- `PaymentVerifyService.INSURANCE_TIMEOUT_MS outer = 500`
- `RiskCheckService timeout = 200`
- Simulator heartbeat interval: 5 seconds (hardcoded in SimulatorController)

**Risk:** Configuration changes require code changes. No ability to tune for different environments.

**Fix:** Externalize to configuration files (`application.yml`).

---

## Performance Considerations

### SimulatorService Heartbeat Load

**Location:** `D:\yunbianduan\simulator-service\src\main\java\com\yunbd\simulator\SimulatorController.java` (lines 67-89)

- Publishes heartbeat for all 20 terminals every 5 seconds
- Each heartbeat writes to Redis hash + increments counter
- 4 Redis operations per terminal per 5 seconds = ~16 ops/sec baseline

**Risk:** With more terminals or shorter intervals, Redis could become bottleneck. No batching or compression.

**Fix:** Batch Redis operations, use Redis pipelining.

---

### Synchronized AlertStore Operations

**Location:** `D:\yunbianduan\edge-service\src\main\java\com\yunbd\edge\AlertStore.java`

All public methods are `synchronized`:
- `add()`
- `acknowledge()`
- `resolve()`
- `getAll()`
- `getActive()`

**Risk:** Only one thread can access AlertStore at a time. Under high alert volume, this becomes a bottleneck.

**Fix:** Use `ConcurrentHashMap` or `ReentrantReadWriteLock` for concurrent read access.

---

### No Redis Connection Pooling Configuration

**Observation:** StringRedisTemplate is injected via Spring but no explicit connection pool configuration visible.

**Risk:** Default Lettuce connection pool settings may be insufficient under load.

**Fix:** Configure connection pool properties in `application.yml`.

---

### Scheduler Thread Pool Not Shutdown

**Location:** `D:\yunbianduan\simulator-service\src\main\java\com\yunbd\simulator\SimulatorController.java` (line 39)

```java
private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
```

**Risk:** On application shutdown, the scheduler is not explicitly shut down. This is a resource leak.

**Fix:** Implement `@PreDestroy` or `DisposableBean` to call `scheduler.shutdown()`.

---

## Scalability Concerns

### In-Memory AlertStore with 200 Alert Limit

**Location:** `D:\yunbianduan\edge-service\src\main\java\com\yunbd\edge\AlertStore.java` (line 17)

```java
private static final int MAX_SIZE = 200;
```

**Risk:** Only 200 most recent alerts are kept in memory. For high-volume environments, important alerts may be lost. No pagination support in `getAll()` or `getActive()`.

**Fix:** Implement pagination, or rely solely on Redis with proper query methods.

---

### No Database - All State in Redis

**Observation:** All services use Redis for persistence:
- Payment records
- Registration records
- Alert storage
- Terminal status
- Simulator state

**Risk:**
- Redis failure = total data loss
- No query capabilities beyond key-value
- No transaction support across services

**Fix:** Consider adding a proper database (PostgreSQL/MySQL) for business data, use Redis for caching only.

---

### Alert Deduplication Logic Issues

**Location:** `D:\yunbianduan\edge-service\src\main\java\com\yunbd\edge\AlertStore.java` (lines 62-78)

```java
String dedupKey = alert.getTerminalId() + ":" + alert.getType() + ":" + alert.getLevel();
```

**Risk:**
- Only deduplicates ACTIVE alerts - RESOLVED alerts remain
- Merge logic only updates message/timestamp/source, not level or type
- Alert deduplication is in-memory only, not consistent across edge service instances

**Fix:** Move deduplication to Redis using atomic operations, handle resolved alerts properly.

---

## Operational Risks

### Simulator Auto-Start on Init

**Location:** `D:\yunbianduan\simulator-service\src\main\java\com\yunbd\simulator\SimulatorController.java` (line 64)

```java
scheduler.scheduleAtFixedRate(this::publishTerminalHeartbeat, 0, 5, TimeUnit.SECONDS);
```

**Risk:** Simulator auto-starts publishing heartbeats on service init, regardless of `running` flag state. The `if (!running) return` at line 68 only checks once per iteration.

**Fix:** Move the `running` check inside `publishTerminalHeartbeat()` to respect state changes immediately.

---

### No Graceful Shutdown Handling

**Observation:** No `@PreDestroy` or shutdown hooks in:
- `SimulatorController` - scheduler not shutdown
- `AlertStore` - no cleanup
- `DroolsEngine` - KieContainer not closed

**Risk:** On Kubernetes pod termination, in-flight work is lost without graceful drain.

**Fix:** Implement graceful shutdown with proper cleanup hooks.

---

### No Health Check Depth

**docker-compose.yml healthchecks:** Most services use `nc -z localhost <port>` which only checks port availability, not actual service health.

**Risk:** Service may be "healthy" by k8s/docker standards but unable to process requests (e.g., Redis down, MQTT disconnected).

**Fix:** Implement proper Spring Actuator health indicators that check dependencies.

---

## Maintainability Issues

### Inconsistent ObjectMapper Instances

**Locations creating new ObjectMapper each use:**
- `PaymentController.java`: `new ObjectMapper()` (line 52, 65)
- `RegistrationController.java`: `new com.fasterxml.jackson.databind.ObjectMapper()` (lines 162, 183, 221)
- `SimulatorController.java`: `new com.fasterxml.jackson.databind.ObjectMapper()` (line 80)
- `AlertStore.java`: `new ObjectMapper()` (line 28)

**Risk:** Wasteful object creation, potential configuration inconsistency.

**Fix:** Share a single ObjectMapper bean via Spring DI.

---

### Duplicated Department/Doctor Data

**Location:** `D:\yunbianduan\registration-service\src\main\java\com\yunbd\registration\RegistrationController.java` (lines 25-69)

Department list and doctor data are built as static lists in the controller.

**Risk:** If doctor/department info changes, requires code change and redeployment.

**Fix:** Load from database or configuration file.

---

### No API Versioning Strategy

All endpoints use `/api/v1/` prefix with no deprecation or versioning strategy.

**Risk:** Future API changes without versioning break existing clients.

**Fix:** Implement API versioning (e.g., `/api/v1/`, `/api/v2/`).

---

### Frontend localStorage State Persistence Risks

**Location:** `D:\yunbianduan\frontend\src\stores\terminals.js` (lines 190-212)

Terminal simulation overrides stored in localStorage:
- `yunbd_terminal_status`
- `yunbd_terminal_expiry`

**Risk:**
- localStorage has no encryption
- State may become stale/contradictory with backend
- No validation on stored JSON

**Fix:** Move simulation state to backend or implement proper state sync.

---

## Dependencies at Risk

### Drools Version 8.41.0.Final

**pom.xml:** `<drools.version>8.41.0.Final</drools.version>`

**Risk:** Drools 8.x has breaking changes from 7.x. Rule engine complexity may cause memory issues in production.

**Fix:** Evaluate if simpler rule evaluation (JSON-based conditions) would suffice for current use case.

---

### Eclipse Mosquitto 2.0

**docker-compose.yml:** `eclipse-mosquitto:2.0`

**Risk:** MQTT broker has no authentication configured (anonymous access). No TLS.

**Fix:** Add MQTT authentication and TLS configuration for production.

---

### Redis 7 Alpine

**docker-compose.yml:** `redis:7-alpine`

**Risk:** No Redis password configured (`REDIS_PASSWORD: ""`). Redis is accessible to any container in the network.

**Fix:** Configure Redis AUTH and TLS for production.

---

## Test Coverage Gaps

### No Integration Tests for Critical Paths

**Observation:**
- `RegistrationController` test deleted: `D:\yunbianduan\registration-service\src\test\java\com\yunbd\registration\RegistrationControllerTest.java` (shown as deleted in git status)
- `RiskCheckServiceImpl` has no tests - it's a stub
- `AlertStore` has unit tests but no integration tests with real Redis

**Risk:** Critical business logic (payment, registration) has no automated tests.

**Fix:** Restore and expand controller tests, add integration tests with Testcontainers.

---

### Missing Alert Deduplication Tests

**Location:** `D:\yunbianduan\edge-service\src\test\java\com\yunbd\edge\AlertStoreTest.java`

- No test for edge case where same alert arrives simultaneously (race condition)
- No test for scenario where alert is modified after being added but before deduplication check

---

## Summary Priority Matrix

| Concern | Severity | Effort |
|---------|----------|--------|
| No backend authentication | Critical | High |
| Hardcoded secrets | Critical | Low |
| Stub RiskCheckService | High | Medium |
| MQTT topic injection | High | Low |
| Exception swallowing | Medium | Low |
| KieSession resource leak | Medium | Medium |
| Synchronized AlertStore | Medium | Medium |
| No graceful shutdown | Medium | Low |
| In-memory alert limit | Medium | Medium |
| Empty catch blocks | Low | Low |

---

*Concerns audit: 2026-04-21*
