# Phase 1: Real-time Visualization - Plans

**Phase:** 1
**Wave:** 1
**Objective:** CloudSide可视化增强 + 实时数据优化

---

## Plan 1: Store轮询优化

**Requirements:** REAL-01, REAL-02, REAL-03
**Files modified:**
- `frontend/src/stores/alerts.js`
- `frontend/src/stores/terminals.js`
- `frontend/src/stores/stats.js`

### Tasks

#### Task 1.1: alerts store 改为 1s 轮询 + 60条窗口

<read_first>
- `frontend/src/stores/alerts.js` — 当前实现
- `.planning/research/STACK.md` — shallowRef模式
- `.planning/research/PITFALLS.md` — Pitfall 5 (数据窗口)
</read_first>

<action>
1. 修改 `startPolling(interval = 5000)` → `startPolling(interval = 1000)`
2. 在 `alerts` ref 之前添加 `shallowRef` 导入（如果尚未使用）
3. 添加数据窗口逻辑：`alerts.value = (normalizedAlerts.slice(-60))` — 超出60条时丢弃最旧的
4. 确保 `fetchAlerts` 使用 `replaceMerge: false` 或直接赋值

**修改位置：**
- 第121行附近：`startPolling(interval = 5000)` → `startPolling(interval = 1000)`
- 第69行附近：`alerts.value = normalizeAlertsPayload(res?.data)` → `alerts.value = normalizeAlertsPayload(res?.data).slice(-60)`
</action>

<acceptance_criteria>
- `alerts.js` 第121行：`startPolling(interval = 1000)`
- `alerts.js` 第69行包含 `.slice(-60)`
- `terminals.js` 第313行：`startPolling(interval = 1000)`
- `stats.js` 第28行：`startPolling(interval = 1000)`
</acceptance_criteria>

---

#### Task 1.2: terminals store 改为 1s 轮询

<read_first>
- `frontend/src/stores/terminals.js` — 当前实现
</read_first>

<action>
修改 `startPolling` 函数中的默认间隔：
- 第311行：`startPolling(interval = 5000)` → `startPolling(interval = 1000)`
</action>

<acceptance_criteria>
- `terminals.js` 第311行：`startPolling(interval = 1000)`
</acceptance_criteria>

---

#### Task 1.3: stats store 改为 1s 轮询

<read_first>
- `frontend/src/stores/stats.js` — 当前实现
</read_first>

<action>
修改 `startPolling` 函数中的默认间隔：
- 第28行：`startPolling(interval = 10000)` → `startPolling(interval = 1000)`
</action>

<acceptance_criteria>
- `stats.js` 第28行：`startPolling(interval = 1000)`
</acceptance_criteria>

---

## Plan 2: CloudSide概览页改造

**Requirements:** HEAT-01, HEAT-02, HEAT-03, SANKEY-01, SANKEY-02, SANKEY-03, DELETE-01
**Files modified:**
- `frontend/src/views/CloudSideView.vue`

### Tasks

#### Task 2.1: 删除云边端消息流转图

<read_first>
- `frontend/src/views/CloudSideView.vue` — 当前实现
</read_first>

<action>
在 CloudSideView.vue 中找到云边端消息流转图组件（可能是 `<FlowDiagram>` 或类似组件），删除相关引用和导入。
</action>

<acceptance_criteria>
- CloudSideView.vue 中不包含 `FlowDiagram` 或 `cloud-side-flow` 相关代码
</acceptance_criteria>

---

#### Task 2.2: 添加热力图组件

<read_first>
- `frontend/src/views/CloudSideView.vue` — 概览Tab结构
- `.planning/research/FEATURES.md` — 热力图实现
</read_first>

<action>
在概览Tab中添加 ECharts 热力图组件：
1. 导入 `use` from 'echarts/core'
2. 导入 `heatmap` chart type
3. 添加热力图 option：
   - 数据格式：`[[hour, day, value], ...]` — 24h×7天
   - visualMap: 蓝-黄-红渐变 `['#313695', '#74add1', '#fdae61', '#f46d43', '#d73027']`
   - tooltip: 显示 "周X HH:00 故障: N"
