# 云边协同增强实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强云边协同页面，新增 4 个功能模块：Tab4 告警中心、Tab5 队列监控、运维处置底部场景注入面板、终端详情抽屉

**Architecture:** 在 CloudSideView.vue 中新增 2 个 Tab 内容和 1 个场景注入面板，新建 TerminalDetailDrawer.vue 抽屉组件，全部复用现有 stores（alertsStore、cloudSideStore、terminalsStore）

**Tech Stack:** Vue 3, Element Plus, Pinia, vue-echarts

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `src/views/CloudSideView.vue` | 修改：新增 Tab4 告警中心、Tab5 队列监控、运维处置底部场景注入面板、抽屉触发逻辑 |
| `src/components/TerminalDetailDrawer.vue` | 新建：终端详情抽屉组件 |
| `src/api/index.js` | 修改：`injectScene` 已存在，确认格式 |

---

## Task 1: 新增 Tab4 告警中心

**Files:**
- Modify: `src/views/CloudSideView.vue` — 在 Tab3（指令记录）之后、Tab5（队列监控）之前插入

**alertsStore 已有能力：** `acknowledge(id)`、`resolve(id)`、`pagedAlerts`、`p0Count`、`p1Count`、`totalCount`、`activeCount`、`setFilter`、`setPage`、`fetchAlerts`

- [ ] **Step 1: 在 script setup 中导入 alertsStore**

在 `import { useCloudSideStore }` 后添加：

```javascript
import { useAlertsStore } from '../stores/alerts'
import { useAuthStore } from '../stores/auth'
```

在 store 声明处添加：

```javascript
const alertsStore = useAlertsStore()
const authStore = useAuthStore()
```

在 `onMounted` 中添加告警轮询：

```javascript
onMounted(() => {
  refreshAll()
  edgeStore.startPolling(10000)
  alertsStore.startPolling(5000)
  simTimer = setInterval(() => {
    cloudMsgCount.value += Math.floor(Math.random() * 12 + 1)
    edgeMsgCount.value += Math.floor(Math.random() * 8 + 1)
    terminalMsgCount.value += Math.floor(Math.random() * 20 + 5)
  }, 2000)
})
```

在 `onUnmounted` 中添加：

```javascript
alertsStore.stopPolling()
```

- [ ] **Step 2: 在 Tab3（指令记录）之后、Tab5（队列监控）之前插入告警中心 Tab 内容**

在 `el-tab-pane label="指令记录"` 之后、`el-tab-pane label="队列监控"` 之前插入：

```vue
<!-- Tab 4: 告警中心 -->
<el-tab-pane label="告警中心" name="alerts">
  <div class="alerts-tab-content">
    <!-- 告警统计条 -->
    <div class="alert-stats-bar">
      <span class="alert-stat-item danger">
        <span class="alert-stat-num">{{ alertsStore.p0Count }}</span>
        <span class="alert-stat-label">P0 紧急</span>
      </span>
      <span class="alert-stat-item warning">
        <span class="alert-stat-num">{{ alertsStore.p1Count }}</span>
        <span class="alert-stat-label">P1 重要</span>
      </span>
      <span class="alert-stat-item">
        <span class="alert-stat-num">{{ alertsStore.activeCount }}</span>
        <span class="alert-stat-label">活跃</span>
      </span>
      <span class="alert-stat-item">
        <span class="alert-stat-num">{{ alertsStore.totalCount }}</span>
        <span class="alert-stat-label">全部</span>
      </span>
    </div>

    <!-- 过滤器栏 -->
    <div class="alert-filters">
      <el-select v-model="alertLevelFilter" size="small" placeholder="级别" clearable style="width:100px" @change="alertsStore.setFilter({ level: alertLevelFilter })">
        <el-option label="P0" value="P0" />
        <el-option label="P1" value="P1" />
        <el-option label="P2" value="P2" />
      </el-select>
      <el-select v-model="alertStatusFilter" size="small" placeholder="状态" clearable style="width:120px" @change="alertsStore.setFilter({ status: alertStatusFilter })">
        <el-option label="活跃" value="ACTIVE" />
        <el-option label="已确认" value="ACKNOWLEDGED" />
        <el-option label="已解决" value="RESOLVED" />
      </el-select>
      <el-input v-model="alertTerminalFilter" size="small" placeholder="终端ID" clearable style="width:120px" @change="alertsStore.setFilter({ terminalId: alertTerminalFilter })" />
    </div>

    <!-- 告警列表 -->
    <el-table :data="alertsStore.pagedAlerts" stripe size="small" v-loading="alertsStore.loading" class="alerts-table">
      <el-table-column label="级别" width="70">
        <template #default="{ row }">
          <span class="level-badge" :class="'level-' + (row.level || 'P2').toLowerCase()">{{ row.level || 'P2' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="80">
        <template #default="{ row }">
          <span class="time-text">{{ fmtTime(row.timestamp) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="终端" width="80">
        <template #default="{ row }">
          <span class="mono">{{ row.terminalId || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <span>{{ typeLabel(row.type) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="消息">
        <template #default="{ row }">
          <span class="msg-text">{{ row.message || row.desc || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <span class="status-badge" :class="'status-' + (row.status || 'active').toLowerCase()">{{ alertStatusLabel(row.status) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="130" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status !== 'ACKNOWLEDGED' && row.status !== 'RESOLVED'"
            size="small"
            type="warning"
            @click="handleAcknowledge(row.id)"
          >确认</el-button>
          <el-button
            v-if="row.status === 'ACKNOWLEDGED'"
            size="small"
            type="success"
            @click="handleResolve(row.id)"
          >解决</el-button>
          <span v-else-if="row.status === 'RESOLVED'" class="resolved-text">已解决</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="alert-pagination">
      <el-pagination
        background
        layout="prev, pager, next"
        :total="alertsStore.filteredAlerts.length"
        :page-size="alertsStore.pageSize"
        :current-page="alertsStore.currentPage"
        @current-change="alertsStore.setPage"
        small
      />
    </div>
  </div>
</el-tab-pane>
```

