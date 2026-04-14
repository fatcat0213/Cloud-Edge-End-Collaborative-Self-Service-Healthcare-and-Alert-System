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
            <v-chart :option="cpuChartOption([terminal.cpu || 0])" style="height:48px;width:100%" autoresize />
          </div>
          <div class="mini-chart-wrap">
            <div class="mini-chart-label">内存 <span :style="{ color: memColor(terminal.memory) }">{{ terminal.memory }}%</span></div>
            <v-chart :option="memChartOption([terminal.memory || 0])" style="height:48px;width:100%" autoresize />
          </div>
        </div>
        <!-- 队列深度和等待时间 -->
        <div class="metrics-row" style="margin-top:10px">
          <div class="metric-item">
            <div class="metric-label">队列深度</div>
            <div class="metric-val highlight">{{ terminal.queue?.depth ?? 0 }}</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">平均等待</div>
            <div class="metric-val highlight">{{ terminal.queue?.avgWaitMs ? Math.round(terminal.queue.avgWaitMs/1000) + 's' : '-' }}</div>
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
