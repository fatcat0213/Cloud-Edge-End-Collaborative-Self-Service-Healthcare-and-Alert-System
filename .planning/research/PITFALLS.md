# Pitfalls Research: Vue + ECharts Real-Time Dashboard

**Domain:** Medical kiosk monitoring dashboard (Vue 3 + ECharts 5.5.0)
**Researched:** 2026-04-21
**Confidence:** MEDIUM-HIGH (based on established ECharts/vue-echarts patterns; limited by environment search restrictions)

## Critical Pitfalls

### Pitfall 1: setOption Replace vs. Merge Mode Mismatch

**What goes wrong:**
Chart flickers or flashes during data updates. New data appears, then the chart briefly goes blank or resets before showing the new state. Animations replay when they should not.

**Why it happens:**
ECharts' `setOption()` has two fundamental modes:

- **Merge mode** (default, `notMerge: false`): ECharts deeply merges new options with existing chart state. Good for updating partial config (e.g., tooltip settings) without affecting other parts.
- **Replace mode** (`notMerge: true`): ECharts discards the existing chart state and applies only the new options. This is what you want when replacing a full dataset.

The mistake is using merge mode when replacing entire series data. ECharts tries to animate from old data to new data, but when data arrays are completely replaced (not appended), this causes visible flickering. Conversely, using replace mode when you only want to update one series causes all other series to briefly disappear.

**How to avoid:**
```javascript
// When replacing entire dataset (common in polling updates):
chart.setOption({
  series: [{ data: newData }]
}, { notMerge: true })  // Replace, do not merge

// When updating partial config (e.g., tooltip):
chart.setOption({
  tooltip: { trigger: 'item' }
}, { notMerge: false })  // Merge with existing
```

In vue-echarts, if you pass a new `option` object via props, vue-echarts calls `setOption` internally. The key is ensuring the option object structure is consistent. If you need replace behavior, pass `{ notMerge: true }` via the `update-options` prop or use `useChart` composable to call `setOption` directly with proper flags.

**Warning signs:**
- Charts flash/blank during polling updates
- Animations replay on every data update (should only play once on initial render)
- Tooltips disappear momentarily during updates

**Phase to address:** Phase 1 - Dashboard Core Stability

---

### Pitfall 2: New Object Reference per Computed Recalculation

**What goes wrong:**
Chart flickers even though the underlying data has not changed. The chart redraws with every Vue reactivity cycle, even when store data is identical.

**Why it happens:**
In Vue's reactivity system, computed properties that return object literals create a new reference on every access. If your chart option is a computed that returns `{ series: [{ data: [...] }] }`, every computed access creates a brand new object. Vue detects this "change" and vue-echarts re-renders the chart.

This is especially problematic because:
1. `alertsStore.alerts` is replaced with a new array on every poll (`alerts.value = normalizeAlertsPayload(...)`)
2. Every computed that depends on `alerts` recalculates
3. `alertTypeOption`, `terminalRingOption`, `tradeTrendOption` all return new object references
4. vue-echarts sees new option object → calls `setOption` → chart redraws

**How to avoid:**
Use `shallowRef` for chart options, or use `watch` with explicit comparison to prevent unnecessary updates:

```javascript
// Option 1: Use shallowRef for chart options
const chartOption = shallowRef({ series: [...] })

// Option 2: Use watch with explicit comparison
watch(
  () => [alertsStore.alerts, terminalsStore.terminals],
  ([newAlerts, newTerminals]) => {
    // Only update if data actually changed
    if (hasChanged(newAlerts, oldAlerts)) {
      chartOption.value = buildOption(newAlerts, newTerminals)
    }
  },
  { deep: false }  // Compare references, not deep values
)

// Option 3: Debounce/throttle polling to reduce update frequency
```

**Warning signs:**
- Performance profiler shows constant chart redraws even with no user interaction
- Console shows ECharts render loop running continuously
- Memory usage grows steadily over time

**Phase to address:** Phase 1 - Dashboard Core Stability

---

### Pitfall 3: Memory Leaks from Undisposed Chart Instances

**What goes wrong:**
After running for extended periods (hours to days), the dashboard becomes increasingly slow. Browser memory usage grows. Eventually the page becomes unresponsive.

**Why it happens:**
ECharts chart instances hold internal state including:
- Event listeners attached to DOM elements
- Internal data structures for series data
- Animation frame references
- Resize observers

When a Vue component unmounts but the ECharts instance is not explicitly disposed, these resources are not released. In vue-echarts, if you use `<v-chart>` in a component that is frequently destroyed/recreated (e.g., via `v-if`, router changes, or modal dialogs), each recreation creates a new chart instance without disposing the old one.

