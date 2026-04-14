# 云端侧拆分实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 CloudSideView 拆分为两个独立页面——纯展示大屏（/cloud-side）和运维控制台（/cloud-ops）

**Architecture:** 在现有 Vue 3 + Pinia + Element Plus + Vue Router 架构上，新增路由和页面，不改变现有 store 结构

**Tech Stack:** Vue 3, Vue Router 4, Element Plus, Pinia

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `src/views/CloudSideView.vue` | 修改：移除操作内容，保留展示内容 → 纯大屏 |
| `src/views/CloudOpsView.vue` | 新建：运维控制台（命令下发/命令记录/事件列表） |
| `src/components/MainLayout.vue` | 修改：侧边栏加"云端"分组，下挂两个子项 |
| `src/router/index.js` | 修改：加 `/cloud-ops` 路由 |

---

## Task 1: 修改 MainLayout.vue 侧边栏

**Files:**
- Modify: `src/components/MainLayout.vue`

将单一路由入口"云端侧"拆分为"云端"分组下的两个子项：

```vue
<!-- 原来的单个 nav-item（删掉） -->
<button class="nav-item" :class="{ active: activeMenu==='cloud-side' }" @click="handleMenuSelect('cloud-side')">云端侧</button>

<!-- 替换为分组结构 -->
<div class="nav-group-title">云端</div>
<div class="nav-list">
  <button class="nav-item" :class="{ active: activeMenu==='cloud-side' }" @click="handleMenuSelect('cloud-side')">☁ 云端大屏</button>
  <button class="nav-item" :class="{ active: activeMenu==='cloud-ops' }" @click="handleMenuSelect('cloud-ops')">⚙ 运维控制台</button>
</div>
```

对应的 `pageTitles` 映射也要更新（注意实际变量名是 `pageTitles`，不是 `menuLabels`），加上 `'cloud-ops': '运维控制台'`。

**Style：** "云端"分组标题样式与现有"监控域"一致。

---

## Task 2: 新建 CloudOpsView.vue

**Files:**
- Create: `src/views/CloudOpsView.vue`

整体布局参考现有 CloudSideView.vue 的运维部分，从那里剪切过来。

### 2.1 顶部 Header
- 左侧：⚙ 图标 + "运维控制台"（无副标题）
- 右侧：`下发命令` 按钮（type=primary）+ `刷新` 按钮
- **禁止出现** `重置模拟` 按钮（CloudSideView.vue 原有此按钮，CloudOpsView 不得复制过来）

### 2.2 三栏区域
- **左栏**：命令下发记录（从 cloudStore.commands 取，保留 CloudSide 的命令列表样式）
- **中栏**：实时业务流（bizRecords 列表），**不使用**云边端消息流转 SVG 图（该图是展示性组件，只属于大屏页）
- **右栏**：边端上报事件（reventEvents，保留原样）

### 2.3 底部 Tab
- Tab1 "终端状态"：终端状态表格（复用 cloudStore + terminalsStore）
- Tab2 "命令记录"：完整命令历史表格（commandTableData）
- Tab3 "消息统计"：消息统计（msgTypeDist）

### 2.4 命令下发 Dialog
完整保留 CloudSideView.vue 中现有的 el-dialog（`showCmdDialog` 及相关逻辑、样式），全部复制到 CloudOpsView.vue。

### 2.5 Script Setup
```javascript
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCloudSideStore } from '../stores/cloudSide'
import { useEdgeNodeStore } from '../stores/edgeNodeStore'
import { useTerminalsStore } from '../stores/terminals'

// 复用 CloudSideView.vue 中的所有 JS 逻辑：
// - activeTab, showCmdDialog, cmdLoading, selectedCmd, selectedTerminals
// - cmdOptions, selectedTerminalSummary
// - cloudMsgCount, edgeMsgCount, terminalMsgCount
// - refreshAll(), sendCommandBatch(), selectAllTerminals(), toggleTerminal()
// - 所有格式化函数（fmtTime, cmdTypeTag, cmdStatusLabel 等）
// - 所有 computed（recentCommands, recentEvents, bizRecords, commandTableData, terminalTableData, msgTypeDist）
// - polling: onMounted 中调用 edgeStore.startPolling(10000) 和 simTimer 间隔
```

---

## Task 3: 修改 CloudSideView.vue（纯大屏）

**Files:**
- Modify: `src/views/CloudSideView.vue`

### 3.1 顶部 Header
- 去掉"下发命令"按钮
- 去掉"刷新"按钮
- 保留：`重置模拟` 按钮、在线率 Chip

### 3.2 三栏区域（保持不变）
- 左栏：云端下发指令列表 ✓
- 中栏：云边端消息流转图 ✓
- 右栏：边端上报事件列表 ✓

### 3.3 实时业务流（保留不变）

### 3.4 底部 Tab
- Tab1 "终端状态"：保留 ✓
- Tab2 "命令记录"：**删掉**（这是操作能力）
- Tab3 "消息统计"：保留 ✓

同时在 JS 中将 `activeTab` 的默认值改为 `'terminals'`，确保删除命令记录 Tab 后不会停留在失效的 tab 上。

### 3.5 删除内容
- 删除 `showCmdDialog` ref
- 删除 `cmdLoading` ref
- 删除 `selectedCmd`、`selectedTerminals`、`cmdForm` refs
- 删除 `cmdOptions` 数组
- 删除 `sendCommandBatch`、`selectAllTerminals`、`clearAllTerminals`、`toggleTerminal` 函数
- 删除命令下发 Dialog（`<el-dialog v-model="showCmdDialog">`整个块）
- 删除 Header 中的"下发命令"按钮
- 删除 Header 中的"刷新"按钮

---

## Task 4: 修改 router/index.js

**Files:**
- Modify: `src/router/index.js`

在 children 数组中加一条新路由：

```javascript
{ path: 'cloud-ops', component: () => import('../views/CloudOpsView.vue') },
```

---

## Task 5: 验证构建

**Run:** `cd D:/yunbianduan/frontend && npm run build`
**Expected:** 成功构建，无报错

---

## Task 6: 手动验证（浏览器）

1. 访问 `/cloud-side` → 看到纯大屏，无"下发命令"按钮
2. 访问 `/cloud-ops` → 看到运维控制台，有"下发命令"按钮
3. 点击侧边栏"云端大屏"和"运维控制台" → 正确切换
4. 在运维控制台点"下发命令" → 弹出命令选择 Dialog
5. 在运维控制台发送一条命令 → 命令出现在"命令下发记录"左栏
