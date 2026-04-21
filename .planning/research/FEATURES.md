# FEATURES: Heatmap & Sankey Diagram Patterns for Medical Monitoring Dashboards

## 1. Heatmap: Terminal Fault Frequency Distribution

### Time-Based vs Category-Based Heatmap

| Dimension | Best For |
|---|---|
| **Time-based** (hour x day matrix) | Spotting shift patterns, peak failure hours, cyclical anomalies |
| **Category-based** (terminal x fault type) | Identifying which terminals fail most, which fault categories dominate |
| **Hybrid** (hour x terminal) | Correlating time-of-day with specific terminal behavior |

For a 20-terminal medical kiosk system, a **time-based heatmap** (24h x 7 days) is the primary view -- operators need to see if failures cluster during peak hours. A secondary category view (terminal ID x fault type) helps identify chronic hardware issues.

### ECharts Heatmap Implementation

```javascript
// Data format: [[x, y, value], ...] where x=hour(0-23), y=day(0-6), value=fault count
const faultData = [
  [9, 1, 5],   // Monday 9am: 5 faults
  [14, 3, 12], // Wednesday 2pm: 12 faults
  // ...
];

option = {
  tooltip: {
    position: 'top',
    formatter: (p) => `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][p.data[1]]} ${p.data[0]}:00<br/>Faults: <b>${p.data[2]}</b>`
  },
  visualMap: {
    min: 0,
    max: 15,
    calculable: true,
    orient: 'horizontal',
    left: 'center',
    bottom: 20,
    inRange: {
      color: ['#50a3ba', '#eac736', '#d94e5d']  // cool → warm gradient
      // Medical context: use accessible palette (avoid red-green confusion)
    }
  },
  xAxis: { type: 'category', data: hoursArray(0,23), name: 'Hour' },
  yAxis: { type: 'category', data: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], name: 'Day' },
  series: [{
    type: 'heatmap',
    data: faultData,
    itemStyle: { borderRadius: 3, borderWidth: 1, borderColor: '#fff' },
    emphasis: {
      itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' }
    }
  }]
};
```

### Color Gradient Strategy (Medical Context)

- **Avoid pure red-green gradients** -- ~8% of males are colorblind
- Recommended: sequential blue-yellow-red (`#313695 → #74add1 → #fdae61 → #f46d43 → #d73027`)
- ECharts `visualMap.inRange.color` accepts hex arrays
- For critical alerts: use a diverging palette centered on expected baseline

### Interactive Features

| Feature | Implementation |
|---|---|
| **Drill-down on click** | `tooltip.formatter` shows summary; click cell → filter detail panel below heatmap showing individual alert list for that time slot |
| **Zoom/pan** | ECharts `dataZoom` component on x-axis (time range selection) |
| **Threshold highlighting** | Use `markArea` to overlay critical threshold bands |
| **Cell hover detail** | `emphasis.itemStyle` with shadow + tooltip showing terminal IDs affected |
| **Time range filter** | Wire a date-range picker to re-fetch and `setOption` with filtered data |

### Best Practices for Medical/Industrial Monitoring

1. **Consistent color scale** -- always map same value to same color across sessions
2. **Log scale option** for fault counts (some hours may have 100x more faults)
3. **Empty state handling** -- gray out cells with no data, don't hide the axis
4. **Accessibility** -- provide alternative table view for screen readers; ensure 4.5:1 contrast ratio
5. **Real-time updates** -- use `setInterval` polling with `chart.setOption(newData, { notMerge: true })` to replace without merging

---

## 2. Sankey Diagram: Business Flow (Registration → Payment → Insurance)

### ECharts Sankey Implementation

```javascript
option = {
  tooltip: {
    trigger: 'item',
    triggerOn: 'mousemove',
    formatter: (params) => {
      if (params.dataType === 'edge') {
        return `${params.data.source} → ${params.data.target}<br/>Patients: <b>${params.data.value}</b>`;
      }
      return params.marker + params.data.name + `<br/>Total: <b>${params.data.value}</b>`;
    }
  },
  series: [{
    type: 'sankey',
    layout: 'none',  // use 'none' for deterministic positioning, or omit for force layout
    nodeAlign: 'left',
    focusNodeAdjacency: 'allEdges',  // highlight connected edges on hover
    data: [
      { name: 'Registration', itemStyle: { color: '#5470c6' } },
      { name: 'Payment Queued', itemStyle: { color: '#91cc75' } },
      { name: 'Payment Done', itemStyle: { color: '#73c0de' } },
      { name: 'Insurance Check', itemStyle: { color: '#fac858' } },
      { name: 'Approved', itemStyle: { color: '#73c0de' } },
      { name: 'Rejected', itemStyle: { color: '#ee6666' } }
    ],
    links: [
      { source: 'Registration', target: 'Payment Queued', value: 320 },
      { source: 'Payment Queued', target: 'Payment Done', value: 290 },
      { source: 'Payment Queued', target: 'Registration', value: 30 },  // retry/abort
      { source: 'Payment Done', target: 'Insurance Check', value: 270 },
      { source: 'Insurance Check', target: 'Approved', value: 250 },
      { source: 'Insurance Check', target: 'Rejected', value: 20 },
      { source: 'Insurance Check', target: 'Payment Done', value: 10 }  // escalation
    ],
    lineStyle: {
      normal: {
        color: 'source',    // gradient from source node color
        curveness: 0.3,     // slight curve for readability
        opacity: 0.6
      }
    },
    itemStyle: { borderWidth: 1, borderColor: '#fff' },
    label: { position: 'right', formatter: '{b}: {c}' },
    emphasis: { focusNodeAdjacency: 'allEdges' }
  }]
};
```