**How to avoid:**
```javascript
import { use } from 'vue-echarts'
import { onBeforeUnmount } from 'vue'

const chartRef = ref(null)

onBeforeUnmount(() => {
  if (chartRef.value) {
    chartRef.value.dispose()
  }
})
```

With vue-echarts, ensure the component is fully removed from the DOM (not just hidden). Use `v-if` not `v-show` for chart components that may be toggled. If using a composable like `useChart()`, always call the cleanup function.

**Warning signs:**
- Browser memory steadily increases over hours
- Chrome DevTools Performance tab shows accumulating ECharts instances
- `window.echarts` instances in heap snapshots grow over time

**Phase to address:** Phase 1 - Dashboard Core Stability

---

### Pitfall 4: Deep Reactive Alert Objects Causing Cascade Re-renders

**What goes wrong:**
Updating a single alert's status (acknowledge/resolve) triggers re-renders across multiple charts and computed properties unexpectedly. Performance degrades as alert count grows.

**Why it happens:**
The `alerts` store uses `ref([])` where each alert object is deeply reactive. When you mutate a single alert's status:
```javascript
const alert = alerts.value.find(a => a.id === alertId)
if (alert) {
  alert.status = 'ACKNOWLEDGED'  // This mutation is reactive
}
```
Vue's reactivity system marks all computed properties that touched this alert as dirty. `alertsByHour`, `filteredAlerts`, `bySource`, `recentAlerts`, and every computed in Dashboard that uses `alertsStore.alerts` recalculate.

The `acknowledge()` function mutates the alert in place but does NOT replace the array, so Vue's change detection may or may not catch it depending on how the computed properties are written. This creates inconsistent behavior.

**How to avoid:**
Prefer immutable updates in the alerts store:

```javascript
async function acknowledge(alertId) {
  try {
    await acknowledgeAlert(alertId)
    // Replace the array to ensure consistent reactivity
    alerts.value = alerts.value.map(a =>
      a.id === alertId
        ? { ...a, status: 'ACKNOWLEDGED', acknowledgedAt: Date.now() }
        : a
    )
  } catch (e) { ... }
}
```

Alternatively, use `shallowRef` for the alerts array if deep reactivity is not needed for individual alert properties:

```javascript
const alerts = shallowRef([])  // Only alert array reference is reactive
// When updating:
alerts.value = normalizeAlertsPayload(res.data)  // Full replacement
```

**Warning signs:**
- `acknowledge()` or `resolve()` operations cause visible lag
- Computed properties recalculate more times than expected
- Alert count grows and performance degrades linearly

**Phase to address:** Phase 2 - Alert Management Optimization

---

### Pitfall 5: Simultaneous Chart Updates from Multiple Polling Sources

**What goes wrong:**
Dashboard has multiple charts that each poll different endpoints (alerts every 5s, stats every 10s, terminals every 5s). These polls are not coordinated, so multiple chart updates happen simultaneously, causing visible jank.

**Why it happens:**
The current implementation has three independent polling loops:
- `alertsStore.startPolling(5000)` - fetches all alerts
- `terminalsStore.startPolling(5000)` - fetches terminal status
- `statsStore.startPolling(10000)` - fetches payment stats

When these timers align (every 10 seconds), all three fire at once. Each store update triggers computed recalculations in Dashboard. Each chart sees a new option object and re-renders. The combined load causes frame drops.

**How to avoid:**
Consolidate polling into a single update cycle with a shared interval:

```javascript
// Single polling manager
const POLL_INTERVAL = 5000
let pollTimer = null
let pollCount = 0

export function startUnifiedPolling() {
  pollTimer = setInterval(async () => {
    pollCount++
    // Stagger updates within the cycle to avoid simultaneous renders
    await alertsStore.fetchAlerts()
    await nextTick()  // Let charts render before next fetch
    await terminalsStore.fetchTerminals()
    await nextTick()
    if (pollCount % 2 === 0) {  // Stats every 10s
      await statsStore.fetchStats()
    }
  }, POLL_INTERVAL)
}
```

Alternatively, use a requestAnimationFrame-based render queue that batches chart updates:

```javascript
let pendingChartUpdates = new Set()
let rafId = null

function scheduleChartUpdate(chartId) {
  pendingChartUpdates.add(chartId)
  if (!rafId) {
    rafId = requestAnimationFrame(() => {
      pendingChartUpdates.forEach(id => updateChart(id))
      pendingChartUpdates.clear()
      rafId = null
    })
  }
}
```