- [ ] **Step 3: 添加告警相关的 filter refs 和 handler 函数**

在 script setup 中（在 `const activeTab` 附近）添加：

```javascript
// 告警过滤器
const alertLevelFilter = ref('')
const alertStatusFilter = ref('')
const alertTerminalFilter = ref('')

function handleAcknowledge(alertId) {
  const operator = authStore.user?.name || '未知操作员'
  console.debug(`[审计] ${operator} 确认了告警 ${alertId}，时间: ${new Date().toISOString()}`)
  alertsStore.acknowledge(alertId)
}

function handleResolve(alertId) {
  const operator = authStore.user?.name || '未知操作员'
  console.debug(`[审计] ${operator} 解决了告警 ${alertId}，时间: ${new Date().toISOString()}`)
  alertsStore.resolve(alertId)
}

function alertStatusLabel(status) {
  const m = { ACTIVE: '活跃', ACKNOWLEDGED: '已确认', RESOLVED: '已解决' }
  return m[status] || status || '活跃'
}
```

- [ ] **Step 4: 添加告警 Tab CSS**

在 `<style scoped>` 末尾添加：

```css
/* Alerts Tab */
.alerts-tab-content { padding-top: 12px; }
.alert-stats-bar {
  display: flex; gap: 16px; margin-bottom: 12px;
  background: #fff; border-radius: 10px; padding: 12px 16px;
  border: 1px solid #e2e8f0;
}
.alert-stat-item { display: flex; align-items: baseline; gap: 6px; }
.alert-stat-num { font-size: 22px; font-weight: 700; }
.alert-stat-label { font-size: 12px; color: #64748b; }
.alert-stat-item.danger .alert-stat-num { color: #ef4444; }
.alert-stat-item.warning .alert-stat-num { color: #f59e0b; }
.alert-filters { display: flex; gap: 8px; margin-bottom: 10px; }
.alerts-table { border-radius: 10px; overflow: hidden; }
.level-badge { font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
.level-p0 { background: #fee2e2; color: #b91c1c; }
.level-p1 { background: #fef3c7; color: #a16207; }
.level-p2 { background: #f1f5f9; color: #475569; }
.time-text { font-size: 12px; color: #64748b; }
.mono { font-family: monospace; font-size: 12px; }
.msg-text { font-size: 13px; color: #334155; }
.status-badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
.status-active { background: #fee2e2; color: #b91c1c; }
.status-acknowledged { background: #fef3c7; color: #a16207; }
.status-resolved { background: #dcfce7; color: #15803d; }
.resolved-text { font-size: 12px; color: #10b981; }
.alert-pagination { display: flex; justify-content: flex-end; margin-top: 10px; }
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/CloudSideView.vue
git commit -m "feat: add alerts center tab (Tab4)"
```

