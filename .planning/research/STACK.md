# Stack Research

**Domain:** Real-time data visualization / monitoring dashboard
**Researched:** 2026-04-21
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Apache ECharts | 5.5.0+ | Chart rendering engine | Industry standard for Vue dashboards; 5.x brings incremental rendering optimizations, WebGL acceleration for large datasets, and reduced main-thread blocking |
| vue-echarts | 7.0.0+ | Vue 3 wrapper for ECharts | Officially maintained; tree-shakeable (reduces bundle size); handles Vue 3 lifecycle integration properly; auto-resize support built-in |
| Vue 3 | 3.4+ | Framework | Composition API enables fine-grained reactivity control; `shallowRef` avoids deep proxy overhead on chart option objects |
| Pinia | 2.x | State management | Works naturally with `shallowRef` for chart data; lighter than Vuex; no proxy-wrapping of large data arrays |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| echarts/core (tree-shakeable) | 5.5.0+ | On-demand chart imports | When bundle size matters; only import used chart types and components |
| echarts/renderers | 5.5.0+ | Canvas/SVG renderer | CanvasRenderer is default and faster for real-time; use SVGRenderer only if SVG export is needed |

---

## 1. ECharts 5.x Incremental Update: `appendData` vs `setOption`

### Verdict: `setOption` with `lazyUpdate: true` is the primary tool. `appendData` is specialized.

**How `setOption` works for real-time streaming:**

```javascript
// Prefer this for streaming time-series (1-second refresh)
chart.setOption({
  series: [{ data: newData }]
}, {
  notMerge: false,   // merge with existing option (default)
  replaceMerge: [], // do not replace any series config
  lazyUpdate: true  // DO NOT flush immediately; batch the update
});
```

**Rationale:** ECharts 5.x processes `setOption` asynchronously. When `lazyUpdate: true`, the update is deferred to the next animation frame, batching multiple rapid updates into a single render pass. This is the single most impactful setting for a 1-second refresh dashboard.

**When to use `notMerge: true`:**
- Switching between fundamentally different chart types (e.g., bar to pie)
- Full data replacement where partial merge would cause ghost data to persist
- When legend selections or other UI state should be reset

**When `notMerge: false` (default) is correct:**
- Incrementally updating series data points on an existing chart type
- Appending new time-series entries while keeping axis scales and legend intact

**`appendData` — specialized, not general-purpose:**

```javascript
chart.appendData({
  seriesIndex: 0,
  data: [ /* Float32Array of new data points */ ]
});
```

`appendData` is designed exclusively for **large dataset pagination** (e.g., rendering millions of GPS points in geo-scatter plots via WebGL). It does NOT support:
- Updating axis scales dynamically
- Merging with existing series metadata (legend, tooltips)
- General time-series append with shifting old data

**Conclusion for your 1-second refresh use case:** Use `setOption({ series: [{ data }] }, { lazyUpdate: true })`. Do not use `appendData` unless you are rendering 100K+ points via WebGL scatter/geo charts.

### Source
- Apache ECharts 5.x docs — `setOption` signature and `lazyUpdate` behavior
- CSDN: "ECharts大数据量的分批加载appendData" (2025-12) — confirms `appendData` scope limitation

---

## 2. Preventing Chart Flicker on Data Update

### Verdict: The flicker problem is caused by full chart re-initialization. The fix is reuse + incremental update.

**Root causes of flicker:**
1. Destroying and re-initializing the chart instance on every data update (never do this)
2. Deep reactive proxy wrapping of the ECharts instance by Vue (Vue 3 proxy interceptor conflicts with ECharts internal state during `resize`)
3. `notMerge: true` causing a full chart teardown and rebuild on each update

**The anti-pattern (NEVER do this):**
```javascript
// WRONG — destroys and recreates on every update
watch(data, (newData) => {
  chartInstance.value?.dispose()
  chartInstance.value = echarts.init(dom)
  chartInstance.value.setOption({ series: [{ data: newData }] })
})
```