### Node/Link Styling for Clarity

- **Node width** is proportional to value by default; use `nodeWidth` to control base width
- **Node color** should encode stage type (e.g., blue=entry, green=success, red=failure)
- **Link color**: `color: 'source'` creates gradient flows; `color: 'target'` reverses gradient
- **Curveness** 0.2–0.4 works well for ~5 stage flows; higher values for wider layouts
- **Dropoff visualization**: wide source → narrow target visually communicates abandonment

### Dynamic Updating of Sankey Diagrams

```javascript
// Update pattern for real-time flow data
function updateSankey(newData) {
  chart.setOption({
    series: [{
      data: newData.nodes,
      links: newData.links
    }]
  }, { notMerge: false });  // false=merge with existing for smooth transition
}

// For major data shifts (e.g., new business hours), use notMerge: true to prevent artifacts
// Animate transitions: enable with animation: true (default) and tune animationDuration
```

### Visualizing Patient Journey

- **Horizontal flow** (left → right) is standard for funnel/journey: Registration → Payment → Insurance → Complete
- **Vertical stacking** for parallel paths (e.g., express lane vs standard lane)
- **Self-loops** (source === target) visualize retry behavior
- **Node tooltips** show aggregate stats; **edge tooltips** show transition counts

---

## 3. Table Stakes vs Differentiators (2025–2026)

### Table Stakes (Expected Baseline)

| Feature | Description |
|---|---|
| Real-time data refresh | WebSocket or polling, ≤5s latency for alerts |
| Responsive layout | Works on large wall display and tablet |
| Role-based views | Operator vs admin vs viewer permission levels |
| Basic filtering | Date range, terminal/status filters |
| Alert table | Sortable, filterable list of active alerts |
| Status cards | Terminal count, active alerts, queue depth |
| Dark mode | Reduces eye strain in 24/7 ops rooms |

### Differentiators (Premium Feel)

| Feature | Why It Stands Out |
|---|---|
| **Anomaly highlighting** | ML-detected anomalies get visual callout (glow border, pulsing icon) rather than blending into the grid |
| **Predictive alerts** | "Terminal 7 likely to fail in next 2h" -- turns reactive ops into proactive |
| **Animated transitions** | Smooth number count-up on KPI cards; transitions between views feel polished, not jarring |
| **Contextual drill-down** | Click any chart element → side panel with related data, not a new page |
| **Cross-view correlation** | Selecting a terminal highlights it across heatmap + sankey + table simultaneously |
| **Audit trail panel** | Expandable timeline of state changes for any entity |
| **Quiet hours mode** | Suppress non-critical alerts during defined quiet periods |
| **Customizable layouts** | Drag-and-drop widget arrangement per user preference |
| **Micro-animations** | Subtle pulse on new alerts, slide-in for new table rows -- signals liveness without being distracting |

### What Makes a Monitoring Dashboard Feel "Premium"

1. **Instant feedback** -- every click, hover, filter responds in <100ms; no spinner for local interactions
2. **Information hierarchy** -- the most critical data (active alerts, queue depth) dominates visually; secondary info recedes
3. **Motion with purpose** -- animation communicates state change, not decoration; avoid gratuitous transitions
4. **Consistent visual language** -- same color means same status everywhere (green = healthy, always)
5. **Thoughtful empty states** -- "No alerts -- all systems operational" with a subtle checkmark icon beats a blank box
6. **Progressive disclosure** -- summary first, detail on demand; never overwhelm with raw data upfront
7. **Accessible by default** -- WCAG 2.1 AA compliance, keyboard navigation, screen reader labels on all interactive elements

---

## Implementation Notes for YunBD Kiosk Project

- **Heatmap component** should live in `TerminalsView.vue` as a tab alongside the existing table/list view
- **Sankey diagram** belongs in `CloudSideView.vue` or a new "Business Flow" tab showing registration → payment → insurance throughput
- Both charts share the same `visualMap` palette approach for color consistency
- Use `chart.setOption(newData, { notMerge: true })` for full data reloads and `{ notMerge: false }` for incremental updates
- Ensure both components handle the loading and error states gracefully