---

## Task 2: 新增 Tab5 队列监控

**Files:**
- Modify: `src/views/CloudSideView.vue` — 在 name="stats" 的 Tab 之后插入队列监控 Tab（此时告警中心 Tab 已在，队列监控排在消息统计右侧）

- [ ] **Step 1: 在 CloudSideView.vue 的 el-tabs 中，在消息统计 Tab（name="stats"）之后插入 Tab5**

```vue
<!-- Tab 5: 队列监控 -->
<el-tab-pane label="队列监控" name="queue">
  <div class="queue-monitor">
    <div class="queue-grid">
      <div
        v-for="dept in queueDepts"
        :key="dept.code"
        class="queue-card"
        :class="queueCardClass(dept)"
      >
        <div class="queue-card-header">{{ dept.name }}</div>
        <div class="queue-card-body">
          <div class="queue-main">
            <span class="queue-num">{{ dept.depth || 0 }}</span>
            <span class="queue-unit">人排队</span>
          </div>
          <div class="queue-metrics">
            <div class="queue-metric">
              <span class="q-label">平均等待</span>
              <span class="q-val">{{ dept.avgWait || '0s' }}</span>
            </div>
            <div class="queue-metric">
              <span class="q-label">平均交易</span>
              <span class="q-val">{{ dept.avgTx || '0s' }}</span>
            </div>
          </div>
        </div>
        <div class="queue-card-status" :class="queueCardClass(dept)"></div>
      </div>
    </div>
  </div>
</el-tab-pane>
```

- [ ] **Step 2: 在 script setup 中添加队列数据和 queueCardClass 函数**

在文件顶部 import 区域附近添加：

```javascript
// 队列监控
const queueDepts = computed(() => {
  const DEPTS_MAP = {
    NEU: '神经科', CARD: '心内科', ORTH: '骨科', INT: '内科', EMRG: '急诊'
  }
  const codes = ['NEU', 'CARD', 'ORTH', 'INT', 'EMRG']
  return (cloudStore.queueSnapshot || []).map((q, i) => ({
    code: codes[i] || codes[0],
    name: DEPTS_MAP[codes[i]] || codes[i],
    depth: q.depth || 0,
    avgWait: q.avgWaitMs ? Math.round(q.avgWaitMs / 1000) + 's' : '0s',
    avgTx: q.avgTxTime ? Math.round(q.avgTxTime / 1000) + 's' : '0s'
  }))
})

// EMRG急诊阈值: >30红 >20黄; 其他科室阈值: >50红 >30黄
function queueCardClass(dept) {
  if (dept.code === 'EMRG') {
    if (dept.depth > 30) return 'status-danger'
    if (dept.depth > 20) return 'status-warn'
    return 'status-ok'
  }
  if (dept.depth > 50) return 'status-danger'
  if (dept.depth > 30) return 'status-warn'
  return 'status-ok'
}
```

- [ ] **Step 3: 添加队列监控 CSS**

在 `<style scoped>` 末尾添加：

```css
/* Queue Monitor */
.queue-monitor { padding-top: 12px; }
.queue-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.queue-card {
  background: #fff; border-radius: 12px; padding: 16px;
  border: 1px solid #e2e8f0; position: relative; overflow: hidden;
}
.queue-card-header { font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 10px; }
.queue-main { display: flex; align-items: baseline; gap: 4px; margin-bottom: 8px; }
.queue-num { font-size: 32px; font-weight: 700; color: #1a8fe3; }
.queue-unit { font-size: 12px; color: #64748b; }
.queue-metrics { display: flex; flex-direction: column; gap: 4px; }
.queue-metric { display: flex; justify-content: space-between; font-size: 12px; }
.q-label { color: #94a3b8; }
.q-val { color: #334155; font-weight: 500; }
.queue-card-status { position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 3px 3px 0 0; }
.status-danger .queue-card-status { background: #ef4444; }
.status-danger .queue-num { color: #ef4444; }
.status-warn .queue-card-status { background: #f59e0b; }
.status-warn .queue-num { color: #f59e0b; }
.status-ok .queue-card-status { background: #10b981; }
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/CloudSideView.vue
git commit -m "feat: add queue monitor tab (Tab5)"
```

