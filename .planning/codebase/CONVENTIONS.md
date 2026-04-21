# Coding Conventions

**Analysis Date:** 2026-04-21

## Naming Patterns

### Files

**Java (Spring Boot backend):**
- Source files: `PascalCase.java` (e.g., `AlertController.java`, `RegistrationController.java`)
- Test files: `PascalCaseTest.java` (e.g., `DroolsEngineTest.java`, `GatewayRouteTest.java`)
- DTOs: `PascalCase.java` with `@Data` Lombok annotation (e.g., `AlertDto.java`)
- Location: `{service}/src/main/java/com/yunbd/{service}/` and `{service}/src/test/java/com/yunbd/{service}/`

**Vue/JS (frontend):**
- Vue components: `PascalCase.vue` (e.g., `AlertsView.vue`, `MainLayout.vue`)
- Stores: `camelCase.js` (e.g., `alerts.js`, `terminals.js`, `simulator.js`)
- API modules: `camelCase.js` (e.g., `index.js`, `edgeCommand.js`)
- Test files: `kebab-case.test.js` (e.g., `alerts.test.js`, `MainLayout.test.js`)
- Location: `frontend/src/` with `__tests__` co-located or in dedicated test directory

### Java Classes and Packages

- Package naming: `com.yunbd.{service}` (e.g., `com.yunbd.edge`, `com.yunbd.gateway`)
- Controller naming: `{Resource}Controller.java` (e.g., `AlertController.java`)
- DTO naming: `{Resource}Dto.java` (e.g., `AlertDto.java`)
- Test naming: `{Class}Test.java` for unit tests, `{Class}IntegrationTest.java` for integration tests

### JavaScript/Vue

- Store exports: `use{Store}Store` (e.g., `useAlertsStore`, `useTerminalsStore`)
- API exports: `camelCase` functions (e.g., `getEdgeAlerts`, `acknowledgeAlert`)
- Vue component exports: default (using `<script setup>`)

### Variables and Methods

- Java: `camelCase` (e.g., `alertStore`, `getAlerts()`, `setFilter())
- JavaScript/Vue: `camelCase` (e.g., `filteredAlerts`, `setFilter`, `startPolling`)
- Constants: `SCREAMING_SNAKE_CASE` in Java (e.g., `REG_KEY`, `SEQ_KEY`)
- Constants: `camelCase` in JS with `const` (e.g., `TERMINAL_LOCATIONS`, `RESTART_DURATION_MS`)

### API Endpoints

- RESTful: `/api/v1/{resource}` (e.g., `/api/v1/alerts`, `/api/v1/registration`)
- Path parameters: `/api/v1/{resource}/{id}` (e.g., `/api/v1/alerts/{alertId}/acknowledge`)
- HTTP methods: GET (list/retrieve), POST (create/action), PUT (update), DELETE (remove)

## Code Organization

### Frontend (Vue 3 + Vite)

```
frontend/src/
  api/              # API client modules
    index.js        # Axios instance + interceptors + endpoints
    edgeCommand.js  # Edge command API client
  stores/           # Pinia stores (state management)
    alerts.js       # Alerts store with filtering, pagination, polling
    terminals.js    # Terminal management + simulation
    simulator.js     # Simulator control
    stats.js         # Payment/transaction stats
    auth.js         # Authentication state
  views/            # Page-level Vue components
    AlertsView.vue
    Dashboard.vue
    TerminalsView.vue
  components/       # Reusable Vue components
    MainLayout.vue
    TerminalDetailDrawer.vue
    FlowDiagram.vue
  styles/           # CSS variables and overrides
    variables.css
    element-override.css
  __tests__/        # Test files
    stores/         # Store unit tests
    views/          # View/component tests
    api.test.js     # API interceptor tests
    router.test.js  # Router tests
```

### Backend (Spring Boot Multi-Module Maven)

```
yunbianduan-parent/
  common/           # Shared DTOs, utilities
  simulator/        # Terminal simulator service (port 8095)
  simulator-service/
  edge-service/     # Edge rule engine, alert processing (port 8090)
  cloud-gateway/    # API Gateway (port 8080)
  payment-service/  # Payment verification (port 8081)
  registration-service/  # Registration/queue (port 8082)
  report-service/   # Report generation (port 8083)
  queue-service/    # Queue monitoring (port 8084)
  insurance-service/# Insurance verification (port 8085)
  flink-jobs/       # Stream processing jobs
```

### Java Source Organization

- Controllers: `@RestController` with `@RequestMapping` for route prefix
- Business logic: In service methods or domain classes
- Data access: Redis via `StringRedisTemplate`, JPA entities
- Shared DTOs: In `common` module under `com.yunbd.common.dto`

## Error Handling

### Frontend (JavaScript/Vue)

**Store error handling pattern:**
```javascript
async function fetchAlerts() {
  try {
    loading.value = true
    const res = await getEdgeAlerts({ all: true })
    alerts.value = normalizeAlertsPayload(res?.data)
  } catch (e) {
    console.error('Failed to fetch alerts:', e)
    alerts.value = []  // Graceful degradation
  } finally {
    loading.value = false
  }
}
```

**API response error handling:**
- Interceptors handle 401 redirects to login
- Stores handle API errors gracefully with fallback state
- UI shows user-friendly error messages via `ElMessage.error()`

**Payload normalization:**
```javascript
function normalizeAlertsPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.data?.items)) return payload.data.items
  return []
}
```

### Backend (Java Spring)

**Controller error handling:**
```java
@PostMapping
public ResponseEntity<Map<String, String>> register(@RequestBody Map<String, String> req) {
    if (patientId.isBlank() || deptCode.isBlank() || doctorId.isBlank()) {
        return ResponseEntity.badRequest().body(Map.of(
            "status", "FAILED",
            "message", "patientId/deptCode/doctorId are required"
        ));
    }
    // ...
}
```

**Redis failure graceful degradation:**
```java
try {
    String json = new ObjectMapper().writeValueAsString(record);
    redisTemplate.opsForList().leftPush(REG_KEY, json);
} catch (Exception e) {
    // Redis 失败时降级，不阻塞主流程
}
```

**Exception types used:**
- `ResponseEntity.badRequest()` - validation failures
- `ResponseEntity.status(409)` - conflict states (e.g., full slots)
- `ResponseEntity.notFound().build()` - resource not found
- `ResponseEntity.ok()` - successful responses

## Logging Conventions

### Frontend

**Console logging:**
```javascript
// Use console.warn for recoverable issues
console.warn('[fetchTerminals] failed:', e)

