<template>
  <div class="terminals-page">
    <!-- Left Panel -->
    <div class="left-panel">
      <div class="filter-section">
        <el-radio-group v-model="filterStatus" button-style="solid" size="small">
          <el-radio-button value="all">
            全部
            <el-badge :value="terminalsStore.terminals.length" class="filter-badge" />
          </el-radio-button>
          <el-radio-button value="online">
            在线
            <el-badge :value="terminalsStore.onlineCount" class="filter-badge" />
          </el-radio-button>
          <el-radio-button value="degraded">
            降级
            <el-badge :value="terminalsStore.degradedCount" type="warning" class="filter-badge" />
          </el-radio-button>
          <el-radio-button value="offline">
            离线
            <el-badge :value="terminalsStore.offlineCount" type="danger" class="filter-badge" />
          </el-radio-button>
        </el-radio-group>
      </div>
      <div class="terminal-list">
        <div
          v-for="t in filteredTerminals"
          :key="t.id"
          class="terminal-list-item"
          :class="{ active: highlightId === t.id }"
          @click="handleListItemClick(t.id)"
        >
          <span class="status-dot" :class="`dot-${t.status}`"></span>
          <span class="terminal-id">{{ t.id }}</span>
        </div>
      </div>
    </div>

    <!-- Right Content -->
    <div class="right-content">
      <div class="cards-grid">
        <div
          v-for="t in filteredTerminals"
          :id="'card-' + t.id"
          :key="t.id"
          class="terminal-card"
          :class="{
            'card-degraded': t.status === 'degraded',
            'card-offline': t.status === 'offline',
            highlighted: highlightId === t.id
          }"
        >
          <!-- Card Header -->
          <div class="card-header">
            <div class="card-title">
              <span class="t-id">{{ t.id }}</span>
              <span class="t-location">{{ t.location }}</span>
            </div>
            <el-tag
              :type="statusType(t.status)"
              size="small"
            >{{ statusLabel(t.status) }}</el-tag>
          </div>

          <!-- Hardware Row -->
          <div class="hardware-row">
            <el-tooltip content="打印机" placement="top">
              <el-icon
                class="hw-icon"
                :class="hwClass(t.printer)"
              ><Printer /></el-icon>
            </el-tooltip>
            <el-tooltip content="读卡器" placement="top">
              <el-icon
                class="hw-icon"
                :class="hwClass(t.cardReader)"
              ><CreditCard /></el-icon>
            </el-tooltip>
            <el-tooltip content="屏幕" placement="top">
              <el-icon
                class="hw-icon"
                :class="hwClass(t.screen)"
              ><Monitor /></el-icon>
            </el-tooltip>
          </div>

          <!-- Degraded Alert Message -->
          <div v-if="t.status === 'degraded' && t.latestAlert" class="alert-msg">
            <el-icon><Warning /></el-icon>
            {{ t.latestAlert }}
          </div>

          <!-- Queue Row -->
          <div class="queue-row">
            <span class="queue-depth" :class="{ 'depth-high': t.queueDepth > 50 }">
              队列: {{ t.queueDepth ?? 0 }}
            </span>
            <span class="wait-time">
              均等待: {{ formatWait(t.avgWaitMs) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTerminalsStore } from '../stores/terminals'
import { Printer, CreditCard, Monitor, Warning } from '@element-plus/icons-vue'

const terminalsStore = useTerminalsStore()

const filterStatus = ref('all')
const highlightId = ref(null)

const filteredTerminals = computed(() => {
  if (filterStatus.value === 'all') return terminalsStore.terminals
  return terminalsStore.terminals.filter(t => t.status === filterStatus.value)
})

function statusType(status) {
  if (status === 'online') return 'success'
  if (status === 'degraded') return 'warning'
  if (status === 'offline') return 'danger'
  return 'info'
}

function statusLabel(status) {
  if (status === 'online') return '在线'
  if (status === 'degraded') return '降级'
  if (status === 'offline') return '离线'
  return '未知'
}

function hwClass(hwStatus) {
  if (!hwStatus || hwStatus === 'unknown') return 'hw-gray'
  if (hwStatus === 'ok') return 'hw-green'
  return 'hw-red'
}

function formatWait(ms) {
  if (!ms) return '0s'
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

function scrollToCard(id) {
  document.getElementById('card-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function handleListItemClick(id) {
  highlightId.value = id
  scrollToCard(id)
}
</script>

<style scoped>
.terminals-page {
  display: flex;
  gap: 24px;
  padding: 20px;
  min-height: 0;
}

.left-panel {
  width: 240px;
  flex-shrink: 0;
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 16px;
  box-shadow: var(--shadow-card);
  overflow-y: auto;
  align-self: flex-start;
  position: sticky;
  top: 20px;
}

.filter-section {
  margin-bottom: 16px;
}

.filter-badge {
  margin-left: 4px;
}

.terminal-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.terminal-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 13px;
}

.terminal-list-item:hover {
  background: #f0f4ff;
}

.terminal-list-item.active {
  background: #e6f0ff;
  color: var(--color-primary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-online { background: var(--color-success); }
.dot-degraded { background: var(--color-warning); }
.dot-offline { background: var(--color-danger); }

.terminal-id {
  color: var(--text-primary);
}

.right-content {
  flex: 1;
  overflow-y: auto;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.terminal-card {
  background: var(--bg-primary);
  box-shadow: var(--shadow-card);
  border-radius: 8px;
  padding: 16px;
  border-left: 4px solid transparent;
  transition: box-shadow 0.2s;
}

.card-degraded {
  border-left-color: var(--color-warning);
}

.card-offline {
  border-left-color: var(--color-danger);
}

.highlighted {
  box-shadow: 0 0 0 2px var(--color-primary);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.t-id {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
}

.t-location {
  font-size: 12px;
  color: var(--text-secondary);
}

.hardware-row {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}

.hw-icon {
  font-size: 20px;
}

.hw-green { color: var(--color-success); }
.hw-red { color: var(--color-danger); }
.hw-gray { color: #bfbfbf; }

.alert-msg {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-warning);
  background: #fffbe6;
  border-radius: 4px;
  padding: 4px 8px;
  margin-bottom: 10px;
}

.queue-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
}

.depth-high {
  color: var(--color-danger);
  font-weight: 600;
}

.wait-time {
  color: var(--text-secondary);
}
</style>