**Warning signs:**
- Dashboard janks every 10 seconds when all polls align
- Chrome DevTools shows multiple layout thrashes occurring simultaneously
- CPU usage spikes periodically

**Phase to address:** Phase 1 - Dashboard Core Stability

---

### Pitfall 6: Large Dataset Handling Without Sampling

**What goes wrong:**
Charts become sluggish as alert history grows. Browser memory increases. Tooltips and interactions become slow.

**Why it happens:**
`alertsStore.fetchAlerts({ all: true })` fetches the entire alert history. The `alertsByHour` computed loops over all alerts every time. With weeks or months of data, this becomes expensive.

The project stores alerts in a flat array with no pagination on the data side. Each computed (`filteredAlerts`, `alertsByHour`, `bySource`) iterates the full array independently.

**How to avoid:**
Implement data windowing and sampling for historical data:

```javascript
// Only keep recent N alerts in memory
const MAX_ALERTS_IN_MEMORY = 500

async function fetchAlerts() {
  const res = await getEdgeAlerts({ all: true, limit: MAX_ALERTS_IN_MEMORY, offset: 0 })
  const newAlerts = normalizeAlertsPayload(res?.data)
  alerts.value = newAlerts  // Full replacement
}
```

For trend charts, downsample before rendering:

```javascript
function downsample(data, maxPoints) {
  if (data.length <= maxPoints) return data
  const step = Math.ceil(data.length / maxPoints)
  return data.filter((_, i) => i % step === 0)
}
```

Use ECharts' `dataZoom` for large series, or server-side aggregation for chart data.

**Warning signs:**
- Memory usage grows over days of operation
- `alertsByHour` computed takes measurable time (>5ms)
- Chrome DevTools shows long tasks during alert polling

**Phase to address:** Phase 2 - Alert Management Optimization

---

### Pitfall 7: WatchEffect for Polling Causing Uncontrolled Re-runs

**What goes wrong:**
Using `watchEffect` for polling causes the effect to re-run unexpectedly. The polling function runs more times than intended, accumulating timers or causing state inconsistencies.

**Why it happens:**
`watchEffect` tracks reactive dependencies and re-runs when any of them change. If your polling function accesses reactive state (even indirectly), the effect will re-run.

In the current code, `setInterval` is used correctly. But if someone adds `watchEffect` like this:
```javascript
watchEffect(() => {
  fetchAlerts()
  setInterval(fetchAlerts, 5000)
})
```
Each re-run creates a new interval without clearing the old one. The intervals accumulate.

**How to avoid:**
Always use `watch` with explicit dependencies for polling, not `watchEffect`:

```javascript
// Correct: watch with explicit deps, single interval
watch(
  () => shouldPoll.value,  // Explicit dependency
  (shouldPoll) => {
    if (shouldPoll) {
      fetchAlerts()
      timer = setInterval(fetchAlerts, 5000)
    } else {
      clearInterval(timer)
    }
  }
)
```

The current implementation uses `startPolling()` / `stopPolling()` with `setInterval` directly, which is correct. This pitfall is a warning for future modifications.

**Warning signs:**
- `fetchAlerts` runs more frequently over time
- Multiple alerts appear to be fetched simultaneously
- `clearInterval` warnings in console

**Phase to address:** Phase 1 - Dashboard Core Stability

---

### Pitfall 8: autoresize Misdirected to Root Element

**What goes wrong:**
Charts do not resize properly. ResizeObserver errors in console. Charts render at wrong dimensions after container resize.

**Why it happens:**
In vue-echarts, the `autoresize` prop must be placed on the `v-chart` component that directly wraps the ECharts instance. It relies on ResizeObserver on the component's root element.

In the Dashboard template:
```vue
<v-chart class="chart" :option="tradeTrendOption" autoresize />
```
The `autoresize` attribute here is correctly applied to the `v-chart` component. However, if the `class="chart"` CSS is on a wrapper div rather than the v-chart itself, the resize detection may not work correctly.

**How to avoid:**
Ensure the `autoresize` prop is on the v-chart element and the container CSS explicitly sets dimensions:

```vue
<div class="chart-container">
  <v-chart class="chart" :option="option" autoresize />
</div>

<style scoped>
.chart-container {
  width: 100%;
  height: 200px;  /* Must have explicit height */
}
.chart {
  width: 100%;
  height: 100%;
}
</style>
```

**Warning signs:**
- Charts do not resize when browser window changes
- ResizeObserver errors in console
- Charts render correctly only on initial load

