# 云边端就医自助终端监测预警系统 - 可视化增强

## What This Is

面向医疗机构自助终端的云边端一体化监测预警平台，实现20台自助终端的实时监控、故障告警与远程指令下发。本次迭代聚焦**可视化增强**：提升实时数据更新体验，新增热力图和桑基图。

## Core Value

**实时监控数据的流畅可视化** — 1秒刷新、无闪烁、无卡顿，让运维人员随时掌握系统健康状态。

## Requirements

### Validated

- ✓ 终端心跳监控（20台，MQTT协议）— 现有
- ✓ P0/P1/P2三级告警（Drools规则引擎）— 现有
- ✓ 云边协同大屏（4标签页：概览/业务流/运维/命令）— 现有
- ✓ 终端详情抽屉组件 — 现有
- ✓ 队列监控独立Tab — 现有
- ✓ ECharts 5.5.0 图表库 — 现有

### Active

- [ ] 全局实时数据管道优化 — 1秒刷新、无闪烁、无卡顿
- [ ] 热力图组件 — 终端故障频率分布（按时间段/科室）
- [ ] 桑基图组件 — 挂号→支付→医保业务流转

### Out of Scope

- 移动端/远程推送通知 — 独立功能
- 预测性维护/AI分析 — 需要更多数据积累
- 前端架构重构 — 当前结构足够支撑

## Context

**技术栈：** Vue 3 + Element Plus + Pinia + ECharts 5.5.0 + vue-echarts 7.0.0

**现有数据流：**
- 终端每5秒上报心跳 → MQTT → Edge Service → Redis
- 前端通过轮询获取数据（当前间隔未优化）
- ECharts图表直接绑定响应式数据

**已知问题：**
- 现有刷新间隔较长（未确认具体值）
- 可能存在数据更新时的闪烁/卡顿
- 需要确认当前轮询机制

**代码库状态：**
- 棕地项目，已有完整监控系统
- 前端使用 Vite 5.2.0 + Vue 3.4.0
- Pinia stores: `alerts.js`, `terminals.js`, `stats.js`, `cloudSide.js`, `edgeSide.js`, `terminalSide.js`
- 视图: `CloudSideView.vue`, `EdgeSideView.vue`, `TerminalSideView.vue`, `AlertsView.vue`, `TerminalsView.vue`

## Constraints

- **技术栈**: Vue 3 + ECharts 5.5.0 + Pinia — 不更换核心框架
- **性能**: 前端资源有限，需避免过度重绘
- **兼容性**: 需兼容现有浏览器（Element Plus支持范围）

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 1秒刷新间隔 | 用户明确需求，平衡实时性与性能 | — Pending |
| 无闪烁更新 | 使用 ECharts 渐进式更新 + 缓存机制 | — Pending |
| 热力图用于故障分布 | 用户选定方向 | — Pending |
| 桑基图用于业务流转 | 用户选定方向（挂号→支付→医保） | — Pending |

---

*Last updated: 2026-04-21 after initialization*
