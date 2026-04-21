# Roadmap - Visualization Enhancement

**Version:** 1.0
**Date:** 2026-04-21
**Phases:** 1
**Requirements:** 11

---

## Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Real-time Visualization | 全局1秒刷新、无闪烁、新图表 | REAL-01~04, HEAT-01~04, SANKEY-01~03 | 6 |

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

## Out of Scope

- WebSocket替换轮询
- 移动端
- 预测性分析

---

*Generated: 2026-04-21*