---

## Task 3: 运维处置 Tab 底部新增场景注入面板

**Files:**
- Modify: `src/views/CloudSideView.vue` — 在运维处置 Tab 末尾（三栏之后、el-tab-pane 结束标签之前）添加场景注入面板

**injectScene API：** `POST /api/v1/simulator/inject`，请求体格式：`{ terminalId, scene }`

- [ ] **Step 1: 在 script setup 中导入 injectScene**

```javascript
import { injectScene } from '../api'
```

- [ ] **Step 2: 添加场景注入相关的 ref 和函数**

在 script setup 中添加：

```javascript
// 场景注入
const sceneOptions = [
  { value: 'offline', label: '终端离线', icon: '💤', desc: '模拟终端断开连接' },
  { value: 'printer_error', label: '打印机故障', icon: '🖨️', desc: '模拟打印机卡纸/故障' },
  { value: 'card_reader_error', label: '读卡器故障', icon: '💳', desc: '模拟读卡器异常' },
]
const selectedScene = ref('')
const selectedInjectionTerminal = ref('')
const injectionLoading = ref(false)
const showInjectionConfirm = ref(false)

async function injectSceneAction() {
  if (!selectedScene.value || !selectedInjectionTerminal.value) return
  injectionLoading.value = true
  try {
    await injectScene({ terminalId: selectedInjectionTerminal.value, scene: selectedScene.value })
    ElMessage.success('场景注入成功')
    showInjectionConfirm.value = false
    selectedScene.value = ''
    selectedInjectionTerminal.value = ''
    await Promise.all([
      terminalsStore.fetchTerminals(),
      alertsStore.fetchAlerts(),
      edgeStore.fetchRecentCommands()
    ])
  } catch (e) {
    ElMessage.error('注入失败: ' + (e.message || '未知错误'))
  } finally {
    injectionLoading.value = false
  }
}
```

**注意：** `ElMessage` 是 Element Plus 的 Message 组件，需确保已全局注册（Element Plus 默认全局注册）

- [ ] **Step 3: 在运维处置 Tab 末尾（`</div><!-- ops-grid -->` 之后、`</el-tab-pane>` 之前）插入场景注入面板**

在 `</div>` （ops-grid 的结束 div）之后、`</el-tab-pane>` （ops Tab 的结束）之前插入：

```vue
    <!-- 场景注入面板 -->
    <div class="injection-panel">
      <div class="injection-header">
        <span class="injection-icon">🧪</span>
        <span class="injection-title">场景注入</span>
      </div>
      <div class="injection-body">
        <div class="inj-row">
          <div class="inj-field">
            <label class="inj-label">场景类型</label>
            <el-select v-model="selectedScene" placeholder="请选择场景" size="small" style="width:160px">
              <el-option
                v-for="s in sceneOptions"
                :key="s.value"
                :label="s.label"
                :value="s.value"
              >
                <span>{{ s.icon }} {{ s.label }}</span>
              </el-option>
            </el-select>
          </div>
          <div class="inj-field">
            <label class="inj-label">目标终端</label>
            <el-select v-model="selectedInjectionTerminal" placeholder="终端ID" size="small" style="width:140px" clearable>
              <el-option
                v-for="t in terminalsStore.terminals"
                :key="t.id"
                :label="t.id + ' - ' + (t.location || '-')"
                :value="t.id"
              />
            </el-select>
          </div>
          <el-button
            type="warning"
            size="small"
            :disabled="!selectedScene || !selectedInjectionTerminal"
            @click="showInjectionConfirm = true"
            class="inject-btn"
          >
            🧪 注入场景
          </el-button>
        </div>
      </div>
    </div>

    <!-- 场景注入确认 Dialog -->
    <el-dialog v-model="showInjectionConfirm" width="420px" :close-on-click-modal="false">
      <template #header>
        <span style="font-weight:700">⚠ 确认场景注入</span>
      </template>
      <div style="padding: 8px 0">
        <p>即将在终端 <strong>{{ selectedInjectionTerminal }}</strong> 注入场景：</p>
        <p style="margin-top:8px;font-weight:600">
          {{ sceneOptions.find(s => s.value === selectedScene)?.icon }}
          {{ sceneOptions.find(s => s.value === selectedScene)?.label }}
        </p>
        <p style="color:#ef4444;margin-top:8px;font-size:13px">此操作将触发模拟故障，是否继续？</p>
      </div>
      <template #footer>
        <el-button size="default" @click="showInjectionConfirm = false">取消</el-button>
        <el-button type="warning" :loading="injectionLoading" @click="injectSceneAction">确认注入</el-button>
      </template>
    </el-dialog>
```

