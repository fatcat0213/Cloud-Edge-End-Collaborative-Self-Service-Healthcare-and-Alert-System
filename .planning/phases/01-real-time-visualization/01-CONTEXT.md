# Phase 1: Real-time Visualization - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

**范围：** 仅改造 CloudSideView 的可视化
- 热力图 + 桑基图 → 嵌入 CloudSide 概览 Tab
- 队列监控 Tab 重新设计
- 其他 Tab 不动

**删除内容：**
- 概览 Tab：删除云边端消息流转图
- 实时业务流 Tab：整页删除
- 运维处置 Tab：删除云端下发指令、变短上报事件
- 命令管理 Tab：保留

</domain>

<decisions>
## Implementation Decisions

### REAL-01: 轮询统一 1秒
- alerts store: 5000ms → 1000ms
- terminals store: 5000ms → 1000ms
- stats store: 10000ms → 1000ms

### REAL-02: 告警历史窗口
- 保留最近 60 条告警
- 超出时丢弃最旧的

### HEAT-01: 热力图位置
- 嵌入 CloudSide 概览 Tab
- 显示 24h×7天 终端故障频率分布

### HEAT-02: 热力图配色
- 蓝-黄-红渐变（色盲友好）
- 具体色值：#313695 → #74add1 → #fdae61 → #f46d43 → #d73027

### HEAT-03: 热力图交互
- 点击单元格 → 显示该时段详细告警列表
- Hover → emphasis 高亮 + tooltip 显示终端ID

### SANKEY-01: 桑基图位置
- 嵌入 CloudSide 概览 Tab（热力图旁边或下方）

### SANKEY-02: 桑基图数据
- 节点：挂号、支付、医保
- 链接：患者在三个阶段间的流转数量

### SANKEY-03: 桑基图样式
- 渐变流向连接
- 节点显示各阶段总数

### QUEUE-01: 队列监控重新设计
- 当前设计太简略，需要更丰富的数据展示
- 待具体设计（可参考 research/FEATURES.md 的最佳实践）

### DELETE-01: 删除内容
- 概览 Tab：云边端消息流转图
- 实时业务流 Tab：整页删除
- 运维处置 Tab：云端下发指令、变短上报事件

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Frontend (改造目标)
- `frontend/src/views/CloudSideView.vue` — CloudSide 主视图
- `frontend/src/stores/alerts.js` — alerts store (轮询改为1s)
- `frontend/src/stores/terminals.js` — terminals store (轮询改为1s)
- `frontend/src/stores/stats.js` — stats store (轮询改为1s)

### Research (参考)
- `.planning/research/STACK.md` — ECharts实时更新模式
- `.planning/research/FEATURES.md` — 热力图/桑基图实现
- `.planning/research/PITFALLS.md` — 已知问题和预防

### API (数据流)
- `frontend/src/api/index.js` — API 端点定义

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `vue-echarts` — ECharts Vue绑定，已在项目中使用
- ECharts 5.5.0 — 支持 heatmap, sankey
- Pinia stores — 已有轮询机制

### Established Patterns
- `startPolling(interval)` / `stopPolling()` — store已有
- `setInterval` — 当前轮询实现方式

### Integration Points
- CloudSideView 已有4个tab结构
- 概览Tab目前有云边端消息流转图（要删除）
- 队列监控Tab独立存在（要重新设计）

</code_context>

<deferred>
## Deferred Ideas

- 队列监控详细设计 — 待具体规划
- 其他页面的实时数据优化 — Phase 1 专注 CloudSide

</deferred>

---

*Phase: 01-real-time-visualization*
*Context gathered: 2026-04-21*
