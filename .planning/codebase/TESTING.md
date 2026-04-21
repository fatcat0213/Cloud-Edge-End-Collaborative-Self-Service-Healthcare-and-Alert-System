# Testing Patterns

**Analysis Date:** 2026-04-21

## Test Frameworks

### Frontend (Vue 3)

**Runner:** Vitest 1.6.0
- Configured in `frontend/vite.config.js` under `test` key
- Environment: jsdom
- Globals: enabled (describe, it, expect, vi available without imports)
- `passWithNoTests: true` - tests are optional

**Assertion:** Vitest built-in + Chai (via `check-error`, `assertion-error`)
- Use `expect(...).toBe()`, `.toEqual()`, `.toHaveBeenCalledTimes()` style
- Use `chai` assertions via `assertThat(...).isEqualTo()` in some Java tests

**Component Testing:** @vue/test-utils 2.4.0
- `mount()` and `shallowMount()` for Vue component rendering
- `wrapper.vm` for accessing component instance
- `wrapper.find()`, `wrapper.exists()` for DOM queries

**Run Commands:**
```bash
npm test           # Run tests in watch mode
npm run test:run   # Run once (CI mode)
```

**Test Files Location:** `frontend/src/__tests__/`

### Backend (Spring Boot)

**Runner:** JUnit 5 (Jupiter) via Spring Boot Starter Test
- `@SpringBootTest` for integration tests
- `@WebMvcTest({Controller}.class)` for slice tests
- `@Test` from `org.junit.jupiter.api.Test`

**Additional Test Libraries:**
- AssertJ: `org.assertj.core.api.Assertions.assertThat()`
- Mockito: Spring Boot test auto-configures mocks
- Testcontainers 1.19.6: For Redis, Kafka integration tests

**Run Commands:**
```bash
mvn test                           # Run all tests
mvn test -Dtest=ClassName         # Run specific test class
mvn test -pl module-name           # Run specific module
```

**Test Files Location:** `{module}/src/test/java/com/yunbd/{module}/`

## Test File Organization

### Frontend

```
frontend/src/__tests__/
  api.test.js              # Axios interceptor tests
  router.test.js          # Vue Router tests
  styles.test.js          # CSS/style tests
  setup.js               # Global test setup (currently empty placeholder)
  stores/
    auth.test.js
    alerts.test.js
    terminals.test.js
    simulator.test.js
    stats.test.js
    cloudSide.test.js
    edgeSide.test.js
    terminalSide.test.js
  views/
    LoginView.test.js
    AlertsView.test.js
    Dashboard.test.js
    TerminalsView.test.js
    AlertsV1Style.test.js
    BusinessViewsV2Style.test.js
    DashboardV1Style.test.js
    TerminalsV2Style.test.js
  components/
    MainLayout.test.js
    FlowDiagram.test.js
```

### Backend

```
{module}/src/test/java/com/yunbd/{module}/
  GatewayRouteTest.java
  DroolsEngineTest.java
  MqttSubscriberIntegrationTest.java
  HmacUtilTest.java
  TerminalSimulatorTest.java
  TerminalClientTest.java
  PaymentVerifyServiceTest.java
  ReportControllerTest.java
  QueueControllerTest.java
  InsuranceControllerTest.java
  SuccessRateProcessFunctionTest.java
```

## Test Types

### Unit Tests

**Frontend Store Tests:**
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAlertsStore } from '../../stores/alerts'

vi.mock('../../api', () => ({
  getEdgeAlerts: vi.fn()
}))
import { getEdgeAlerts } from '../../api'

describe('alerts store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('filteredAlerts filters by level correctly', async () => {
    getEdgeAlerts.mockResolvedValue({ data: makeAlerts(10) })
    const store = useAlertsStore()
    await store.fetchAlerts()

    store.setFilter({ level: 'P0' })
    const p0Alerts = store.filteredAlerts
    expect(p0Alerts.every(a => a.level === 'P0')).toBe(true)
  })
})
```

**Backend Unit Tests:**
```java
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class DroolsEngineTest {
    private final DroolsEngine engine = new DroolsEngine();

    @Test
    void evaluate_printerError_shouldGenerateP0Alert() {
        TerminalStatusDto status = new TerminalStatusDto();
        status.setTerminalId("T001");
        // ... set up test data
        List<AlertDto> alerts = engine.evaluate(status);

        assertThat(alerts).hasSize(1);
        assertThat(alerts.get(0).getLevel()).isEqualTo("P0");
        assertThat(alerts.get(0).getType()).isEqualTo("HARDWARE");
    }
}
```

### Integration Tests

**Backend Controller Tests (@WebMvcTest):**
```java
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(QueueController.class)
class QueueControllerTest {
    @Autowired MockMvc mvc;

