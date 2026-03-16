<template>
  <div class="dashboard-page">
    <!-- Row 1: KPI Cards -->
    <el-row :gutter="20" class="kpi-row">
      <el-col :span="6">
        <div class="kpi-card kpi-primary">
          <div class="kpi-label">在线终端</div>
          <div class="kpi-value">{{ terminalsStore.onlineCount }}</div>
          <div class="kpi-trend">{{ onlineTrend }} <span>较上次</span></div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="kpi-card kpi-danger" :class="{ 'kpi-danger-active': alertsStore.p0Count > 0 }">
          <div class="kpi-label">P0 告警</div>
          <div class="kpi-value">{{ alertsStore.p0Count }}</div>
          <div class="kpi-trend" :style="{color: p0Trend==='↑' ? 'var(--color-danger)' : 'var(--color-success)'}">{{ p0Trend }} <span>较上次</span></div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="kpi-card kpi-warning">
          <div class="kpi-label">P1 告警</div>
          <div class="kpi-value">{{ alertsStore.p1Count }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="kpi-card kpi-success">
          <div class="kpi-label">支付成功率</div>
          <div class="kpi-value">{{ statsStore.paymentSuccessRate ?? '暂无数据' }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- Row 2: Charts -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="14">
        <div class="chart-card">
          <div class="chart-title">告警事件时间线</div>
          <v-chart class="chart" :option="timelineOption" autoresize />
        </div>
      </el-col>
      <el-col :span="10">
        <div class="chart-card">
          <div class="chart-title">终端状态分布</div>
          <v-chart class="chart" :option="pieOption" autoresize />
        </div>
      </el-col>
    </el-row>

    <!-- Row 3: Recent Alerts Table -->
    <div class="table-card">
      <div class="table-title">最近告警</div>
      <el-table
        :data="recentAlerts"
        :row-class-name="tableRowClassName"
        style="width: 100%"
      >
        <el-table-column prop="timestamp" label="时间" width="180" :formatter="formatTime" />
        <el-table-column prop="level" label="级别" width="80">
          <template #default="{ row }">
            <el-tag :type="row.level === 'P0' ? 'danger' : 'warning'" size="small">
              {{ row.level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="terminalId" label="终端" width="100" />
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column prop="message" label="消息" show-overflow-tooltip />
      </el-table>
      <div class="table-footer">
        <router-link to="/alerts" class="view-all-link">查看全部 →</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useAlertsStore } from '../stores/alerts'
import { useTerminalsStore } from '../stores/terminals'
import { useStatsStore } from '../stores/stats'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([LineChart, PieChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer])

const alertsStore = useAlertsStore()
const terminalsStore = useTerminalsStore()
const statsStore = useStatsStore()

const recentAlerts = computed(() => alertsStore.alerts.slice(0, 8))

// Track previous values for trend arrows
const prevOnline = ref(terminalsStore.onlineCount)
const prevP0 = ref(alertsStore.p0Count)
watch(() => terminalsStore.onlineCount, (val, old) => { prevOnline.value = old ?? val })
watch(() => alertsStore.p0Count, (val, old) => { prevP0.value = old ?? val })
const onlineTrend = computed(() => terminalsStore.onlineCount >= prevOnline.value ? '↑' : '↓')
const p0Trend = computed(() => alertsStore.p0Count <= prevP0.value ? '↓' : '↑')

const last20Alerts = computed(() => alertsStore.alerts.slice(0, 20))

const timelineOption = computed(() => {
  const xData = last20Alerts.value.map(a => {
    const d = new Date(a.timestamp)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
  })
  const p0Data = last20Alerts.value.map(a => a.level === 'P0' ? 1 : 0)
  const p1Data = last20Alerts.value.map(a => a.level === 'P1' ? 1 : 0)
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['P0', 'P1'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: xData, axisLabel: { rotate: 45, fontSize: 10 } },
    yAxis: { type: 'value', min: 0, max: 1, interval: 1 },
    series: [
      {
        name: 'P0',
        type: 'line',
        data: p0Data,
        itemStyle: { color: '#ff4d4f' },
        lineStyle: { color: '#ff4d4f' },
        step: 'end'
      },
      {
        name: 'P1',
        type: 'line',
        data: p1Data,
        itemStyle: { color: '#faad14' },
        lineStyle: { color: '#faad14' },
        step: 'end'
      }
    ]
  }
})

const pieOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { orient: 'vertical', left: 'left' },
  series: [
    {
      name: '终端状态',
      type: 'pie',
      radius: '60%',
      data: [
        { value: terminalsStore.onlineCount, name: '在线', itemStyle: { color: '#52c41a' } },
        { value: terminalsStore.degradedCount, name: '降级', itemStyle: { color: '#faad14' } },
        { value: terminalsStore.offlineCount, name: '离线', itemStyle: { color: '#ff4d4f' } }
      ]
    }
  ]
}))

function tableRowClassName({ row }) {
  return row.level === 'P0' ? 'danger-row' : ''
}

function formatTime(row) {
  if (!row.timestamp) return '-'
  return new Date(row.timestamp).toLocaleString('zh-CN')
}
</script>

<style scoped>
.dashboard-page {
  padding: 20px;
}

.kpi-row {
  margin-bottom: 20px;
}

.kpi-card {
  background: var(--bg-primary);
  box-shadow: var(--shadow-card);
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid transparent;
}

.kpi-primary { border-left-color: var(--color-primary); }
.kpi-danger { border-left-color: var(--color-danger); }
.kpi-warning { border-left-color: var(--color-warning); }
.kpi-success { border-left-color: var(--color-success); }

.kpi-danger-active {
  background: #fff2f0;
}

.kpi-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.kpi-value {
  font-size: 32px;
  font-weight: 600;
  color: var(--text-primary);
}

.kpi-trend {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.kpi-trend span {
  font-size: 11px;
  opacity: 0.7;
}

.chart-row {
  margin-bottom: 20px;
}

.chart-card {
  background: var(--bg-primary);
  box-shadow: var(--shadow-card);
  border-radius: 8px;
  padding: 20px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.chart {
  height: 260px;
  width: 100%;
}

.table-card {
  background: var(--bg-primary);
  box-shadow: var(--shadow-card);
  border-radius: 8px;
  padding: 20px;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.table-footer {
  margin-top: 16px;
  text-align: right;
}

.view-all-link {
  color: var(--color-primary);
  text-decoration: none;
  font-size: 14px;
}

.view-all-link:hover {
  text-decoration: underline;
}

:deep(.danger-row) {
  background: #fff2f0 !important;
}

:deep(.el-table-row.danger-row) {
  background: #fff2f0;
}
</style>