4. 点击单元格 → 调用 showDetail(hour, day) 显示该时段告警
5. 使用 `chart.setOption(data, { lazyUpdate: true })` 更新
</action>

<acceptance_criteria>
- CloudSideView.vue 包含 `heatmap` 导入
- 热力图使用蓝-黄-红渐变配色
- 点击单元格有响应
</acceptance_criteria>

---

#### Task 2.3: 添加桑基图组件

<read_first>
- `frontend/src/views/CloudSideView.vue` — 概览Tab结构
- `.planning/research/FEATURES.md` — 桑基图实现
</read_first>

<action>
在概览Tab中添加 ECharts 桑基图组件：
1. 导入 `sankey` chart type
2. 节点数据：`[{name: '挂号'}, {name: '支付'}, {name: '医保'}]`
3. 链接数据：`[{source: '挂号', target: '支付', value: N}, {source: '支付', target: '医保', value: M}]`
4. 使用渐变流向样式 `curveness: 0.3`
5. 数据从 stats store 或新增 API 获取
</action>

<acceptance_criteria>
- CloudSideView.vue 包含 `sankey` 导入
- 桑基图有3个节点：挂号、支付、医保
- 桑基图有流转链接
</acceptance_criteria>

---

## Plan 3: 删除实时业务流Tab

**Requirements:** DELETE-01
**Files modified:**
- `frontend/src/views/CloudSideView.vue`
- `frontend/src/router/index.js` (如果路由相关)

### Tasks

#### Task 3.1: 删除实时业务流Tab

<read_first>
- `frontend/src/views/CloudSideView.vue` — Tab定义
- `frontend/src/router/index.js` — 路由定义
</read_first>

<action>
1. 在 CloudSideView.vue 中找到实时业务流Tab（el-tab 或类似）
2. 删除整个 Tab 及其内容
3. 如果 router 中有单独路由，也删除
</action>

<acceptance_criteria>
- CloudSideView.vue 中不包含"实时业务流"相关文字
- router 中不包含相关路由
</acceptance_criteria>

---

## Plan 4: 运维Tab内容删除

**Requirements:** DELETE-01
**Files modified:**
- `frontend/src/views/CloudSideView.vue`

### Tasks

#### Task 4.1: 删除云端下发指令和变短上报事件

<read_first>
- `frontend/src/views/CloudSideView.vue` — 运维Tab
</read_first>

<action>
在运维Tab中找到以下内容并删除：
1. 云端下发指令相关组件/文字
2. 变短上报事件相关组件/文字

保留：命令管理相关内容
</action>

<acceptance_criteria>
- 运维Tab中不包含"云端下发指令"
- 运维Tab中不包含"变短上报"
</acceptance_criteria>

---

## Plan 5: 队列监控Tab重新设计

**Requirements:** QUEUE-01
**Files modified:**
- `frontend/src/views/CloudSideView.vue` — 队列监控Tab内容

### Tasks

#### Task 5.1: 重新设计队列监控Tab

<read_first>
- `frontend/src/views/CloudSideView.vue` — 队列监控Tab
- `frontend/src/stores/` — 现有 stores
</read_first>

<action>
重新设计队列监控Tab使其更丰富：
1. 添加队列深度图表（柱状图或折线图）
2. 添加平均等待时间指标卡
3. 添加各科室队列对比
4. 添加实时更新的数据展示

参考 research/FEATURES.md 中的监控大屏最佳实践。
</action>

<acceptance_criteria>
- 队列监控Tab有图表展示
- 队列监控Tab有指标卡
- 数据每1秒更新
</acceptance_criteria>

---

## Verification

1. 所有页面数据每1秒刷新
2. 热力图正确显示24h×7天故障分布
3. 桑基图展示挂号→支付→医保流转
4. 删除的内容已移除
5. 队列监控Tab有实质内容

---

## must_haves

- alerts/terminals/stats 三个store统一1s轮询
- 热力图嵌入CloudSide概览
- 桑基图嵌入CloudSide概览
- 实时业务流Tab删除
- 队列监控Tab有实质内容（非简略）

---

*Plan created: 2026-04-21*