**The correct pattern — reuse + incremental update:**
```javascript
// CORRECT — reuse instance, just update data
watch(data, (newData) => {
  if (!chartInstance.value) return
  chartInstance.value.setOption({
    series: [{ data: newData }]
  }, {
    notMerge: false,  // merge with existing — preserves all config
    lazyUpdate: true  // batch to next animation frame
  })
})
```

**Flicker from Vue 3 proxy on chart instance:**
When you store the ECharts instance in a `ref`, Vue 3 wraps it in a reactive proxy. This interferes with ECharts' internal coordinate system calculations during `resize`.

**Solution — use `markRaw` or `shallowRef`:**
```javascript
import { markRaw } from 'vue'

// Option A: markRaw on init
chartInstance = markRaw(echarts.init(dom))

// Option B: shallowRef (recommended — no proxy at all)
import { shallowRef } from 'vue'
const chartInstance = shallowRef(null)

// shallowRef only tracks .value assignment, NOT the internal state
// ECharts mutates its own internals — Vue does not interfere
```

**Flicker from tooltip transitions:**
ECharts tooltip has a default `transitionDuration`. Set to `0` to prevent position jitter on rapid updates:

```javascript
tooltip: {
  trigger: 'axis',
  transitionDuration: 0  // eliminates tooltip position flicker
}
```

**Resize flicker:**
Always use `chart.resize()` in a `ResizeObserver` callback, never inside a data update watch:

```javascript
const resizeObserver = new ResizeObserver(() => {
  chartInstance.value?.resize()
})
resizeObserver.observe(chartDom.value)
```

### Source
- CSDN: "vue3中echarts实例不能设置响应式" (2023-07) — `markRaw` fix for proxy conflict
- CSDN: "echarts初次加载完成浏览器抖动" (2020-09) — `transitionDuration: 0` fix
- 博客园: "踩坑日记--vue3中echarts图表点击legend切换时频繁报错" (2023-07) — proxy causing `Cannot read properties of undefined (reading 'type')`

---

## 3. vue-echarts 7.x Best Practices with Vue 3 Reactivity

### Verdict: Use `shallowRef` for chart options. Never deep-watch the option object.

**Why `shallowRef` instead of `ref` for chart options:**

A `ref` uses deep reactive proxy. When you pass a large time-series dataset through `ref`:

```javascript
// PROBLEMATIC — deep proxy overhead
const option = ref({ series: [{ data: largeArray }] })
```

Every mutation of `option.value.series[0].data` triggers:
1. Vue's dependency tracking (deep traversal of the object)
2. Re-render of the component
3. A NEW option object being passed to ECharts

For a 1-second refresh with hundreds of data points, this causes massive unnecessary reactivity overhead.

**`shallowRef` pattern (correct):**
```javascript
import { shallowRef } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'

use([CanvasRenderer, LineChart, GridComponent])

// Shallow ref — Vue only tracks .value assignment, not deep mutations
const option = shallowRef({
  xAxis: { type: 'category', data: [] },
  yAxis: { type: 'value' },
  series: [{ type: 'line', data: [] }]
})

// Update by REASSIGNING .value (this is what triggers Vue reactivity)
const updateData = (newData) => {
  option.value = {
    ...option.value,
    series: [{ data: newData }]
  }
}
```

**Why reassignment works and mutation does not:**
`shallowRef` only triggers updates when `.value` is reassigned (=== changes). Mutations to `option.value.series[0].data` do NOT trigger updates. This is correct because vue-echarts internally calls `chart.setOption()` on prop changes — it needs a new reference.

**vue-echarts `update-options` prop:**
```html
<v-chart
  class="chart"
  :option="option"
  autoresize
  :update-options="{ notMerge: false, lazyUpdate: true }"
/>
```

This prop maps directly to ECharts `setOption` opts. Use `lazyUpdate: true` (already the vue-echarts default as of 6.x) to batch updates.

**Lifecycle cleanup:**
```javascript
import { onMounted, onBeforeUnmount } from 'vue'

const chartRef = shallowRef(null)

onMounted(() => {
  // vue-echarts auto-inits via the option prop
})

onBeforeUnmount(() => {
  // vue-echarts handles disposal automatically when used as a component
  // But if using raw echarts.init():
  // chartInstance.value?.dispose()
})
```

