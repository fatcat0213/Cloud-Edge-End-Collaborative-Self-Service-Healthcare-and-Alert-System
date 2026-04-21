# Research Summary

**Date:** 2026-04-21
**Focus:** Real-time data visualization enhancement + Heatmap + Sankey diagram

---

## Key Findings

### Stack (ECharts 实时可视化)
- **setOption + lazyUpdate: true** — 1Hz流数据首选，批量到下一动画帧
- **防止闪烁** — 重用实例，增量setOption，不用dispose/reinit
- **shallowRef** — 存储chart option避免Vue深度代理开销
- **RAF时间戳限速** — Tab感知，与显示器同步
- **循环数据窗口** — 最大60个数据点(1分钟@1Hz)
- **内存泄漏防护** — onBeforeUnmount必须dispose()

### Features (热力图 & 桑基图)
- **热力图** — 24h×7天矩阵展示故障频率，蓝-黄-红渐变(色盲友好)
- **桑基图** — 节点=阶段(挂号→支付→医保)，渐变流向
- **交互** — 点击钻取、hover高亮、数据区域缩放

### Pitfalls (来自已有经验)
- 不要dispose()+reinit()实现更新
- 不要对chart实例使用深度reactive
- 大数据量用sampling: 'lttb'

---

## Recommendations

1. **REAL-01:** 使用 shallowRef 存储 ECharts option
2. **REAL-02:** 轮询用 RAF 时间戳限速，不用 setInterval
3. **REAL-03:** chart.setOption 用 lazyUpdate: true
4. **HEAT-01:** 热力图用时间矩阵，蓝-黄-红渐变
5. **SANKEY-01:** 桑基图展示完整患者流转路径

---

*Generated from STACK.md and FEATURES.md*