    @Test
    void getQueueStatus_shouldReturnDepthAndWait() throws Exception {
        mvc.perform(get("/api/v1/queue/NEU"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.depth").isNumber())
            .andExpect(jsonPath("$.avgWaitMs").isNumber());
    }
}
```

**Backend Full Integration Test (@SpringBootTest):**
```java
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
            "simulator-service-api",
            "payment-service",
            "registration-service",
            "report-service",
            "queue-service",
            "insurance-service");
    }
}
```

Note: `GatewayRouteTest` excludes Redis/rate-limiter via `src/test/resources/application.yml`.

### Component/View Tests (Frontend)

```javascript
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../../stores/alerts', () => ({
  useAlertsStore: () => ({
    pagedAlerts: [...],
    filteredAlerts: [...],
    setFilter: mockSetFilter,
    fetchAlerts: vi.fn()
  })
}))

vi.mock('@element-plus/icons-vue', () => ({
  Refresh: { template: '<span>refresh</span>' }
}))

function mountView() {
  return mount(AlertsView, {
    global: {
      plugins: [createPinia()],
      stubs: {
        'el-tag': { template: '<span class="el-tag"></span>', props: ['type'] },
        'el-table': { template: '<div class="el-table"></div>', props: ['data'] },
        'el-button': { template: '<button></button>' },
        'el-pagination': { template: '<div></div>' }
      }
    }
  })
}

describe('AlertsView.vue', () => {
  it('renders pagedAlerts in table', () => {
    const wrapper = mountView()
    expect(wrapper.find('.el-table').exists()).toBe(true)
  })
})
```

### API Interceptor Tests

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('axios', () => {
  const mockInstance = {
    interceptors: {
      request: {
        use: vi.fn((onFulfilled, onRejected) => {
          interceptorStore.request.push({ onFulfilled, onRejected })
        })
      }
    },
    get: vi.fn()
  }
  return { default: { create: vi.fn(() => mockInstance) } }
})

describe('API interceptors', () => {
  it('request interceptor attaches Authorization header when token in localStorage', async () => {
    localStorage.setItem('auth_token', 'test-token-abc')
    const { default: axios } = await import('axios')
    await import('../api/index.js')

    const instance = axios.create.mock.results[0].value
    const requestInterceptor = instance.interceptors.request.use.mock.calls[0][0]
    const config = { headers: {} }
    const result = requestInterceptor(config)

    expect(result.headers['Authorization']).toBe('Bearer test-token-abc')
  })
})
```

## Mocking Strategies

### Frontend

**vi.mock() for API modules:**
```javascript
vi.mock('../../api', () => ({
  getEdgeAlerts: vi.fn(),
  acknowledgeAlert: vi.fn(),
  resolveAlert: vi.fn()
}))
```

**vi.mock() for stores:**
```javascript
vi.mock('../../stores/alerts', () => ({
  useAlertsStore: () => ({
    pagedAlerts: [...],
    setFilter: vi.fn(),
    fetchAlerts: vi.fn()
  })
}))
```

**vi.mock() for Vue components:**
```javascript
vi.mock('@element-plus/icons-vue', () => ({
  Refresh: { template: '<span>refresh</span>' },
  Tools: { template: '<span>tools</span>' }
}))
```

**vi.useFakeTimers() for debounce/timing tests:**
```javascript
beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

it('filter change calls setFilter after debounce', async () => {
  wrapper.vm.levelFilter = 'P0'
  await wrapper.vm.$nextTick()
  vi.advanceTimersByTime(350)
  expect(mockSetFilter).toHaveBeenCalled()
})
```

