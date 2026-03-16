<template>
  <div class="alerts-page">
    <!-- Top Stats Bar -->
    <div class="stats-bar">
      <el-tag type="danger" size="large">P0 未处理 {{ alertsStore.p0Count }}</el-tag>
      <el-tag type="warning" size="large">P1 未处理 {{ alertsStore.p1Count }}</el-tag>
      <el-tag type="info" size="large">今日总计 {{ alertsStore.totalCount }}</el-tag>
      <el-tag type="success" size="large">
        已处理 {{ Math.max(0, alertsStore.totalCount - alertsStore.p0Count - alertsStore.p1Count) }}
      </el-tag>
    </div>

    <!-- New Alerts Banner -->
    <el-alert
      v-if="alertsStore.hasNewAlerts"
      type="warning"
      :closable="false"
      class="new-alerts-banner"
      @click="handleRefresh"
    >
      <template #title>
        有新告警，点击刷新
      </template>
    </el-alert>

    <!-- Toolbar -->
    <div class="toolbar">
      <el-select v-model="levelFilter" placeholder="级别" clearable style="width: 100px">
        <el-option label="全部" value="" />
        <el-option label="P0" value="P0" />
        <el-option label="P1" value="P1" />
      </el-select>

      <el-select v-model="typeFilter" placeholder="类型" clearable style="width: 140px">
        <el-option label="全部" value="" />
        <el-option label="HARDWARE" value="HARDWARE" />
        <el-option label="BUSINESS" value="BUSINESS" />
      </el-select>

      <el-input
        v-model="terminalFilter"
        placeholder="终端ID"
        clearable
        style="width: 140px"
      />

      <el-date-picker
        v-model="dateRange"
        type="datetimerange"
        range-separator="至"
        start-placeholder="开始时间"
        end-placeholder="结束时间"
        style="width: 360px"
      />

      <el-button type="primary" :icon="Refresh" @click="handleRefresh">刷新</el-button>
    </div>

    <!-- Alerts Table -->
    <div class="table-card">
      <el-table
        :data="alertsStore.pagedAlerts"
        :row-class-name="rowClass"
        style="width: 100%"
        @row-click="openDrawer"
      >
        <el-table-column label="时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column label="级别" width="80">
          <template #default="{ row }">
            <el-tag :type="row.level === 'P0' ? 'danger' : 'warning'" size="small">
              {{ row.level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="terminalId" label="终端" width="100" />
        <el-table-column label="类型" width="130">
          <template #default="{ row }">
            <el-icon v-if="row.type === 'HARDWARE'"><Tools /></el-icon>
            <el-icon v-else><DataAnalysis /></el-icon>
            {{ row.type }}
          </template>
        </el-table-column>
        <el-table-column prop="message" label="消息" show-overflow-tooltip />
      </el-table>

      <!-- Pagination -->
      <div class="pagination-bar">
        <el-pagination
          :total="alertsStore.filteredAlerts.length"
          :page-size="20"
          v-model:current-page="alertsStore.currentPage"
          layout="prev, pager, next, total"
          @current-change="alertsStore.setPage"
        />
      </div>
    </div>

    <!-- Alert Detail Drawer -->
    <el-drawer v-model="drawerVisible" title="告警详情" size="400px">
      <template v-if="selectedAlert">
        <div class="detail-item">
          <span class="detail-label">告警 ID:</span>
          <span>{{ selectedAlert.id }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">级别:</span>
          <el-tag :type="selectedAlert.level === 'P0' ? 'danger' : 'warning'">
            {{ selectedAlert.level }}
          </el-tag>
        </div>
        <div class="detail-item">
          <span class="detail-label">终端:</span>
          <span>{{ selectedAlert.terminalId }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">时间:</span>
          <span>{{ formatTime(selectedAlert.timestamp) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">消息:</span>
          <span>{{ selectedAlert.message }}</span>
        </div>
        <div class="detail-item detail-json">
          <span class="detail-label">原始 Payload:</span>
          <pre class="json-payload">{{ JSON.stringify(selectedAlert, null, 2) }}</pre>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAlertsStore } from '../stores/alerts'
import { Refresh, Tools, DataAnalysis } from '@element-plus/icons-vue'

const alertsStore = useAlertsStore()

const levelFilter = ref('')
const typeFilter = ref('')
const terminalFilter = ref('')
const dateRange = ref(null)

const drawerVisible = ref(false)
const selectedAlert = ref(null)

let filterDebounce = null

function applyFilters() {
  clearTimeout(filterDebounce)
  filterDebounce = setTimeout(() => {
    alertsStore.setFilter({
      level: levelFilter.value,
      type: typeFilter.value,
      terminalId: terminalFilter.value,
      startTime: dateRange.value?.[0] ?? null,
      endTime: dateRange.value?.[1] ?? null
    })
  }, 300)
}

watch(levelFilter, applyFilters)
watch(typeFilter, applyFilters)
watch(terminalFilter, applyFilters)
watch(dateRange, applyFilters)

async function handleRefresh() {
  alertsStore.setPage(1)
  await alertsStore.fetchAlerts()
  // Reset previousTotal so banner clears after manual refresh
  alertsStore.acknowledgeNewAlerts()
}

function rowClass({ row }) {
  return row.level === 'P0' ? 'danger-row' : ''
}

function formatTime(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN')
}

function openDrawer(row) {
  selectedAlert.value = row
  drawerVisible.value = true
}
</script>

<style scoped>
.alerts-page {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.new-alerts-banner {
  cursor: pointer;
}

.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  background: var(--bg-primary);
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: var(--shadow-card);
}

.table-card {
  background: var(--bg-primary);
  box-shadow: var(--shadow-card);
  border-radius: 8px;
  padding: 20px;
}

.pagination-bar {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

:deep(.danger-row) {
  background: #fff2f0 !important;
}

.detail-item {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: flex-start;
}

.detail-label {
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 90px;
  flex-shrink: 0;
}

.detail-json {
  flex-direction: column;
  gap: 8px;
}

.json-payload {
  background: #f5f7fa;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  overflow: auto;
  max-height: 400px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
