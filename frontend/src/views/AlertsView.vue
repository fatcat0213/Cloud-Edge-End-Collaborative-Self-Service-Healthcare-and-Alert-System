<template>
  <div class="alerts-page">
    <!-- Page Header -->
    <div class="alerts-header">
      <div class="header-left">
        <div class="header-icon">🔔</div>
        <div class="header-titles">
          <div class="header-title">告警中心</div>
          <div class="header-sub">实时监控 · 告警管理 · 云边端融合事件</div>
        </div>
      </div>
      <div class="header-right">
        <div class="status-indicators">
          <div class="indicator">
            <span class="dot dot-green"></span>
            <span>边端规则引擎</span>
          </div>
          <div class="indicator">
            <span class="dot dot-green"></span>
            <span>ML异常检测</span>
          </div>
          <div class="indicator">
            <span class="dot dot-green"></span>
            <span>Redis缓存</span>
          </div>
        </div>
        <button class="refresh-btn" @click="handleRefresh">⟳ 刷新</button>
      </div>
    </div>

    <!-- Stats KPI Row -->
    <div class="stats-row">
      <div class="stat-card" :class="{ 'stat-card-active': store.p0Count > 0 }">
        <div class="stat-num stat-red">{{ store.p0Count }}</div>
        <div class="stat-info">
          <div class="stat-label">P0 紧急</div>
          <div class="stat-sub">需立即处理</div>
        </div>
      </div>
      <div class="stat-card" :class="{ 'stat-card-warn': store.p1Count > 0 }">
        <div class="stat-num stat-amber">{{ store.p1Count }}</div>
        <div class="stat-info">
          <div class="stat-label">P1 重要</div>
          <div class="stat-sub">需尽快处理</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-num stat-blue">{{ p2Count }}</div>
        <div class="stat-info">
          <div class="stat-label">P2 一般</div>
          <div class="stat-sub">常规告警</div>
        </div>
      </div>
      <div class="stat-card" :class="{ 'stat-card-active': store.activeCount > 0 }">
        <div class="stat-num stat-red">{{ store.activeCount }}</div>
        <div class="stat-info">
          <div class="stat-label">活跃</div>
          <div class="stat-sub">未处理告警</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-num stat-blue">{{ store.totalCount }}</div>
        <div class="stat-info">
          <div class="stat-label">告警总数</div>
          <div class="stat-sub">全部告警</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-num stat-green">{{ resolvedCount }}</div>
        <div class="stat-info">
          <div class="stat-label">已解决</div>
          <div class="stat-sub">已处理告警</div>
        </div>
      </div>
    </div>

    <!-- New Alerts Banner -->
    <template v-if="store.hasNewAlerts">
      <el-alert
        type="warning"
        :closable="false"
        class="new-alerts-banner"
        @click="handleRefresh"
      >
        <template #title>
          <span>检测到新告警，点击刷新列表</span>
        </template>
      </el-alert>
    </template>

    <!-- Filter Toolbar -->
    <div class="filter-bar">
      <div class="view-toggle">
        <button :class="{ active: viewMode === 'table' }" @click="viewMode = 'table'">📋 列表</button>
        <button :class="{ active: viewMode === 'timeline' }" @click="viewMode = 'timeline'">📡 时间轴</button>
      </div>

      <el-select v-model="levelFilter" placeholder="告警级别" clearable size="small" style="width: 110px">
        <el-option label="全部级别" value="" />
        <el-option label="P0 紧急" value="P0" />
        <el-option label="P1 重要" value="P1" />
        <el-option label="P2 一般" value="P2" />
      </el-select>

      <el-select v-model="sourceFilter" placeholder="告警来源" clearable size="small" style="width: 140px">
        <el-option label="全部来源" value="" />
        <el-option label="边端 Drools" value="EDGE" />
        <el-option label="云端服务" value="CLOUD" />
        <el-option label="终端设备" value="TERMINAL" />
      </el-select>

      <el-select v-model="typeFilter" placeholder="告警类型" clearable size="small" style="width: 130px">
        <el-option label="全部类型" value="" />
        <el-option label="硬件故障" value="HARDWARE" />
        <el-option label="业务异常" value="BUSINESS" />
        <el-option label="网络告警" value="NETWORK" />
        <el-option label="系统事件" value="SYSTEM" />
        <el-option label="异常检测" value="ANOMALY" />
        <el-option label="排队预警" value="QUEUE" />
        <el-option label="心跳告警" value="HEARTBEAT" />
        <el-option label="支付异常" value="PAYMENT" />
        <el-option label="设备故障" value="DEVICE" />
      </el-select>

      <el-select v-model="statusFilter" placeholder="告警状态" clearable size="small" style="width: 130px">
        <el-option label="全部状态" value="" />
        <el-option label="活跃" value="ACTIVE" />
        <el-option label="已确认" value="ACKNOWLEDGED" />
        <el-option label="已解决" value="RESOLVED" />
      </el-select>

      <el-input
        v-model="terminalFilter"
        placeholder="终端ID"
        clearable
        size="small"
        style="width: 130px"
      />

      <el-date-picker
        v-model="dateRange"
        type="datetimerange"
        range-separator="至"
        start-placeholder="开始时间"
        end-placeholder="结束时间"
        size="small"
        style="width: 340px"
      />

      <div class="quick-badges">
        <span
          class="quick-badge danger"
          :class="{ active: levelFilter === 'P0' }"
          @click="quickBadgeFilter('P0')"
        >P0({{ store.p0Count }})</span>
        <span
          class="quick-badge warn"
          :class="{ active: levelFilter === 'P1' }"
          @click="quickBadgeFilter('P1')"
        >P1({{ store.p1Count }})</span>
        <span
          class="quick-badge danger"
          :class="{ active: statusFilter === 'ACTIVE' }"
          @click="quickBadgeFilter('ACTIVE')"
        >活跃({{ store.activeCount }})</span>
      </div>
    </div>

    <!-- Table View -->
    <template v-if="viewMode === 'table'">
      <div class="table-card">
        <el-table
          :data="displayAlerts"
          :row-class-name="rowClass"
          @row-click="openDrawer"
          style="width: 100%"
        >
          <el-table-column label="时间" width="170">
            <template #default="{ row }">
              <span class="mono">{{ formatTime(row.timestamp) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="级别" width="80">
            <template #default="{ row }">
              <el-tag type="danger" effect="dark" class="level-tag">{{ row.level }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="来源" width="120">
            <template #default="{ row }">
              <span class="source-badge" :class="sourceBadgeClass(row.source)">
                {{ sourceLabel(row.source) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="终端" width="130">
            <template #default="{ row }">
              <span class="terminal-id">{{ row.terminalId || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="100">
            <template #default="{ row }">
              <span class="type-label">{{ typeLabel(row.type) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="告警消息" min-width="200">
            <template #default="{ row }">
              <span class="alert-msg">{{ row.message }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" effect="plain">
                {{ statusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <div class="tl-actions">
                <el-button
                  v-if="row.status !== 'ACKNOWLEDGED' && row.status !== 'RESOLVED'"
                  size="small"
                  type="warning"
                  @click.stop="handleAcknowledge(row)"
                >确认</el-button>
                <el-button
                  v-if="row.status !== 'RESOLVED'"
                  size="small"
                  type="success"
                  @click.stop="handleResolve(row)"
                >解决</el-button>
                <span v-if="row.status === 'RESOLVED'" class="resolved-label">已解决</span>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-bar">
        <span class="pagination-info">
          共 {{ store.filteredAlerts.length }} 条，第 {{ store.currentPage }} / {{ store.totalPages || 1 }} 页
        </span>
        <el-pagination
          v-model:current-page="store.currentPage"
          :page-size="store.pageSize"
          :total="store.filteredAlerts.length"
          layout="prev, pager, next"
          background
        />
      </div>
    </template>

    <!-- Timeline View -->
    <template v-if="viewMode === 'timeline'">
      <div class="table-card" style="padding: 16px">
        <template v-if="displayAlerts.length > 0">
          <div
            v-for="item in displayAlerts"
            :key="item.id"
            class="timeline-item"
            @click="openDrawer(item)"
          >
            <div class="tl-dot" :class="timelineDotClass(item.level)"></div>
            <div class="tl-body">
              <div class="tl-header">
                <el-tag type="danger" effect="dark" class="level-tag">{{ item.level }}</el-tag>
                <span class="source-badge" :class="sourceBadgeClass(item.source)">
                  {{ sourceLabel(item.source) }}
                </span>
                <span class="type-label">{{ typeLabel(item.type) }}</span>
                <span class="tl-terminal">{{ item.terminalId || '—' }}</span>
                <span class="tl-time">{{ formatTime(item.timestamp) }}</span>
              </div>
              <div class="tl-msg">{{ item.message }}</div>
              <div class="tl-actions">
                <el-button
                  v-if="item.status !== 'ACKNOWLEDGED' && item.status !== 'RESOLVED'"
                  size="small"
                  type="warning"
                  @click.stop="handleAcknowledge(item)"
                >确认</el-button>
                <el-button
                  v-if="item.status !== 'RESOLVED'"
                  size="small"
                  type="success"
                  @click.stop="handleResolve(item)"
                >解决</el-button>
                <span v-if="item.status === 'RESOLVED'" class="resolved-label">已解决</span>
              </div>
            </div>
          </div>
        </template>
        <el-empty v-else description="暂无告警数据" />
      </div>

      <div class="pagination-bar">
        <span class="pagination-info">
          共 {{ store.filteredAlerts.length }} 条，第 {{ store.currentPage }} / {{ store.totalPages || 1 }} 页
        </span>
        <el-pagination
          v-model:current-page="store.currentPage"
          :page-size="store.pageSize"
          :total="store.filteredAlerts.length"
          layout="prev, pager, next"
          background
        />
      </div>
    </template>

    <!-- Detail Drawer -->
    <el-drawer
      v-model="drawerVisible"
      title="告警详情"
      size="480px"
      direction="rtl"
    >
      <template v-if="selectedAlert">
        <div class="detail-section">
          <div class="detail-row">
            <span class="detail-label">告警ID</span>
            <span class="detail-value mono">{{ selectedAlert.id }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">告警级别</span>
            <el-tag type="danger" effect="dark" class="level-tag">{{ selectedAlert.level }}</el-tag>
          </div>
          <div class="detail-row">
            <span class="detail-label">告警来源</span>
            <span class="source-badge" :class="sourceBadgeClass(selectedAlert.source)">
              {{ sourceLabel(selectedAlert.source) }}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">终端ID</span>
            <span class="terminal-id">{{ selectedAlert.terminalId || '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">告警类型</span>
            <span class="type-label">{{ typeLabel(selectedAlert.type) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">发生时间</span>
            <span class="detail-value mono">{{ formatTime(selectedAlert.timestamp) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">当前状态</span>
            <el-tag :type="statusTagType(selectedAlert.status)" effect="plain">
              {{ statusLabel(selectedAlert.status) }}
            </el-tag>
          </div>
          <div class="detail-row detail-msg">
            <span class="detail-label">告警消息</span>
            <span class="detail-value">{{ selectedAlert.message }}</span>
          </div>
        </div>

        <div class="detail-json-section">
          <div class="json-header">原始数据</div>
          <pre class="json-body">{{ JSON.stringify(selectedAlert, null, 2) }}</pre>
        </div>

        <div class="drawer-actions">
          <el-button
            v-if="selectedAlert.status !== 'ACKNOWLEDGED' && selectedAlert.status !== 'RESOLVED'"
            type="warning"
            @click="handleAcknowledge(selectedAlert)"
          >确认告警</el-button>
          <el-button
            v-if="selectedAlert.status !== 'RESOLVED'"
            type="success"
            @click="handleResolve(selectedAlert)"
          >解决告警</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAlertsStore } from '../stores/alerts'

const POLLING_INTERVAL_MS = 5000

const store = useAlertsStore()

// View mode
const viewMode = ref('table')

// Drawer
const drawerVisible = ref(false)
const selectedAlert = ref(null)

// Filters
const levelFilter = ref('')
const sourceFilter = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
const terminalFilter = ref('')
const dateRange = ref(null)

// Computed counts
const p2Count = computed(() => store.alerts.filter(a => a.level === 'P2').length)
const resolvedCount = computed(() => store.alerts.filter(a => a.status === 'RESOLVED').length)

// Source filter is client-side only
const sourceFilteredAlerts = computed(() => {
  if (!sourceFilter.value) return store.pagedAlerts
  return store.pagedAlerts.filter(a => (a.source || 'EDGE').toUpperCase() === sourceFilter.value)
})

// Switch display source when sourceFilter changes
const displayAlerts = computed(() => {
  if (sourceFilter.value) return sourceFilteredAlerts.value
  return store.pagedAlerts
})

// Sync client-side filters to store
watch(levelFilter, (val) => {
  store.setFilter({ level: val })
})
watch(typeFilter, (val) => {
  store.setFilter({ type: val })
})
watch(statusFilter, (val) => {
  store.setFilter({ status: val })
})
watch(terminalFilter, (val) => {
  store.setFilter({ terminalId: val })
})
watch(dateRange, (val) => {
  if (val && val.length === 2) {
    store.setFilter({ startTime: val[0], endTime: val[1] })
  } else {
    store.setFilter({ startTime: null, endTime: null })
  }
})
watch(sourceFilter, (val) => {
  // Source filter is client-side only, just reset store filter to trigger re-render
  if (!val) {
    store.setFilter({})
  }
})

// Handlers
async function handleRefresh() {
  try {
    store.setPage(1)
    await store.fetchAlerts()
    store.acknowledgeNewAlerts()
  } catch (e) {
    ElMessage.error('刷新失败')
  }
}

async function handleAcknowledge(row) {
  try {
    await store.acknowledge(row.id)
  } catch (e) {
    ElMessage.error('确认失败')
  }
}

async function handleResolve(row) {
  try {
    await store.resolve(row.id)
  } catch (e) {
    ElMessage.error('解决失败')
  }
}

function openDrawer(row) {
  selectedAlert.value = row
  drawerVisible.value = true
}

function rowClass({ row }) {
  if (row.level === 'P0') return 'danger-row'
  if (row.level === 'P1') return 'warning-row'
  return ''
}

function quickBadgeFilter(type) {
  if (type === 'P0') {
    levelFilter.value = levelFilter.value === 'P0' ? '' : 'P0'
  } else if (type === 'P1') {
    levelFilter.value = levelFilter.value === 'P1' ? '' : 'P1'
  } else if (type === 'ACTIVE') {
    statusFilter.value = statusFilter.value === 'ACTIVE' ? '' : 'ACTIVE'
  }
}

// Label helpers
function sourceLabel(source) {
  const map = {
    EDGE: '边端',
    CLOUD: '云端',
    TERMINAL: '终端'
  }
  return map[(source || 'EDGE').toUpperCase()] || '未知'
}

function typeLabel(type) {
  const map = {
    HARDWARE: '硬件故障',
    BUSINESS: '业务异常',
    NETWORK: '网络告警',
    SYSTEM: '系统事件',
    ANOMALY: '异常检测',
    QUEUE: '排队预警',
    HEARTBEAT: '心跳告警',
    PAYMENT: '支付异常',
    DEVICE: '设备故障'
  }
  return map[(type || '').toUpperCase()] || type || '未知'
}

function statusLabel(status) {
  const map = {
    ACTIVE: '活跃',
    ACKNOWLEDGED: '已确认',
    RESOLVED: '已解决'
  }
  return map[(status || 'ACTIVE').toUpperCase()] || '活跃'
}

function statusTagType(status) {
  if (!status || status === 'ACTIVE') return 'danger'
  if (status === 'ACKNOWLEDGED') return 'warning'
  if (status === 'RESOLVED') return 'success'
  return 'info'
}

function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('zh-CN')
}

function sourceBadgeClass(source) {
  const s = (source || 'EDGE').toUpperCase()
  if (s === 'EDGE') return 'source-edge'
  if (s === 'CLOUD') return 'source-cloud'
  if (s === 'TERMINAL') return 'source-terminal'
  return 'source-edge'
}

function timelineDotClass(level) {
  if (level === 'P0') return 'tlvl-p0'
  if (level === 'P1') return 'tlvl-p1'
  if (level === 'P2') return 'tlvl-p2'
  return 'tlvl-info'
}

// Lifecycle
onMounted(() => {
  store.startPolling(POLLING_INTERVAL_MS)
})

onUnmounted(() => {
  store.stopPolling()
})
</script>

<style scoped>
.alerts-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  background: #f0f4f8;
}

/* Header */
.alerts-header {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: 14px;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  gap: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-title {
  font-size: 20px;
  font-weight: bold;
  color: white;
}

.header-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
}

.header-right {
  display: flex;
  gap: 14px;
  align-items: center;
}

.status-indicators {
  display: flex;
  gap: 12px;
}

.indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.dot-green {
  background: #22c55e;
  box-shadow: 0 0 6px #22c55e;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  color: white !important;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 12px;
  cursor: pointer;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  gap: 12px;
  align-items: center;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  transition: box-shadow 0.2s;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.stat-card-active {
  background: #fff5f5;
  border-color: #fca5a5;
}

.stat-card-warn {
  background: #fffbeb;
  border-color: #fde68a;
}

.stat-num {
  font-size: 28px;
  font-weight: bold;
  min-width: 32px;
  color: #dc2626;
}

.stat-amber {
  color: #d97706 !important;
}

.stat-blue {
  color: #2563eb !important;
}

.stat-green {
  color: #059669 !important;
}

.stat-red {
  color: #dc2626 !important;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 12px;
  font-weight: bold;
  color: #334155;
}

.stat-sub {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

/* Filter Bar */
.filter-bar {
  background: white;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.view-toggle {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
}

.view-toggle button {
  padding: 6px 14px;
  font-size: 12px;
  border: none;
  background: #f8fafc;
  cursor: pointer;
  color: #64748b;
}

.view-toggle button.active {
  background: #1e40af;
  color: white;
}

.quick-badges {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.quick-badge {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: bold;
  background: #f1f5f9;
  color: #475569;
  cursor: pointer;
  border: 1px solid transparent;
}

.quick-badge:hover {
  background: #e2e8f0;
}

.quick-badge.active {
  background: #fff1f2;
  color: #dc2626;
  border-color: #fca5a5;
}

.quick-badge.warn.active {
  background: #fffbeb;
  color: #d97706;
  border-color: #fde68a;
}

.quick-badge.danger {
  color: #dc2626;
}

/* Table Card */
.table-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  overflow: hidden;
}

/* Timeline */
.timeline-item {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
}

.timeline-item:last-child {
  border-bottom: none;
}

.timeline-item:hover .tl-body {
  background: #f8fafc;
}

.tl-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.tlvl-p0 {
  background: #ef4444;
  box-shadow: 0 0 6px #ef4444;
}

.tlvl-p1 {
  background: #f59e0b;
}

.tlvl-p2 {
  background: #3b82f6;
}

.tlvl-info {
  background: #94a3b8;
}

.tl-body {
  flex: 1;
  background: #fafafa;
  border-radius: 8px;
  padding: 10px 12px;
}

.tl-header {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.tl-terminal {
  font-size: 11px;
  color: #64748b;
  font-family: monospace;
  margin-left: auto;
}

.tl-time {
  font-size: 11px;
  color: #94a3b8;
}

.tl-msg {
  font-size: 13px;
  color: #1e293b;
  margin-bottom: 8px;
}

.tl-actions {
  display: flex;
  gap: 6px;
}

/* Pagination */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #f1f5f9;
  background: white;
  border-radius: 0 0 12px 12px;
}

.pagination-info {
  font-size: 12px;
  color: #64748b;
}

/* Element Plus overrides */
:deep(.el-table th.el-table__cell) {
  background: #f8fafc !important;
  color: #334155 !important;
  font-weight: bold;
  font-size: 12px;
}

:deep(.el-table td.el-table__cell) {
  font-size: 13px;
}

:deep(.danger-row) {
  background: #fff5f5 !important;
}

:deep(.warning-row) {
  background: #fffbeb !important;
}

/* Badge and Tag styles */
.level-tag {
  font-weight: 700;
}

.terminal-id {
  font-family: monospace;
  font-size: 12px;
  color: #334155;
}

.source-badge {
  font-size: 11px;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 4px;
}

.source-edge {
  background: #eff6ff;
  color: #1d4ed8;
}

.source-cloud {
  background: #f5f3ff;
  color: #6d28d9;
}

.source-terminal {
  background: #f0fdf4;
  color: #15803d;
}

.type-label {
  font-size: 12px;
  color: #475569;
}

.alert-msg {
  font-size: 12px;
  color: #1e293b;
}

.resolved-label {
  font-size: 12px;
  color: #94a3b8;
}

.new-alerts-banner {
  cursor: pointer;
  border-radius: 10px;
}

/* Drawer detail styles */
.detail-section {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.detail-row {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
  align-items: center;
}

.detail-msg {
  flex-direction: column;
  align-items: flex-start;
}

.detail-label {
  font-weight: 600;
  color: #64748b;
  font-size: 12px;
  min-width: 80px;
  flex-shrink: 0;
}

.detail-value {
  font-size: 13px;
  color: #1e293b;
}

.mono {
  font-family: monospace;
  font-size: 11px;
  color: #64748b;
}

.detail-json-section {
  margin-top: 16px;
}

.json-header {
  font-size: 12px;
  font-weight: bold;
  color: #64748b;
  margin-bottom: 8px;
}

.json-body {
  background: #f5f7fa;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  font-size: 11px;
  max-height: 300px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  color: #334155;
}

.drawer-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
</style>
