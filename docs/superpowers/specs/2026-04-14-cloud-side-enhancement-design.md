# 云边协同增强设计文档

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 增强云边协同（CloudSideView.vue）页面，新增 4 个功能模块：告警中心 Tab、终端详情抽屉、队列监控 Tab、场景注入面板

**Architecture:** 在现有 Vue 3 + Pinia + Element Plus + Vue Router 架构上，新增 1 个抽屉组件和 2 个 Tab 内容区块，不改变现有路由结构

**Tech Stack:** Vue 3, Vue Router 4, Element Plus, Pinia, ECharts（迷你图）

---

## 1. 云边协同页面 Tab 结构

| 顺序 | Tab 名称 | 说明 |
|------|----------|------|
| 1 | 概览 | 云端下发指令 / 云边端消息流转图 / 边端上报事件 + 实时业务流 |
| 2 | 运维处置 | 命令下发记录 / 实时业务流 / 边端上报事件 + **场景注入面板**（底部） |
| 3 | 指令记录 | 终端状态表格（带详情按钮）+ 命令历史表格 |
| 4 | **告警中心** | P0/P1 过滤、分页告警列表、确认/解决操作 |
| 5 | **队列监控** | 全院各科室排队热力图（卡片网格） |
| 6 | 消息统计 | 消息速率、类型分布、云边端统计（内容不变） |

---

## 2. 文件结构

| 文件 | 职责 |
|------|------|
| `src/views/CloudSideView.vue` | 修改：新增 Tab4 告警中心、Tab5 队列监控、运维处置 Tab 底部场景注入面板 |
| `src/components/TerminalDetailDrawer.vue` | 新建：终端详情抽屉组件 |
| `src/stores/cloudSide.js` | 修改：新增 `alerts` 数据聚合（alertsStore 集成） |

---

## 3. 新增 Tab4：告警中心

**位置：** 消息统计 Tab 右侧新增

**内容：** 复用现有 AlertsView.vue 的告警列表逻辑（alertsStore），但去掉顶部的"新增告警横幅"和页面级别的面包屑/标题，改为适配 Tab 内嵌的紧凑布局：

- **告警统计条**：显示 P0 数量（红色）、P1 数量（黄色）、总数
- **过滤器栏**：级别筛选（P0/P1/P2/全部）、状态筛选（活跃/已确认/已解决）
- **告警列表**（el-table）：
  - 列：级别、时间、终端ID、告警类型、消息、状态、操作
  - 操作列：`确认` 按钮（活跃→已确认）、`解决` 按钮（已确认→已解决）
  - 状态标签颜色：活跃=红色、已确认=黄色、已解决=绿色
- **分页**（el-pagination）：每页 10 条

**数据源：** `alertsStore.alerts`，调用 `alertsStore.fetchAlerts()`

---

## 4. 新增 Tab5：队列监控

**位置：** 告警中心 Tab 右侧

**内容：** 全院各科室排队热力图

**布局：** 卡片网格（el-row + el-col），每列一个科室，当前有 5 个科室（NEU神经科、CARD心内科、ORTH骨科、INT内科、EMRG急诊）：

| 科室 | 排队阈值 |
|------|----------|
| NEU 神经科 | >50 标红，>30 标黄 |
| CARD 心内科 | >50 标红，>30 标黄 |
| ORTH 骨科 | >50 标红，>30 标黄 |
| INT 内科 | >50 标红，>30 标黄 |
| EMRG 急诊 | >30 标红，>20 标黄 |

**每张卡片内容：**
- 科室名称（中文）
- 当前排队人数（大字）
- 平均等待时间
- 平均交易时间
- 颜色状态条（顶部边框颜色随阈值变化）

**数据源：** `cloudSideStore.queueByDept`，从 `GET /api/v1/queue/by-dept` 获取

---

## 5. 运维处置 Tab：场景注入面板

**位置：** 运维处置 Tab 三栏布局的底部（top-grid 下方），独立一行

