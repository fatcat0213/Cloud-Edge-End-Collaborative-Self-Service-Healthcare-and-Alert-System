<template>
  <div class="dashboard">
    <!-- KPI Cards -->
    <el-row :gutter="16" class="kpi-row">
      <el-col :span="6">
        <div class="kpi-card">
          <div class="kpi-icon" style="background:#1a3a52">
            <el-icon size="22" color="#58a6ff"><Monitor /></el-icon>
          </div>
          <div class="kpi-info">
            <div class="kpi-value">{{ terminalsStore.onlineCount }}</div>
            <div class="kpi-label">在线终端</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="kpi-card">
          <div class="kpi-icon" style="background:#3a1a1a">
            <el-icon size="22" color="#f85149"><WarnTriangleFilled /></el-icon>
          </div>
          <div class="kpi-info">
            <div class="kpi-value" style="color:#f85149">{{ terminalsStore.offlineCount + terminalsStore.degradedCount }}</div>
            <div class="kpi-label">异常终端</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="kpi-card">
          <div class="kpi-icon" style="background:#3a1a1a">
            <el-icon size="22" color="#f85149"><Bell /></el-icon>
          </div>
          <div class="kpi-info">
            <div class="kpi-value" style="color:#f85149">{{ alertsStore.p0Count }}</div>
            <div class="kpi-label">P0紧急告警</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="kpi-card">
          <div class="kpi-icon" style="background:#3a2a10">
            <el-icon size="22" color="#e3b341"><Warning /></el-icon>
          </div>
          <div class="kpi-info">
            <div class="kpi-value" style="color:#e3b341">{{ alertsStore.p1Count }}</div>
            <div class="kpi-label">P1业务告警</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:16px">
      <!-- Alert trend chart -->
      <el-col :span="16">
        <div class="panel">
          <div class="panel-header">
            <span>告警趋势（最近10条记录时间线）</span>
          </div>
          <v-chart class="chart" :option="trendOption" autoresize />
        </div>
      </el-col>
      <!-- Terminal status -->
      <el-col :span="8">
        <div class="panel">
          <div class="panel-header"><span>终端状态分布</span></div>
          <v-chart class="chart" :option="pieOption" autoresize />
        </div>
      </el-col>
    </el-row>

    <!-- Recent alerts -->
    <div class="panel" style="margin-top:16px">
      <div class="panel-header">
        <span>最新告警</span>
        <el-button size="small" text @click="$router.push('/alerts')">查看全部 →</el-button>
      </div>
      <el-table :data="recentAlerts" class="alert-table" style="background:transparent">
        <el-table-column label="时间" width="180">
          <template #default="{ row }">{{ formatTime(row.timestamp) }}</template>
        </el-table-column>
        <el-table-column label="级别" width="80">
          <template #default="{ row }">
            <el-tag :type="row.level === 'P0' ? 'danger' : 'warning'" size="small" effect="dark">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="终端" width="80" prop="terminalId" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="告警信息" prop="message" />
      </el-table>
      <div v-if="recentAlerts.length === 0" class="empty-hint">暂无告警，运行异常回放后将显示数据</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use as echartsUse } from 'echarts/core'
import { LineChart, PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useAlertsStore } from '../stores/alerts'
import { useTerminalsStore } from '../stores/terminals'

echartsUse([LineChart, PieChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer])

const alertsStore = useAlertsStore()
const terminalsStore = useTerminalsStore()

const recentAlerts = computed(() => alertsStore.alerts.slice(0, 8))

function formatTime(ts) {
  return new Date(ts).toLocaleString('zh-CN', { hour12: false })
}

const trendOption = computed(() => {
  const data = alertsStore.alerts.slice(0, 10).reverse()
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: '#1c2128', borderColor: '#30363d', textStyle: { color: '#e6edf3' } },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.map(a => new Date(a.timestamp).toLocaleTimeString('zh-CN', { hour12: false })),
      axisLine: { lineStyle: { color: '#30363d' } },
      axisLabel: { color: '#8b949e', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#30363d' } },
      axisLabel: { color: '#8b949e' },
      splitLine: { lineStyle: { color: '#21262d' } }
    },
    series: [
      {
        name: 'P0',
        type: 'line',
        data: data.map(a => a.level === 'P0' ? 1 : 0),
        lineStyle: { color: '#f85149' },
        itemStyle: { color: '#f85149' },
        areaStyle: { color: 'rgba(248,81,73,0.15)' },
        smooth: true
      },
      {
        name: 'P1',
        type: 'line',
        data: data.map(a => a.level === 'P1' ? 1 : 0),
        lineStyle: { color: '#e3b341' },
        itemStyle: { color: '#e3b341' },
        areaStyle: { color: 'rgba(227,179,65,0.15)' },
        smooth: true
      }
    ]
  }
})

const pieOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: { trigger: 'item', backgroundColor: '#1c2128', borderColor: '#30363d', textStyle: { color: '#e6edf3' } },
  legend: { bottom: 0, textStyle: { color: '#8b949e' } },
  series: [{
    type: 'pie',
    radius: ['40%', '65%'],
    center: ['50%', '45%'],
    data: [
      { value: terminalsStore.onlineCount, name: '在线', itemStyle: { color: '#3fb950' } },
      { value: terminalsStore.offlineCount, name: '离线', itemStyle: { color: '#f85149' } },
      { value: terminalsStore.degradedCount, name: '降级', itemStyle: { color: '#e3b341' } },
    ],
    label: { color: '#e6edf3' }
  }]
}))
</script>

<style scoped>
.kpi-card {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.kpi-icon { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.kpi-value { font-size: 28px; font-weight: 700; color: #e6edf3; line-height: 1; }
.kpi-label { font-size: 13px; color: #8b949e; margin-top: 4px; }
.panel {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 10px;
  padding: 16px;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #e6edf3;
  margin-bottom: 12px;
}
.chart { height: 240px; width: 100%; }
.alert-table :deep(th) { background: #1c2128 !important; color: #8b949e !important; border-bottom: 1px solid #21262d; }
.alert-table :deep(td) { background: transparent !important; color: #e6edf3 !important; border-bottom: 1px solid #21262d; }
.alert-table :deep(tr:hover td) { background: #1c2128 !important; }
.empty-hint { text-align: center; color: #484f58; padding: 24px; font-size: 13px; }
</style>
