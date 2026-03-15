# 前端重设计规格文档

**日期：** 2026-03-15
**范围：** 云边端就医自助终端监测系统前端全量重设计
**技术栈：** Vue 3 + Element Plus + Pinia + Axios + ECharts（保持不变）

---

## 1. 设计目标

- 视觉风格升级为企业管理台白色主题（Element Plus Light token）
- 同时满足运维值班监控和领导/客户演示两种场景
- 新增登录页 + JWT 认证
- 新增专属架构演示页，可视化展示端→边→云数据流向
- 数据层改为从后端实时拉取（短轮询），替换硬编码数据

---

## 2. 整体布局与导航

### 2.1 布局结构

```
┌─────────────────────────────────────────────────────┐
│  顶部导航栏（64px）                                    │
│  Logo | 主导航 Tab | 告警徽标 | 用户头像/退出           │
├──────────┬──────────────────────────────────────────┤
│  左侧     │                                          │
│  上下文   │  主内容区（随页面变化）                     │
│  面板     │                                          │
│ （仅终端  │                                          │
│  监控页）  │                                          │
└──────────┴──────────────────────────────────────────┘
```

### 2.2 顶部主导航 Tab

```
[总览] [终端监控] [告警中心] | [挂号] [排队] [医保] [支付] [架构演示]
```

- 前三项为运维视角，后四项为业务视角，用分隔线区分
- 新增「架构演示」Tab
- 告警中心 Tab 显示 P0 红色数字徽标
- 导航栏右侧：告警摘要徽标 + 用户名 + 退出按钮

### 2.3 左侧上下文面板

仅在「终端监控」页出现（240px），包含：
- 状态筛选 Tab：全部 / 在线 / 降级 / 离线（含计数徽标）
- 终端列表：每项显示终端 ID + 状态色点，点击后右侧滚动并高亮对应卡片

### 2.4 主题迁移方案

现有组件全部使用 `<style scoped>` 内联暗色值（`#0d1117`、`#161b22` 等），需整体替换。

迁移策略：
- 在 `src/styles/variables.css` 中定义 CSS 自定义属性（设计 token），如 `--bg-primary`、`--text-primary`、`--border-color` 等
- `main.js` 全局引入该文件
- 各组件 `<style scoped>` 中用 `var(--bg-primary)` 替换硬编码色值
- Element Plus 主题通过 `src/styles/element-override.scss` 覆盖 SCSS 变量（`$color-primary` 等）

白色主题色值参考：

| Token | 值 | 用途 |
|-------|----|------|
| `--bg-primary` | `#ffffff` | 卡片/面板背景 |
| `--bg-page` | `#f5f7fa` | 页面背景 |
| `--bg-header` | `#001529` | 顶部导航背景（深色对比） |
| `--text-primary` | `#1a1a2e` | 主文字 |
| `--text-secondary` | `#595959` | 次要文字 |
| `--border-color` | `#e8e8e8` | 边框 |
| `--color-danger` | `#ff4d4f` | P0 / 错误 |
| `--color-warning` | `#faad14` | P1 / 警告 |
| `--color-success` | `#52c41a` | 正常 / 成功 |
| `--color-primary` | `#1677ff` | 主色调 |

---

## 3. 登录页

### 3.1 布局

左右两栏：
- 左半：浅蓝渐变背景，系统名称大字，底部端→边→云架构示意图
- 右半：白色登录卡片，居中垂直对齐

### 3.2 表单字段

- 用户名（图标 + 输入框）
- 密码（图标 + 输入框 + 显示/隐藏切换）
- 登录按钮（主色蓝，loading 状态）
- 错误提示（表单下方红色文字）

### 3.3 认证逻辑

- `POST /api/v1/auth/login` → 返回 JWT token
- Token 存入 `localStorage`
- Axios 请求拦截器自动附加 `Authorization: Bearer <token>`
- Axios 响应拦截器：401 → 清除 token → 跳转 `/login`
- Vue Router 全局前置守卫：无 token → 强制跳转登录页