**Phase to address:** Phase 1 - Dashboard Core Stability

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `v-show` for chart visibility | Charts persist state when hidden | Memory leak if not disposed, ResizeObserver continues running | Only when chart state must persist across toggle |
| `notMerge: false` for all updates | Simpler code, no option structure worries | Flicker on full dataset replacements | Never for polling-based data updates |
| Deep `ref([])` for large arrays | Simple syntax for nested property access | Cascade re-renders, poor performance at scale | Never for arrays > 100 items with computed dependents |
| Single polling interval without coordination | Easy to implement | Aligned poll spikes | MVP only, must fix before production |
| Fetching `all: true` alerts without pagination | Simple data model | Memory growth, slow computed recalculations | MVP only, limit to 500 for production |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| vue-echarts + Vite | Forgetting to configure ECharts tree-shaking in vite.config | Import only needed ECharts components via `use()` |
| vue-echarts + Pinia | Passing store reactive objects directly to chart option computed | Use `shallowRef` or explicit `watch` with comparison |
| vue-echarts + setInterval | Creating interval without cleanup on unmount | Always clear interval in `onBeforeUnmount` |
| vue-echarts + `<Transition>` | Chart disposes during transition animation | Use `v-show` inside transition or delay disposal |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Uncoordinated multi-store polling | Periodic jank every N seconds | Unified polling manager | Always, even at 20 terminals |
| Computed chart options with deep deps | Constant chart redraws | `shallowRef` or explicit watch | When alerts > 50 |
| Full alert history in memory | Memory growth, slow filters | Data windowing, server-side pagination | After 1-2 days of operation |
| No chart disposal on unmount | Memory leaks, cumulative slowdown | Explicit dispose in onBeforeUnmount | Always, especially in dev HMR |
| New object per computed access | Unnecessary chart redraws | Cache option object, only update when data changes | When polling interval < 10s |

---

## "Looks Done But Isn't" Checklist

- [ ] **Charts resize correctly:** Verify after browser window resize, not just initial render
- [ ] **Memory stability:** Open DevTools Performance monitor, leave dashboard running for 30 minutes, verify no memory growth
- [ ] **No flicker on updates:** Set polling to 2s interval, observe for 5 minutes - should be smooth
- [ ] **acknowledge/resolve updates chart:** Trigger acknowledge, verify chart counts update immediately
- [ ] **Dispose on unmount:** Navigate away from dashboard and back, check for ResizeObserver errors or memory growth
- [ ] **Coordinated polling:** All three stores poll, but updates should not cause synchronized frame drops

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Memory leak from undisposed charts | HIGH | Identify leak with heap snapshots, add dispose calls, refresh page to clear |
| Flicker from wrong merge mode | MEDIUM | Change to `notMerge: true` for data-only updates, verify with 2s poll interval |
| Cascade re-renders from deep reactivity | MEDIUM | Refactor to shallowRef + immutable updates, ~2-4 hours work |
| Polling alignment jank | LOW | Implement unified polling, ~1-2 hours work |
| Large dataset slowdown | MEDIUM | Implement data windowing, requires API change or client-side limit |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| setOption merge mode mismatch | Phase 1: Dashboard Core Stability | Charts should not flicker during 2s polling over 5 minutes |
| New object per computed | Phase 1: Dashboard Core Stability | Chrome DevTools Performance shows no constant redraws when idle |
| Memory leaks from undisposed charts | Phase 1: Dashboard Core Stability | Heap snapshot comparison after 30min shows stable memory |
| Deep reactivity cascade | Phase 2: Alert Management Optimization | acknowledge() should not cause visible lag |
| Simultaneous polling spikes | Phase 1: Dashboard Core Stability | No periodic frame drops in Performance timeline |
| Large dataset handling | Phase 2: Alert Management Optimization | alertsByHour computed < 5ms with 500 alerts |
| WatchEffect polling accumulation | Phase 1: Dashboard Core Stability | No duplicate fetch calls in Network tab |
| autoresize misconfiguration | Phase 1: Dashboard Core Stability | Charts resize correctly after window resize |

---

## Sources

- Apache ECharts Official Documentation: `setOption` merge behavior
- vue-echarts (ecomfe/vue-echarts) GitHub - issue discussions on memory leaks and reactivity
- Vue 3 Reactivity System - `shallowRef` vs `ref` performance characteristics
- Pinia stores - `defineStore` with `ref()` vs `reactive()` performance tradeoffs
- Community patterns from Vue + ECharts real-time dashboard implementations

*Note: Web search and Context7 documentation lookup failed due to environment restrictions. Findings are based on established patterns from ECharts 5.x architecture and Vue 3 reactivity system. Confidence level MEDIUM-HIGH for technical accuracy, LOW for being fully up-to-date with latest releases.*