Note: When using vue-echarts as a component (not raw `echarts.init`), disposal is handled automatically by the component's `onBeforeUnmount` hook. You only need manual disposal if you use `echarts.init` directly.

### Source
- Apache ECharts vue-echarts README — `update-options` prop documentation
- CSDN: "Vue-echarts 更改配置options没有触发视图更新问题" (2023-01) — `notMerge: true` workaround
- CSDN: "vue-echarts数据更新,图表不更新的解决方法" (2020-09) — `mergeOptions` approach

---

## 4. Performance Optimization: Large Datasets, requestAnimationFrame Throttling

### Verdict: Throttle at the data source level, not inside ECharts. Use `lazyUpdate` to let ECharts handle frame-batching.

**The 1-second refresh problem:**

At 1Hz update, the main bottleneck is not ECharts rendering (which is fast) but the data pipeline: fetching from API, transforming, and passing to Vue's reactivity system.

**Throttling with `requestAnimationFrame` + timestamp comparison:**

```javascript
import { shallowRef, onMounted, onBeforeUnmount } from 'vue'

const option = shallowRef({ /* ... */ })
let lastUpdateTime = 0
const UPDATE_INTERVAL = 1000 // 1 second
let rafId = null

const fetchAndUpdate = (timestamp) => {
  if (timestamp - lastUpdateTime >= UPDATE_INTERVAL) {
    lastUpdateTime = timestamp
    const newData = await fetchLatestData() // async fetch
    option.value = {
      ...option.value,
      series: [{ data: newData }]
    }
  }
  rafId = requestAnimationFrame(fetchAndUpdate)
}

onMounted(() => {
  rafId = requestAnimationFrame(fetchAndUpdate)
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
})
```

**Why `requestAnimationFrame` over `setInterval`:**
- `setInterval` fires regardless of browser tab visibility (wastes CPU in background tabs)
- `requestAnimationFrame` automatically pauses when the tab is hidden (Page Visibility API)
- `requestAnimationFrame` syncs with display refresh rate, reducing layout thrashing

**Data windowing for large time-series:**

For long-running dashboards, do NOT let the data array grow unboundedly. Use a fixed-size circular buffer:

```javascript
const MAX_DATA_POINTS = 60 // keep last 60 readings at 1Hz = 1 minute

const appendData = (newPoint) => {
  const current = option.value.series[0].data
  const updated = [...current, newPoint]
  if (updated.length > MAX_DATA_POINTS) {
    updated.shift() // remove oldest
  }
  option.value = {
    ...option.value,
    series: [{ data: updated }]
  }
}
```

**`lazyUpdate: true` — ECharts' internal frame batching:**

Setting `lazyUpdate: true` in `setOption` opts tells ECharts to defer the actual rendering to the next animation frame. Multiple rapid `setOption` calls within the same frame are batched into a single render. This is already the default in vue-echarts 6.x+ but explicitly setting it is good practice:

```javascript
chart.setOption(newOption, { lazyUpdate: true })
```

**large dataset optimization — sampling:**

If dataset exceeds ~10,000 points on a line chart, use ECharts' built-in `sampling` property:

```javascript
series: [{
  type: 'line',
  data: largeDataset,
  sampling: 'lttb' // Largest-Triangle-Three-Buckets downsampling algorithm
}]
```

This performs lossy downsampling on the client side before rendering, keeping visual fidelity while reducing render cost.

### Source
- Apache ECharts 5.4 release notes — confirm `lazyUpdate` default behavior
- CSDN: "vue使用echarts很卡 'requestAnimationFrame' handler took 64ms" (2023-01) — `lazyUpdate` fix for render exceeding 16.7ms budget
- Apache ECharts docs — `sampling: 'lttb'` for large dataset downsampling

---

## 5. Memory Leak Prevention in Long-Running Dashboards

### Verdict: Manual disposal + no unbounded data growth + proper lifecycle hooks.

**The three leak sources in ECharts + Vue 3 dashboards:**

1. **Orphaned chart instances** — `echarts.init()` creates a Canvas/DOM element attached to a container. If the Vue component unmounts but `dispose()` is never called, the canvas stays in memory with its event listeners and periodic render timers.

