<template>
  <div>
    <div class="toolbar">
      <el-radio-group v-model="filter" size="small">
        <el-radio-button value="all">全部 ({{ terminalsStore.terminals.length }})</el-radio-button>
        <el-radio-button value="online">在线 ({{ terminalsStore.onlineCount }})</el-radio-button>
        <el-radio-button value="offline">离线 ({{ terminalsStore.offlineCount }})</el-radio-button>
        <el-radio-button value="degraded">降级 ({{ terminalsStore.degradedCount }})</el-radio-button>
      </el-radio-group>
      <span class="refresh-hint">每 5 秒自动刷新</span>
    </div>

    <el-row :gutter="16" style="margin-top:16px">
      <el-col :span="8" v-for="t in filteredTerminals" :key="t.id" style="margin-bottom:16px">
        <div class="terminal-card" :class="t.status">
          <div class="card-header">
            <div>
              <div class="terminal-id">{{ t.id }}</div>
              <div class="terminal-loc">{{ t.location }}</div>
            </div>
            <el-tag :type="statusType(t.status)" effect="dark" size="small">
              {{ statusLabel(t.status) }}
            </el-tag>
          </div>

          <div class="hardware-grid">
            <div class="hw-item">
              <el-icon :color="hwColor(t.hardware.printer)"><Printer /></el-icon>
              <span>打印机</span>
              <span class="hw-val" :style="{color: hwColor(t.hardware.printer)}">{{ hwLabel(t.hardware.printer) }}</span>
            </div>
            <div class="hw-item">
              <el-icon :color="hwColor(t.hardware.cardReader)"><CreditCard /></el-icon>
              <span>读卡器</span>
              <span class="hw-val" :style="{color: hwColor(t.hardware.cardReader)}">{{ hwLabel(t.hardware.cardReader) }}</span>
            </div>
            <div class="hw-item">
              <el-icon :color="hwColor(t.hardware.screen)"><Monitor /></el-icon>
              <span>屏幕</span>
              <span class="hw-val" :style="{color: hwColor(t.hardware.screen)}">{{ hwLabel(t.hardware.screen) }}</span>
            </div>
          </div>

          <div class="queue-info">
            <div class="queue-item">
              <span class="q-label">排队人数</span>
              <span class="q-val" :style="{ color: t.queue.depth > 50 ? '#f85149' : '#e6edf3' }">{{ t.queue.depth }}</span>
            </div>
            <div class="queue-item">
              <span class="q-label">平均等待</span>
              <span class="q-val" :style="{ color: t.queue.avgWaitMs > 30000 ? '#e3b341' : '#e6edf3' }">
                {{ t.queue.avgWaitMs ? (t.queue.avgWaitMs / 1000).toFixed(0) + 's' : '-' }}
              </span>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTerminalsStore } from '../stores/terminals'

const terminalsStore = useTerminalsStore()
const filter = ref('all')

const filteredTerminals = computed(() => {
  if (filter.value === 'all') return terminalsStore.terminals
  return terminalsStore.terminals.filter(t => t.status === filter.value)
})

const statusType = s => ({ online: 'success', offline: 'danger', degraded: 'warning' }[s] || 'info')
const statusLabel = s => ({ online: '在线', offline: '离线', degraded: '降级运行' }[s] || s)
const hwColor = s => ({ ok: '#3fb950', error: '#f85149', paper_jam: '#e3b341' }[s] || '#8b949e')
const hwLabel = s => ({ ok: '正常', error: '故障', paper_jam: '缺纸' }[s] || s)
</script>

<style scoped>
.toolbar { display: flex; align-items: center; justify-content: space-between; }
.refresh-hint { font-size: 12px; color: #484f58; }
.terminal-card {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 10px;
  padding: 16px;
  transition: border-color 0.2s;
}
.terminal-card.offline { border-color: #f85149; }
.terminal-card.degraded { border-color: #e3b341; }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.terminal-id { font-size: 18px; font-weight: 700; color: #e6edf3; }
.terminal-loc { font-size: 12px; color: #8b949e; margin-top: 2px; }
.hardware-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.hw-item { display: flex; flex-direction: column; align-items: center; gap: 4px; background: #1c2128; border-radius: 6px; padding: 8px 4px; font-size: 11px; color: #8b949e; }
.hw-val { font-size: 12px; font-weight: 600; }
.queue-info { display: flex; gap: 16px; border-top: 1px solid #21262d; padding-top: 12px; }
.queue-item { flex: 1; text-align: center; }
.q-label { display: block; font-size: 11px; color: #8b949e; }
.q-val { font-size: 20px; font-weight: 700; }
</style>