**布局：**
```
[场景类型选择] [目标终端选择] [Inject按钮]
```

**场景类型（来自后端 SimulatorController.inject）：**
| 场景 Key | 描述 |
|----------|------|
| `offline` | 终端离线 |
| `printer_error` | 打印机故障 |
| `card_reader_error` | 读卡器故障 |

**交互流程：**
1. 从下拉框选择场景类型
2. 从终端选择器选择目标终端（支持多选 T001-T020）
3. 点击"注入场景"按钮
4. 调用 `POST /api/v1/simulator/inject?scene={scene}&terminalId={id}`
5. 注入成功后自动刷新：终端状态、边端事件、告警列表

**样式：** 浅灰背景行，el-card 风格，内联布局不占高度

---

## 6. 终端详情抽屉

**组件名：** `TerminalDetailDrawer.vue`

**触发：** 指令记录 Tab → 终端状态表格 → 每行"详情"按钮

**抽屉宽度：** 600px

**内容分三个区块：**

### 6.1 基本信息区
- 终端 ID（大字）
- 位置、状态标签、在线时长、今日交易量

### 6.2 实时指标
- CPU 使用率 + 迷你折线图（最近 10 个数据点）
- 内存使用率 + 迷你折线图（最近 10 个数据点）
- 队列深度
- 平均等待时间

**迷你图实现：** 使用 `vue-echarts` 的 `LineChart`，高度 40px，无坐标轴，只保留平滑曲线

### 6.3 硬件健康状态
- 打印机状态：正常（绿）/ 卡纸/故障（红）
- 读卡器状态：正常（绿）/ 故障（红）
- 屏幕状态

**Props：** `terminalId: String`，抽屉打开时从 `terminalsStore` 查找对应终端数据

---

## 7. 指令记录 Tab 改造

**改动：** 终端状态表格增加"操作"列

```vue
<el-table-column label="操作" width="80" fixed="right">
  <template #default="{ row }">
    <el-button size="small" @click="openTerminalDrawer(row.id)">详情</el-button>
  </template>
</el-table-column>
```

**`openTerminalDrawer(id)`：** 打开 TerminalDetailDrawer，写入 `drawerVisible.value = true` 和 `selectedTerminalId.value = id`

---

## 8. API 依赖

| API | 用途 | 现有状态 |
|-----|------|----------|
| `GET /api/v1/alerts` | 告警列表 | 已有，alertsStore 使用中 |
| `POST /api/v1/alerts/{id}/acknowledge` | 确认告警 | 已有，alertsStore 未集成 |
| `POST /api/v1/alerts/{id}/resolve` | 解决告警 | 已有，alertsStore 未集成 |
| `GET /api/v1/queue/by-dept` | 科室排队数据 | 已有，cloudSideStore 使用中 |
| `POST /api/v1/simulator/inject` | 注入模拟场景 | 已有，后端 SimulatorController |

---

## 9. 数据流

```
alertsStore.fetchAlerts()
  → 显示在 Tab4 告警中心

alertsStore.acknowledgeAlert(id)
alertsStore.resolveAlert(id)
  → 运维人员在告警中心操作

cloudSideStore.queueByDept
  → 显示在 Tab5 队列监控

terminalsStore.terminals[id]
  → 传入 TerminalDetailDrawer 作为 props
  → 抽屉内显示该终端的详情

POST /api/v1/simulator/inject
  → 场景注入成功后刷新 terminalsStore 和 alertsStore
```

---

## 10. 安全与 UX 考量

- **场景注入有确认步骤**：点击注入后弹出二次确认 Dialog，展示"即将让终端 {id} 发生 {场景名} 故障，是否继续？"
- **告警操作有日志**：每次确认/解决操作记录 operatorId（取 authStore.user?.name）和操作时间
- **终端详情不打断业务流**：抽屉从右侧滑出，不影响左侧 Tab 内容
- **队列阈值醒目**：超阈值卡片边框变红/黄，配合 el-tag 标签文字颜色