2. **Unbounded data arrays** — Accumulating data in reactive arrays without trimming causes heap growth proportional to uptime.

3. **Stale `requestAnimationFrame` callbacks** — After component unmount, pending RAF callbacks can still fire and attempt to update disposed chart instances.

**Disposal pattern (mandatory for raw `echarts.init`):**

```javascript
import { shallowRef, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'

const chartDom = shallowRef(null)
const chartInstance = shallowRef(null)

onMounted(() => {
  if (chartDom.value) {
    chartInstance.value = echarts.init(chartDom.value)
    chartInstance.value.setOption(initialOption)
  }
})

onBeforeUnmount(() => {
  if (chartInstance.value) {
    chartInstance.value.dispose()
    chartInstance.value = null
  }
})
```

**When using vue-echarts component:** disposal is automatic. Do NOT call `dispose()` manually on a vue-echarts component instance.

**Dispose on route change (if not using `keep-alive`):**

If your router does NOT use `keep-alive`, charts are destroyed and recreated on every navigation. Ensure the route guard or component `onBeforeUnmount` triggers disposal:

```javascript
// In the chart component — NOT needed if using keep-alive
onBeforeUnmount(() => {
  chartInstance.value?.dispose()
})
```

**Preventing leaks from `keep-alive` + data accumulation:**

When using `<keep-alive>`, components persist but their data may grow unboundedly. Use `activated`/`deactivated` lifecycle hooks to pause data fetching when the tab is hidden:

```javascript
import { onActivated, onDeactivated } from 'vue'

let rafId = null

onActivated(() => {
  rafId = requestAnimationFrame(fetchAndUpdate)
})

onDeactivated(() => {
  if (rafId) cancelAnimationFrame(rafId)
})
```

**Object.freeze for static chart config:**

Use `Object.freeze()` on static parts of the option (axes, grid, tooltip config) to prevent Vue from adding reactive getters/setters to deeply nested config objects:

```javascript
const staticConfig = Object.freeze({
  grid: { left: 10, right: 10, top: 60, bottom: 30 },
  xAxis: { type: 'time' },
  yAxis: { type: 'value' }
})

option.value = {
  ...staticConfig,
  series: [{ data: [] }]
}
```

**`echarts.getInstanceByDom` pattern — prevent double-init:**

When charts are inside `keep-alive` tabs, a second navigation to the same tab may try to re-initialize an already-initialized chart, causing memory leaks and the "chart instance already initialized" warning:

```javascript
onMounted(() => {
  let instance = echarts.getInstanceByDom(chartDom.value)
  if (!instance) {
    instance = echarts.init(chartDom.value)
  }
  chartInstance.value = instance
})
```

### Source
- Apache ECharts dispose() docs — confirms cleanup removes listeners and timers
- CSDN: "echarts实例的清空与销毁 chart.dispose()" (2023-04) — clear/dispose distinction
- CSDN: "解决echarts报There is a chart instance already initialized on the dom" (2022-10) — `getInstanceByDom` pattern
- Apache ECharts 5.x migration guide — confirm dispose behavior on component unmount

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `echarts.init(dom).setOption()` inside a `watch` with deep option cloning | Creates new option object every tick, triggering full chart diff and re-render | Use `shallowRef` + `.value` reassignment; pass only delta to `setOption` |
| `ref` for chart option objects with large data arrays | Deep proxy traversal on every update burns CPU at 1Hz | `shallowRef` — Vue tracks reference only, not deep content |
| `dispose()` + re-`init()` on every data update | Destroys all chart state (zoom, legend selection, tooltips); causes flicker; GC pressure | Reuse instance, call `setOption` only |
| `setInterval` for polling | Runs in background tabs; wastes resources; not synced to display refresh | `requestAnimationFrame` with timestamp check |
| `appendData` for time-series | Only works with WebGL scatter/geo large-data pagination; does not update axes or merge series config | `setOption` with `lazyUpdate: true` |
| `markRaw` + `ref` for chart instance | The `ref` still proxies the markRaw object; `resize` errors still occur | Use `shallowRef` for the instance directly |

---