// Use console.error for critical failures
console.error('Failed to fetch alerts:', e)

// Use console.log for initialization state
console.log('[terminalsStore] localStorage overrides:', JSON.stringify(initOverrides))
```

**No structured logging library** - uses native `console` API.

### Backend (Java)

**SLF4J usage (Spring Boot standard):**
```java
// Not directly visible in code, Spring Boot provides via Lombok or auto-config
```

**Pattern:** Use `java.util.logging` or rely on Spring Boot's default logging.

## API Design Patterns

### Axios Configuration (Frontend)

**Base instance with interceptors in `frontend/src/api/index.js`:**
```javascript
const http = axios.create({ baseURL: '/api/v1', timeout: 10000 })

// Request interceptor: attach Authorization header
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

**API exports:**
```javascript
export const getEdgeAlerts = (params = {}) => http.get('/alerts', { params })
export const acknowledgeAlert = (alertId) => http.post(`/alerts/${alertId}/acknowledge`)
export const resolveAlert = (alertId) => http.post(`/alerts/${alertId}/resolve`)
```

### REST Controller Patterns (Backend)

**Response structure:**
```java
// Success with data
return ResponseEntity.ok(Map.of("regId", regId, "patientId", patientId, "status", "PENDING"))

// Bad request
return ResponseEntity.badRequest().body(Map.of("status", "FAILED", "message", "..."))

// Conflict (e.g., slot full)
return ResponseEntity.status(409).body(Map.of("status", "FULL", "message", "..."))
```

**Request handling:**
```java
@GetMapping
public List<AlertDto> getAlerts(
    @RequestParam(required = false) String status,
    @RequestParam(defaultValue = "false") boolean all) { ... }

@PostMapping("/{alertId}/acknowledge")
public Map<String, Object> acknowledge(@PathVariable String alertId) { ... }
```

## Vue Component Patterns

### Script Setup Structure

```vue
<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAlertsStore } from '../stores/alerts'

const store = useAlertsStore()

// Reactive state
const levelFilter = ref('')

// Computed
const p2Count = computed(() => store.alerts.filter(a => a.level === 'P2').length)

// Watchers for side effects
watch(levelFilter, (val) => {
  store.setFilter({ level: val })
})

// Lifecycle
onMounted(() => { store.startPolling(5000) })
onUnmounted(() => { store.stopPolling() })

// Methods
async function handleRefresh() { ... }
</script>
```

### Element Plus Component Usage

- `el-table` for data tables with `:data` binding
- `el-select`, `el-input`, `el-date-picker` for filters
- `el-pagination` for paginated views
- `el-drawer` for detail panels
- `el-button` with `type` prop for actions
- `el-tag` for status/level badges

## State Management (Pinia)

### Store Pattern (Composition API)

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getEdgeAlerts } from '../api'

export const useAlertsStore = defineStore('alerts', () => {
  // State
  const alerts = ref([])
  const loading = ref(false)
  let timer = null

  // Computed
  const p0Count = computed(() => alerts.value.filter(a => a.level === 'P0').length)
  const filteredAlerts = computed(() => { ... })
  const pagedAlerts = computed(() => { ... })

  // Actions
  async function fetchAlerts() { ... }
  function setFilter({ level = '', type = '' } = {}) { ... }
  function setPage(n) { ... }
  function startPolling(interval = 5000) { ... }
  function stopPolling() { ... }

  return {
    alerts, loading, p0Count, filteredAlerts, pagedAlerts,
    fetchAlerts, setFilter, setPage, startPolling, stopPolling
  }
})
```

## Import Organization

### Frontend (ES Modules)

```javascript
// 1. Vue core
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// 2. External libraries
import { ElMessage } from 'element-plus'
import { setActivePinia, createPinia } from 'pinia'

// 3. Internal modules
import { useAlertsStore } from '../stores/alerts'
import { getEdgeAlerts } from '../api'

// 4. Component imports (if not auto-imported)
import AlertsView from '../../views/AlertsView.vue'
```

### Backend (Java)

```java
// 1. Spring framework
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;

// 2. External libraries
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

// 3. Internal shared
import com.yunbd.common.dto.AlertDto;

// 4. Local
import com.yunbd.edge.AlertStore;
```

---

*Convention analysis: 2026-04-21*