- [ ] **Step 4: 添加场景注入 CSS**

在 `<style scoped>` 末尾添加：

```css
/* Scene Injection Panel */
.injection-panel {
  margin-top: 12px; background: #fff; border-radius: 10px;
  border: 1px solid #e2e8f0; overflow: hidden;
}
.injection-header {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; background: #fef3c7; border-bottom: 1px solid #fde68a;
}
.injection-icon { font-size: 16px; }
.injection-title { font-size: 13px; font-weight: 600; color: #92400e; }
.injection-body { padding: 12px 16px; }
.inj-row { display: flex; align-items: center; gap: 16px; }
.inj-field { display: flex; align-items: center; gap: 8px; }
.inj-label { font-size: 12px; color: #64748b; white-space: nowrap; }
.inject-btn { font-weight: 600; }
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/CloudSideView.vue
git commit -m "feat: add scene injection panel to ops tab"
```

---

## Task 4: 新建 TerminalDetailDrawer.vue 组件

**Files:**
- Create: `src/components/TerminalDetailDrawer.vue`

- [ ] **Step 1: 创建抽屉组件基础结构**

```vue
<template>
  <el-drawer
    v-model="drawerVisible"
    title="终端详情"
    direction="rtl"
    size="560px"
    :with-header="true"
    class="terminal-detail-drawer"
  >
    <template #header>
      <div class="drawer-header">
        <div class="drawer-title">
          <span class="drawer-icon">📱</span>
          <span>终端详情</span>
          <el-tag v-if="terminal" :type="statusTag(terminal.status)" size="small" style="margin-left:8px">
            {{ statusLabel(terminal.status) }}
          </el-tag>
        </div>
        <div class="drawer-subtitle" v-if="terminal">{{ terminal.id }} · {{ terminal.location || '-' }}</div>
      </div>
    </template>

    <div class="drawer-body" v-if="terminal">
      <!-- 基本信息区 -->
      <div class="info-section">
        <div class="section-title">基本信息</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">终端ID</span>
            <span class="info-val mono">{{ terminal.id }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">位置</span>
            <span class="info-val">{{ terminal.location || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">在线时长</span>
            <span class="info-val">{{ onlineDuration }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">今日交易</span>
            <span class="info-val">{{ terminal.todayTx || 0 }} 笔</span>
          </div>
        </div>
      </div>

      <!-- 实时指标 -->
      <div class="info-section">
        <div class="section-title">实时指标</div>
        <!-- CPU 和内存迷你折线图 -->
        <div class="mini-charts-row">
          <div class="mini-chart-wrap">
            <div class="mini-chart-label">CPU <span :style="{ color: cpuColor(terminal.cpu) }">{{ terminal.cpu }}%</span></div>
            <v-chart :option="cpuChartOption(terminal.cpuHistory || [terminal.cpu || 0])" style="height:48px;width:100%" autoresize />
          </div>
          <div class="mini-chart-wrap">
            <div class="mini-chart-label">内存 <span :style="{ color: memColor(terminal.memory) }">{{ terminal.memory }}%</span></div>
            <v-chart :option="memChartOption(terminal.memoryHistory || [terminal.memory || 0])" style="height:48px;width:100%" autoresize />
          </div>
        </div>
        <!-- 队列深度和等待时间 -->
        <div class="metrics-row" style="margin-top:10px">
          <div class="metric-item">
            <div class="metric-label">队列深度</div>
            <div class="metric-val highlight">{{ terminal.queueDepth || 0 }}</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">平均等待</div>
            <div class="metric-val highlight">{{ terminal.avgWaitSecs ? terminal.avgWaitSecs + 's' : '-' }}</div>
          </div>
        </div>
      </div>

      <!-- 硬件健康 -->
      <div class="info-section">
        <div class="section-title">硬件状态</div>
        <div class="hw-grid">
          <div class="hw-item" :class="hwClass(terminal.hardware?.printer)">
            <span class="hw-icon">🖨️</span>
            <span class="hw-name">打印机</span>
            <span class="hw-status">{{ hwLabel(terminal.hardware?.printer) }}</span>
          </div>
          <div class="hw-item" :class="hwClass(terminal.hardware?.cardReader)">
            <span class="hw-icon">💳</span>
            <span class="hw-name">读卡器</span>
            <span class="hw-status">{{ hwLabel(terminal.hardware?.cardReader) }}</span>
          </div>
          <div class="hw-item" :class="hwClass(terminal.hardware?.screen)">
            <span class="hw-icon">🖥️</span>
            <span class="hw-name">屏幕</span>
            <span class="hw-status">{{ hwLabel(terminal.hardware?.screen) }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="drawer-empty">
      <el-empty description="未找到终端数据" />
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, defineOptions } from 'vue'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { useTerminalsStore } from '../stores/terminals'

use([LineChart, GridComponent, CanvasRenderer])
defineOptions({ components: { VChart } })

const props = defineProps({
  terminalId: { type: String, default: '' },
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['update:visible'])

const terminalsStore = useTerminalsStore()

const drawerVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v)
})

const terminal = computed(() => {
  return terminalsStore.terminals.find(t => t.id === props.terminalId) || null
})

const onlineDuration = computed(() => {
  if (!terminal.value?.onlineSince) return '-'
  const secs = Math.floor((Date.now() - terminal.value.onlineSince) / 1000)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
})

function cpuChartOption(data) {
  return {
    grid: { top: 2, bottom: 2, left: 2, right: 2 },
    xAxis: { type: 'category', show: false, data: data.map((_, i) => i) },
    yAxis: { type: 'value', show: false, min: 0, max: 100 },
    series: [{
      type: 'line', data, smooth: true, symbol: 'none',
      lineStyle: { color: '#3b82f6', width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.3)' }, { offset: 1, color: 'rgba(59,130,246,0.05)' }] } }
    }]
  }
}

function memChartOption(data) {
  return {
    grid: { top: 2, bottom: 2, left: 2, right: 2 },
    xAxis: { type: 'category', show: false, data: data.map((_, i) => i) },
    yAxis: { type: 'value', show: false, min: 0, max: 100 },
    series: [{
      type: 'line', data, smooth: true, symbol: 'none',
      lineStyle: { color: '#10b981', width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.3)' }, { offset: 1, color: 'rgba(16,185,129,0.05)' }] } }
    }]
  }
}

function statusTag(s) {
  if (s === 'online') return 'success'
  if (s === 'offline') return 'danger'
  return 'warning'
}

function statusLabel(s) {
  if (s === 'online') return '在线'
  if (s === 'offline') return '离线'
  return s || '-'
}

function cpuColor(v) {
  if (v >= 80) return '#ef4444'
  if (v >= 60) return '#f59e0b'
  return '#10b981'
}

function memColor(v) {
  if (v >= 80) return '#ef4444'
  if (v >= 60) return '#f59e0b'
  return '#10b981'
}

function hwClass(hw) {
  return (hw === 'ok' || !hw) ? 'hw-ok' : 'hw-err'
}

function hwLabel(hw) {
  if (hw === 'ok' || !hw) return '正常'
  const labels = { paper_jam: '卡纸', error: '故障', degraded: '降级' }
  return labels[hw] || hw
}
</script>

<style scoped>
.terminal-detail-drawer :deep(.el-drawer__header) {
  margin-bottom: 0; padding: 16px 20px; border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}
.drawer-header { display: flex; flex-direction: column; gap: 2px; }
.drawer-title { display: flex; align-items: center; font-size: 16px; font-weight: 700; color: #1e293b; }
.drawer-icon { margin-right: 6px; }
.drawer-subtitle { font-size: 12px; color: #64748b; margin-left: 22px; }
.drawer-body { padding: 16px 20px; overflow-y: auto; }
.drawer-empty { padding: 40px; }

.info-section { margin-bottom: 20px; }
.section-title { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 10px; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.info-item { background: #f8fafc; border-radius: 8px; padding: 8px 12px; }
.info-label { display: block; font-size: 11px; color: #94a3b8; margin-bottom: 2px; }
.info-val { font-size: 14px; font-weight: 600; color: #334155; }
.mono { font-family: monospace; }

.metrics-row { display: flex; flex-direction: column; gap: 6px; }
.metric-item { display: flex; align-items: center; gap: 8px; }
.metric-label { font-size: 12px; color: #64748b; width: 50px; }
.metric-bar-wrap { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
.metric-bar { height: 100%; border-radius: 4px; transition: width .3s; }
.metric-val { font-size: 13px; font-weight: 600; color: #334155; width: 40px; text-align: right; }
.metric-val.highlight { font-size: 18px; color: #1a8fe3; font-weight: 700; width: auto; }

.mini-charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px; }
.mini-chart-wrap { background: #f8fafc; border-radius: 8px; padding: 8px; }
.mini-chart-label { font-size: 11px; color: #64748b; margin-bottom: 4px; display: flex; justify-content: space-between; }

.hw-grid { display: flex; gap: 10px; }
.hw-item {
  flex: 1; display: flex; align-items: center; gap: 6px;
  background: #f8fafc; border-radius: 8px; padding: 8px 12px;
  border: 1px solid #e2e8f0;
}
.hw-item.hw-err { background: #fef2f2; border-color: #fecaca; }
.hw-icon { font-size: 16px; }
.hw-name { font-size: 13px; color: #334155; }
.hw-status { font-size: 12px; font-weight: 600; margin-left: auto; }
.hw-ok .hw-status { color: #15803d; }
.hw-err .hw-status { color: #dc2626; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/TerminalDetailDrawer.vue
git commit -m "feat: add TerminalDetailDrawer component"
```