## Installation

```bash
# Core
npm install echarts@5.5.0
npm install vue-echarts@7.0.0

# Tree-shakeable imports (recommended for bundle size)
npm install echarts@5.5.0
npm install vue-echarts@7.0.0
```

**Tree-shakeable setup for echarts (reduces bundle by ~60%):**
```javascript
// In your echarts component
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent
} from 'echarts/components'

use([CanvasRenderer, LineChart, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent])
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| ECharts 5.x | D3.js | D3 gives lower-level control but requires 5-10x more code for equivalent charts; ECharts is the right choice for a dashboard |
| vue-echarts (component) | Raw `echarts.init` + manual lifecycle | Raw init gives more control but introduces dispose/resize boilerplate; vue-echarts is correct for 95% of use cases |
| `shallowRef` for option | `ref` + `deep: false` watch | `deep: false` watch still receives old + new value as proxied objects; `shallowRef` with reassignment is cleaner |
| `requestAnimationFrame` throttling | `setTimeout(fn, 1000)` | `setTimeout` drifts over time; RAF is frame-synced and tab-aware |

---

## Stack Patterns by Variant

**If rendering > 50,000 data points on a geo/scatter chart:**
- Use `appendData` + WebGL renderer
- Use `Float32Array` for data encoding
- Because: `setOption` cannot handle this data volume without blocking the main thread

**If using `keep-alive` on dashboard routes:**
- Use `onActivated`/`onDeactivated` to start/stop the RAF update loop
- Use `echarts.getInstanceByDom` to avoid double-init
- Because: component persists across route changes; need to pause/resume data fetching

**If chart has zoom/brush interactions:**
- Always use `notMerge: false` on `setOption` calls
- Because: `notMerge: true` resets all interaction state (zoom range, brush selection)

**If tooltip flickers on rapid updates:**
- Set `tooltip.transitionDuration: 0`
- Because: ECharts default tooltip fade animation conflicts with 1Hz data updates

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| echarts@5.5.0 | vue-echarts@7.x | Fully compatible. vue-echarts 7.x uses echarts 5.5 by default |
| vue-echarts@7.0.0 | Vue 3.3+ | Uses `shallowRef` internally; requires Vue 3.3+ for best performance |
| echarts@5.x | Vue 3 (Composition API) | Fully compatible; use `markRaw` or `shallowRef` for instance storage |

---

## Sources

- Apache ECharts official docs — `setOption` signature, `lazyUpdate`, `appendData` behavior, `sampling` property
- Apache ECharts 5.4 release notes — confirm feature additions
- Apache ECharts 5.2 release notes — confirm global transition animation (not directly relevant but verifies 5.x evolution)
- Apache ECharts vue-echarts README — `update-options` prop, auto-dispose behavior
- CSDN: "Vue-echarts 更改配置options没有触发视图更新问题解决" (2023-01) — `notMerge: true` solution
- CSDN: "echarts vue element-ui 实现切换选择项年月日时间折线图数据动态展示" (2026-04) — real-time chart pattern
- CSDN: "echarts大数据量的分批加载appendData" (2025-12) — confirms `appendData` scope limitations
- CSDN: "记录-vue3使用echarts实时更新" (2023-07) — `markRaw` fix for proxy conflict
- 博客园: "踩坑日记--vue3中echarts图表点击legend切换时频繁报错" (2023-07) — proxy causing `Cannot read properties of undefined (reading 'type')`
- CSDN: "echarts初次加载完成浏览器抖动防抖动" (2020-09) — `transitionDuration: 0` fix
- CSDN: "vue使用echarts很卡 'requestAnimationFrame' handler took 64ms" (2023-01) — `lazyUpdate` fix for render budget
- CSDN: "echarts实例的清空与销毁 chart.dispose()" (2023-04) — clear vs dispose
- CSDN: "解决echarts报There is a chart instance already initialized on the dom" (2022-10) — `getInstanceByDom` pattern
- Apache ECharts 5.x migration guide — dispose and lifecycle behavior

---
*Stack research for: Real-time monitoring dashboard (Vue 3 + ECharts 5.x)*
*Researched: 2026-04-21*
