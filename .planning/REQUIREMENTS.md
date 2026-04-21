# Requirements - Visualization Enhancement

**Version:** 1.0
**Date:** 2026-04-21
**Status:** Active

---

## v1 Requirements

### REAL-TIME DATA (实时数据优化)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REAL-01 | 全局数据轮询 1秒间隔 | 所有页面数据每1秒刷新一次 |
| REAL-02 | 无闪烁更新 | 使用 shallowRef + 增量 setOption，无 dispose/reinit |
| REAL-03 | 流畅更新 | RAF时间戳限速，循环数据窗口(最大60点) |
| REAL-04 | 内存管理 | onBeforeUnmount 调用 chart.dispose() |

### HEATMAP (热力图)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| HEAT-01 | 终端故障频率分布 | 24h×7天矩阵，每单元格显示故障数 |
| HEAT-02 | 色盲友好配色 | 蓝-黄-红渐变，避免纯红-绿 |
| HEAT-03 | 点击钻取 | 点击单元格显示该时段详细告警列表 |
| HEAT-04 | Hover 高亮 | emphasis.itemStyle + tooltip 显示终端ID |

### SANKEY (桑基图)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| SANKEY-01 | 业务流转可视化 | 展示 挂号→支付→医保 完整路径 |
| SANKEY-02 | 动态更新 | 数据变化时渐变过渡 |
| SANKEY-03 | 节点样式 | 显示各阶段总数，渐变流向连接 |

---

## v2 (Deferred)

- WebSocket 替换轮询（当前轮询够用）
- 预测性告警分析
- 多维度钻取（按科室、按终端型号）

---

## Out of Scope

- 移动端界面
- 离线模式
- 数据导出功能

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REAL-01 | 1 | Planned |
| REAL-02 | 1 | Planned |
| REAL-03 | 1 | Planned |
| REAL-04 | 1 | Planned |
| HEAT-01 | 1 | Planned |
| HEAT-02 | 1 | Planned |
| HEAT-03 | 1 | Planned |
| HEAT-04 | 1 | Planned |
| SANKEY-01 | 1 | Planned |
| SANKEY-02 | 1 | Planned |
| SANKEY-03 | 1 | Planned |

---

*Generated: 2026-04-21*