---

## Task 5: 指令记录 Tab 增加详情按钮并关联抽屉

**Files:**
- Modify: `src/views/CloudSideView.vue` — 在指令记录 Tab 的终端状态表格中增加操作列

- [ ] **Step 1: 在 CloudSideView.vue 中导入抽屉组件**

在 `<script setup>` 的 import 语句中添加：

```javascript
import TerminalDetailDrawer from '../components/TerminalDetailDrawer.vue'
```

- [ ] **Step 2: 添加抽屉状态和触发函数**

在 script setup 中添加：

```javascript
// 终端详情抽屉
const drawerVisible = ref(false)
const selectedTerminalId = ref('')

function openTerminalDrawer(id) {
  selectedTerminalId.value = id
  drawerVisible.value = true
}
```

- [ ] **Step 3: 在 template 中添加抽屉组件**

在 `</el-tabs>` 之后、`</div>`（cloud-page 结束）之前添加：

```vue
<TerminalDetailDrawer
  v-model:visible="drawerVisible"
  :terminal-id="selectedTerminalId"
/>
```

- [ ] **Step 4: 修改指令记录 Tab 的终端状态表格，增加操作列**

在终端状态表格中，在 `</el-table>` 之前添加操作列：

```vue
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openTerminalDrawer(row.id)">详情</el-button>
          </template>
        </el-table-column>
```