### 3.4 演示模式降级

详见 Section 9.3 完整降级策略，登录部分摘要：后端暂无 auth 接口时，前端本地校验 `admin / admin123`，生成假 token，不阻断其他接口调用。

---

## 4. 总览 Dashboard

### 4.1 页面结构（从上到下）

**第一行：KPI 卡片（4个横排）**
- 在线终端数（蓝色边框）
- P0 告警数（红色边框，> 0 时背景浅红）
- P1 告警数（橙色边框）
- 支付成功率（绿色边框）

每张卡片左侧有色条，数字大字显示，下方标注趋势（↑↓）。

**第二行：图表区（左右分栏）**
- 左：告警事件时间线折线图（以最近 20 条告警为数据点，X 轴为时间戳，Y 轴为告警级别数值；前端直接使用 `alerts.js` store 数据，无需额外聚合逻辑）
- 右：终端状态分布饼图（在线 / 降级 / 离线）

**第三行：最近告警表**
- 显示 8 条，列：时间 | 级别 | 终端 | 类型 | 消息
- 底部「查看全部」链接跳转告警中心

### 4.2 数据来源

| 指标 | 来源 | 说明 |
|------|------|------|
| 终端在线数 | 读取 `terminals` store 的 `onlineCount` | 不单独轮询，随告警 5s 刷新自动更新 |
| P0/P1 告警数 | 读取 `alerts` store | 随告警 5s 刷新自动更新 |
| 支付成功率 | `GET /api/v1/payment/stats`（新增），由 `stats` store 10s 轮询 | 独立轮询 |

`stats.js` store 仅负责支付成功率等需要独立接口的 KPI；终端数/告警数直接从对应 store 读取，无需重复轮询。

---

## 5. 终端监控页

### 5.1 页面结构

左侧上下文面板（240px）+ 右侧终端卡片网格。

### 5.2 终端卡片

| 状态 | 样式 |
|------|------|
| 在线 | 白色卡片，绿色状态点 |
| 降级 | 卡片左边框橙色，展示最新告警条 |
| 离线 | 卡片左边框红色，硬件图标全灰，显示离线时间 |

卡片内容：终端 ID + 位置名 / 状态徽标 / 硬件状态图标（打印机、读卡器、屏幕）/ 队列深度 + 均等待时间。

### 5.3 终端数据策略

终端列表采用**前端静态定义 + 告警驱动状态更新**的方式（有意为之，适合演示场景）：

- `terminals.js` store 中预定义终端列表（T001–T020，含 ID 和位置名），这是系统已知的固定终端集合
- 每 5s 拉取 `GET /api/v1/alerts`，解析告警消息更新对应终端的状态（在线 / 降级 / 离线）和硬件字段
- 无告警的终端默认显示为"在线"

> 此设计适合本项目固定 20 台终端的场景。若未来需要动态发现终端，可增加 `GET /api/v1/terminals` 接口，`terminals.js` 改为从后端初始化列表。

### 5.4 交互

- 点击左侧列表项 → 右侧滚动高亮对应卡片
- 点击状态筛选 Tab → 右侧只展示对应状态卡片

---

## 6. 告警中心页

### 6.1 页面结构

顶部统计条 + 工具栏 + 告警表格 + 分页。

**统计条：**
```
P0 未处理 3 · P1 未处理 7 · 今日总计 47 · 已处理 37
```

**工具栏：** 级别筛选 / 类型筛选 / 终端 ID 搜索 / 时间范围选择 / 刷新按钮

### 6.2 表格

列：时间 | 级别（色块标签）| 终端 | 类型（图标）| 消息

- P0 行背景浅红高亮
- 行点击展开详情（告警 ID、原始 payload）
- 分页：**前端分页**（客户端对全量数据分页，每页 20 条），不改变后端接口

### 6.3 实时更新

- 5s 自动刷新，刷新后**保持当前页码不变**（除非当前页已超出新数据总页数，则跳回第一页）
- 有新告警（总数增加）时顶部出现提示条「有新告警，点击刷新」，用户点击后跳回第一页

