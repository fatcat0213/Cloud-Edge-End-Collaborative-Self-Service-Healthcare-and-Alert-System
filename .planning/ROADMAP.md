# Roadmap - Visualization Enhancement

**Version:** 1.2
**Date:** 2026-04-21
**Phases:** 3
**Requirements:** 17 + 6 new = TBD

---

## Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Real-time Visualization | 全局1秒刷新、无闪烁，新图表 | REAL-01~04, HEAT-01~04, SANKEY-01~03 | 6 |
| 2 | CloudSide Enhancement | 运维日志、命令历史重构、告警增强 | OPS-01~03, CMD-01~03, ALERT-01~03 | TBD |
| 3 | Persistence | 运维日志持久化 + 数据持久化 | PERSIST-01~06 | TBD |

---

## Phase 1: Real-time Visualization

**Goal:** 实现全局1秒刷新、无闪烁更新、热力图、桑基图

### Requirements Mapped

| ID | Requirement |
|----|-------------|
| REAL-01 | 全局数据轮询 1秒间隔 |
| REAL-02 | 无闪烁更新 (shallowRef + 增量setOption) |
| REAL-03 | 流畅更新 (RAF限速 + 60点窗口) |
| REAL-04 | 内存管理 (onBeforeUnmount dispose) |
| HEAT-01 | 24h×7天热力图 |
| HEAT-02 | 色盲友好配色 |
| HEAT-03 | 点击钻取 |
| HEAT-04 | Hover高亮 |
| SANKEY-01 | 挂号→支付→医保流转 |
| SANKEY-02 | 动态更新 |
| SANKEY-03 | 节点样式 |

### Success Criteria

1. 所有页面数据每1秒刷新
2. 无视觉闪烁或卡顿
3. 热力图正确显示24h×7天故障分布
4. 桑基图正确展示业务流转
5. 内存无泄漏（长时间运行稳定）

### Canonical Refs

- `frontend/src/stores/*.js` — Pinia stores (数据源)
- `frontend/src/views/*.vue` — Views (使用图表)
- `frontend/node_modules/vue-echarts` — ECharts wrapper
- `.planning/research/STACK.md` — ECharts实时更新模式
- `.planning/research/FEATURES.md` — 热力图/桑基图实现

---

## Phase 2: CloudSide Enhancement

**Goal:** 增强 CloudSideView 现有 Tab 的内容设计

### Requirements

| ID | Requirement |
|----|-------------|
| OPS-01 | 运维处置 Tab 改为运维日志，全量操作审计 |
| OPS-02 | 运维日志记录：命令下发、场景注入、终端恢复、系统重置 |
| OPS-03 | 日志包含时间戳、操作员、操作类型、目标终端、状态 |
| CMD-01 | 移除指令记录 Tab 的终端状态明细，改为纯命令历史 |
| CMD-02 | 命令下发状态实时跟踪（发送中→已送达→执行中→完成/失败） |
| CMD-03 | 命令历史增加时间范围/类型/终端快速筛选 |
| ALERT-01 | 告警中心新增告警趋势折线图（P0/P1/P2分色） |
| ALERT-02 | 告警中心新增告警分布图（按终端或按类型） |
| ALERT-03 | 告警中心新增批量确认/批量解决功能 |

### Success Criteria

1. 运维日志 Tab 正确记录所有操作类型
2. 指令记录 Tab 只展示命令历史，无终端明细
3. 告警中心有趋势图和分布图
4. 批量操作正常运作
5. 命令下发有状态流转展示

### Canonical Refs

- `frontend/src/views/CloudSideView.vue` — 主视图
- `frontend/src/stores/cloudSide.js` — commands 数据
- `frontend/src/stores/alerts.js` — 告警数据

---

## Phase 3: Persistence

**Goal:** 运维日志持久化 + 数据持久化，确保页面刷新后日志不丢失

### Requirements

| ID | Requirement |
|----|-------------|
| PERSIST-01 | 运维日志写入后端持久化存储（Redis 或 MySQL） |
| PERSIST-02 | 页面刷新后运维日志完整保留 |
| PERSIST-03 | 命令下发记录持久化（包含完整状态流转） |
| PERSIST-04 | 告警确认/解决操作持久化 |
| PERSIST-05 | 持久化数据支持时间范围查询 |
| PERSIST-06 | 持久化层对前端透明（API 接口不变） |

### Success Criteria

1. 注入场景后刷新页面，运维日志仍然存在
2. 命令历史在页面刷新后保留
3. 告警状态（确认/解决）在页面刷新后保留
4. 支持按时间范围查询运维日志
5. 前端无需感知持久化实现细节

### Canonical Refs

- `frontend/src/stores/cloudSide.js` — opsLog 数据
- `frontend/src/stores/edgeNodeStore.js` — commands 数据
- `frontend/src/stores/alerts.js` — alerts 数据
- `cloud-gateway/src/main/java/com/yunbd/gateway/` — API Gateway
- `edge-service/src/main/java/com/yunbd/edge/` — Edge Service

### Plans

**Plans:** 3 plans in 2 waves

Plans:
- [x] 03-01-PLAN.md — OpsLogStore (Redis) + OpsLogController (GET/POST /opslog)
- [x] 03-02-PLAN.md — Extend CommandService with Redis persistence
- [x] 03-03-PLAN.md — Wire frontend stores to new backend APIs

Wave structure:
- Wave 1 (parallel): 03-01 (OpsLog Redis) + 03-02 (CommandService Redis)
- Wave 2: 03-03 (Frontend wiring) — COMPLETE

---

## Out of Scope

- WebSocket替换轮询
- 移动端
- 预测性分析

---

*Generated: 2026-04-21*
*Updated: 2026-04-22 — Phase 3 plans added (3 plans, 2 waves)*