在 el-table 上增加 `ref="terminalTableRef"` 以便引用。

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/CloudSideView.vue
git commit -m "feat: wire terminal detail drawer to commands tab"
```

---

## Task 6: 验证构建

**Run:** `cd D:/yunbianduan/frontend && npm run build`
**Expected:** 成功构建，无报错

**Run:** `npm run test -- --run`
**Expected:** 原有测试通过

---

## Task 7: 手动验证（浏览器）

1. 访问 `/cloud-side`
2. Tab1 "概览" → 原有三栏 + 实时业务流 ✓
3. Tab2 "运维处置" → 三栏 + 底部场景注入面板 ✓
4. Tab3 "指令记录" → 终端状态表格（每行有"详情"按钮）+ 命令历史 ✓
5. Tab4 "告警中心" → 统计条 + 过滤器 + 告警列表 + 分页 + 确认/解决按钮 ✓
6. Tab5 "队列监控" → 5 个科室卡片（NEU/心内/骨科/内科/急诊）+ 阈值标色 ✓
7. Tab6 "消息统计" → 消息速率、类型分布、云边端统计 ✓
8. 点击"详情"按钮 → 右侧抽屉弹出，显示终端详情 ✓
9. 运维处置 → 选择场景 + 终端 → 点击注入 → 二次确认 Dialog → 确认后数据刷新 ✓