---

## 7. 架构演示页（新增）

### 7.1 页面结构（三栏）

| 左栏（280px） | 中栏（弹性） | 右栏（300px） |
|-------------|------------|-------------|
| 仿真器控制台 | 实时流向图 | 事件流面板 |

### 7.2 左栏：仿真器控制台

- 运行状态显示（运行中 N/20 台）
- `[▶ 启动全部]` `[⏹ 停止全部]` 按钮
- 场景注入按钮组：打印机卡纸 / 终端离线 / 队列过载 / 支付超时风险 / 随机异常
- 消息统计：已发送总数 / 已触发告警数

### 7.3 中栏：实时流向图

三层架构节点：
```
[端层 ×20]  ──MQTT──▶  [边缘层 Drools]  ──gRPC/Kafka──▶  [云端微服务]
```

**渲染技术：SVG + CSS 动画**
- 使用内联 SVG 绘制三层节点和连线，无需额外依赖库
- 动画通过 CSS `@keyframes` + Vue 响应式 class 绑定实现（告警触发时动态添加动画 class）
- 不引入 `@antv/g6`、`vue-flow` 等新依赖，保持零新依赖原则

动画规则：
- 正常心跳：端→边连线绿色脉冲（CSS stroke-dashoffset 动画），每 5s 一次
- 异常触发：端→边→云三段连线依次橙/红高亮，各段延迟 300ms，模拟真实传播时延
- 节点悬停：tooltip 显示组件说明（Vue `v-tooltip` 或 Element Plus Popover）
- 各层节点内显示实时处理计数（响应式绑定 store 数据）

### 7.4 右栏：事件流面板

时间线形式展示消息完整生命周期：
```
02:14:33  [端层]  T003 发布心跳 → printer=paper_jam
02:14:33  [边层]  Drools 触发规则 → P0 HARDWARE 告警
02:14:34  [云层]  AlertStore 写入 → 前端收到推送
```

### 7.5 新增后端接口

| 接口 | 说明 |
|------|------|
| `POST /api/v1/simulator/start` | 启动全部仿真器 |
| `POST /api/v1/simulator/stop` | 停止全部仿真器 |
| `POST /api/v1/simulator/inject` | 注入场景 `{ scene, terminalId }` |

场景类型：`printer_jam` / `terminal_offline` / `queue_overload` / `payment_timeout` / `random`

---

## 8. 业务操作页（挂号/排队/医保/支付）

### 8.1 统一模板

左右两栏：
- 左：操作表单（字段 + 提交按钮）
- 右：结果展示区（空状态提示 → 提交后结果卡片，支持多次提交历史堆叠）

所有字段加前缀图标，提交按钮有 loading 状态，成功/失败有 Toast 提示。

### 8.2 各页面特殊设计

| 页面 | 特殊设计 |
|------|---------|
| 挂号预约 | 科室改为带图标卡片选择器 |
| 排队查询 | 队列深度进度条（>50 红色预警），等待时间大字显示 |
| 医保验证 | 报销比例进度条，成功/失败大图标 |
| 支付验证 | 结果展示"是否命中缓存"标签，便于演示幂等性 |

---

## 9. 数据层

### 9.1 Pinia Store 结构

| Store | 职责 |
|-------|------|
| `auth.js` | 新增，管理 token、用户信息、登录/登出 |
| `alerts.js` | 保留并扩展，增加分页、筛选状态 |
| `terminals.js` | 保留，从告警推导终端状态，加实时刷新 |
| `simulator.js` | 新增，管理仿真器运行状态、消息计数、场景注入 |
| `stats.js` | 新增，管理 Dashboard KPI 数据 |

### 9.2 数据拉取策略与轮询生命周期