**vi.resetModules() for interceptor tests:**
```javascript
beforeEach(() => {
  vi.resetModules()
})
```

### Backend

**@WebMvcTest provides MockMvc** - no manual mock setup needed for controllers.

**@SpringBootTest with mocked Redis:**
- Test resource file `application.yml` excludes real Redis connection
- `GatewayRouteTest` comment: "Redis and rate-limiter are excluded via src/test/resources/application.yml"

**Direct instantiation for unit tests:**
```java
private final DroolsEngine engine = new DroolsEngine();
```

**AssertJ assertions:**
```java
assertThat(alerts).hasSize(1);
assertThat(alerts.get(0).getLevel()).isEqualTo("P0");
assertThat(ids).contains("simulator-service-api");
```

## Fixtures and Factories

### Frontend Test Data Factory

```javascript
const makeAlerts = (count, overrides = {}) =>
  Array.from({ length: count }, (_, i) => ({
    id: `alert-${i}`,
    level: i % 3 === 0 ? 'P0' : 'P1',
    type: i % 2 === 0 ? 'HARDWARE' : 'PERFORMANCE',
    terminalId: `T00${(i % 5) + 1}`,
    message: `Alert ${i}`,
    ...overrides
  }))
```

### Backend Test Data

Built inline in each test method - no factory pattern used:
```java
TerminalStatusDto status = new TerminalStatusDto();
status.setTerminalId("T001");
TerminalStatusDto.HardwareStatus hw = new TerminalStatusDto.HardwareStatus();
hw.setPrinter("paper_jam");
status.setHardware(hw);
```

## Test Coverage Approach

### Frontend

**No enforced coverage threshold** - `passWithNoTests: true` in vite config.

**Covered areas:**
- Pinia stores: state mutations, computed properties, API integration
- API interceptors: request/response interceptor logic
- Vue components: rendering, user interactions, lifecycle hooks
- Router: navigation guards, route resolution

**Not covered (based on test files):**
- E2E tests (no Cypress/Playwright detected)
- Snapshot tests

### Backend

**Coverage not enforced** - no JaCoCo configuration visible in `pom.xml`.

**Test scope by module:**
- `common`: Utility tests (e.g., `HmacUtilTest`)
- `edge-service`: Rule engine tests (`DroolsEngineTest`), MQTT integration tests
- `cloud-gateway`: Route locator test
- `queue-service`: Controller slice test
- `insurance-service`: Controller slice test
- `payment-service`: Service layer test
- `report-service`: Controller test
- `flink-jobs`: Process function test
- `simulator`: Client and simulator tests

## Common Test Patterns

### Async Testing (Frontend)

```javascript
it('fetchAlerts updates alerts array', async () => {
  getEdgeAlerts.mockResolvedValue({ data: makeAlerts(5) })
  const store = useAlertsStore()
  await store.fetchAlerts()
  expect(store.alerts.length).toBe(5)
})
```

### Timer/Polling Tests (Frontend)

```javascript
it('calls startPolling on mount', async () => {
  const wrapper = await mountMainLayout()
  expect(mockStartPolling).toHaveBeenCalledTimes(1)
  expect(mockStartPolling).toHaveBeenCalledWith(5000)
})

it('calls stopPolling on unmount', async () => {
  const wrapper = await mountMainLayout()
  wrapper.unmount()
  expect(mockStopPolling).toHaveBeenCalledTimes(1)
})
```

### Error Testing (Frontend Store)

```javascript
it('start() with API error sets apiReady to false and does not throw', async () => {
  startSimulator.mockRejectedValue(new Error('Network Error'))
  const store = useSimulatorStore()
  await expect(store.start()).resolves.toBeUndefined()
  expect(store.apiReady).toBe(false)
})
```

### JSON Path Assertions (Backend MockMvc)

```java
mvc.perform(get("/api/v1/queue/NEU"))
    .andExpect(status().isOk())
    .andExpect(jsonPath("$.depth").isNumber())
    .andExpect(jsonPath("$.avgWaitMs").isNumber());
```

### Store Reset Between Tests (Frontend)

```javascript
beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})
```

---

*Testing analysis: 2026-04-21*