| 数据 | Store | 方式 | 频率 | 启动时机 | 停止时机 | 作用域 |
|------|-------|------|------|---------|---------|-------|
| 告警列表 | `alerts.js` | 轮询 | 5s | `MainLayout` mounted | `MainLayout` unmounted | 全局（登录后持续） |
| 终端状态 | `terminals.js` | 从告警推导 | 随告警更新 | — | — | 被动更新 |
| 支付成功率 KPI | `stats.js` | 轮询 | 10s | `MainLayout` mounted | `MainLayout` unmounted | 全局（登录后持续） |
| 仿真器状态 | `simulator.js` | 轮询 | 3s | `DemoView` mounted | `DemoView` unmounted | 视图级（仅演示页） |
| 事件流（演示页）| `simulator.js` | 轮询差量追加 | 2s | `DemoView` mounted | `DemoView` unmounted | 视图级（仅演示页） |

`MainLayout` 在 `onMounted` 中调用各全局 store 的 `startPolling()`，在 `onUnmounted` 中调用 `stopPolling()`。`DemoView` 自行管理仿真器相关轮询的生命周期。

> 后续可无缝升级为 SSE/WebSocket，接口路径不变。

### 9.3 演示模式降级（完整策略）

| 接口 | 降级行为 |
|------|---------|
| `POST /api/v1/auth/login` 不存在 | 前端本地校验 `admin/admin123`，生成假 JWT token 存入 localStorage，不阻断其他接口 |
| `GET /api/v1/payment/stats` 不存在 | Dashboard 支付成功率 KPI 卡片显示"暂无数据" |
| `POST /api/v1/simulator/start\|stop` 不存在 | 按钮显示禁用状态 + tooltip"仿真器接口未就绪" |
| `POST /api/v1/simulator/inject` 不存在 | 场景注入按钮禁用，不阻断流向图展示 |

所有降级均为局部降级，不影响其他已就绪功能的正常使用。

---

## 10. 文件结构

```
frontend/src/
├── main.js
├── App.vue
├── api/
│   └── index.js              # 统一 Axios 客户端 + 拦截器
├── router/
│   └── index.js              # 全局前置守卫（auth 检查）
├── stores/
│   ├── auth.js               # 新增
│   ├── alerts.js             # 扩展
│   ├── terminals.js          # 保留
│   ├── simulator.js          # 新增
│   └── stats.js              # 新增
├── components/
│   ├── MainLayout.vue        # 改为顶部导航
│   └── FlowDiagram.vue       # 新增，架构流向图动画组件
└── views/
    ├── LoginView.vue          # 新增
    ├── Dashboard.vue          # 重写
    ├── TerminalsView.vue      # 重写
    ├── AlertsView.vue         # 重写
    ├── DemoView.vue           # 新增，架构演示页
    ├── RegistrationView.vue   # 视觉升级
    ├── QueueView.vue          # 视觉升级
    ├── InsuranceView.vue      # 视觉升级
    └── PaymentView.vue        # 视觉升级
```

---

## 11. 页面路由

路由嵌套结构：`LoginView` 位于根层（无 layout），其余所有受保护路由作为 `MainLayout` 的子路由：

```
/login          → LoginView（根层，无 MainLayout 包裹）
/               → MainLayout（layout 容器）
  ""            → 重定向到 /dashboard
  dashboard     → Dashboard
  terminals     → TerminalsView
  alerts        → AlertsView
  demo          → DemoView
  registration  → RegistrationView
  queue         → QueueView
  insurance     → InsuranceView
  payment       → PaymentView
  :pathMatch(.*)→ 重定向到 /dashboard（404 兜底）
```

| 路径 | 组件 | 认证 |
|------|------|------|
| `/login` | LoginView | 不需要（已登录则重定向到 `/dashboard`） |
| `/dashboard` | Dashboard | 需要 |
| `/terminals` | TerminalsView | 需要 |
| `/alerts` | AlertsView | 需要 |
| `/demo` | DemoView | 需要 |
| `/registration` | RegistrationView | 需要 |
| `/queue` | QueueView | 需要 |
| `/insurance` | InsuranceView | 需要 |
| `/payment` | PaymentView | 需要 |
| `/*`（未匹配） | — | 重定向到 `/dashboard` |
