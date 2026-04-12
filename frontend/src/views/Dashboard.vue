<template>
  <div class="dashboard-page">

    <!-- 顶部标题栏 -->
    <section class="hero-bar">
      <div class="hero-left">
        <div class="hero-title">智慧医院运营驾驶舱</div>
        <div class="hero-sub">{{ todayText }} · 实时数据每5秒更新</div>
      </div>
      <div class="hero-right">
        <span class="chip chip-blue">在线率 {{ onlineRate }}%</span>
        <span class="chip chip-red">P0/P1 {{ alertsStore.p0Count + alertsStore.p1Count }}</span>
        <span class="chip chip-green">终端总数 {{ terminalsStore.terminals.length }}</span>
      </div>
    </section>

    <!-- KPI 第一行 -->
    <div class="kpi-row">
      <div class="kpi-card" style="border-left-color:#3b82f6">
        <div class="kpi-label">在线终端</div>
        <div class="kpi-value" style="color:#1d4ed8">{{ terminalsStore.onlineCount }}</div>
        <div class="kpi-sub">共 {{ terminalsStore.terminals.length }} 台</div>
      </div>
      <div class="kpi-card" style="border-left-color:#ef4444" :class="{'kpi-danger-active': alertsStore.p0Count > 0}">
        <div class="kpi-label">P0 紧急告警</div>
        <div class="kpi-value" style="color:#dc2626">{{ alertsStore.p0Count }}</div>
        <div class="kpi-sub">需立即处理</div>
      </div>
      <div class="kpi-card" style="border-left-color:#f59e0b">
        <div class="kpi-label">P1 重要告警</div>
        <div class="kpi-value" style="color:#d97706">{{ alertsStore.p1Count }}</div>
        <div class="kpi-sub">关注处理</div>
      </div>
      <div class="kpi-card" style="border-left-color:#22c55e">
        <div class="kpi-label">支付成功率</div>
        <div class="kpi-value" style="color:#16a34a">{{ paymentSuccessDisplay }}</div>
        <div class="kpi-sub">近实时统计</div>
      </div>
    </div>

    <!-- 第二行图表 -->
    <div class="chart-row">
      <!-- 交易趋势 -->
      <div class="card">
        <div class="card-title">今日交易趋势</div>
        <v-chart class="chart" :option="tradeTrendOption" autoresize />
      </div>
      <!-- 告警类型分布 -->
      <div class="card">
        <div class="card-title">告警类型分布</div>
        <v-chart class="mini-chart" :option="alertTypeOption" autoresize />
        <div class="alert-type-legend">
          <div class="legend-item" v-for="item in alertTypeLegend" :key="item.label">
            <span class="legend-dot" :style="{background: item.color}"></span>
            <span class="legend-label">{{ item.label }}</span>
            <span class="legend-count">{{ item.count }}</span>
          </div>
        </div>
      </div>
      <!-- 终端状态环形图 -->
      <div class="card">
        <div class="card-title">终端状态</div>
        <div class="terminal-ring-wrap">
          <v-chart class="ring-chart" :option="terminalRingOption" autoresize />
          <div class="ring-total">{{ terminalsStore.terminals.length }}</div>
        </div>
        <div class="terminal-status-legend">
          <div class="status-item">
            <span class="status-dot" style="background:#22c55e"></span>
            <span>在线</span>
            <span style="margin-left:auto;font-weight:700;color:#1e293b">{{ terminalsStore.onlineCount }}</span>
          </div>
          <div class="status-item">
            <span class="status-dot" style="background:#f59e0b"></span>
            <span>降级</span>
            <span style="margin-left:auto;font-weight:700;color:#1e293b">{{ terminalsStore.degradedCount }}</span>
          </div>
          <div class="status-item">
            <span class="status-dot" style="background:#ef4444"></span>
            <span>离线</span>
            <span style="margin-left:auto;font-weight:700;color:#1e293b">{{ terminalsStore.offlineCount }}</span>
          </div>
        </div>
        <div class="online-rate">在线率 {{ onlineRate }}%</div>
      </div>
    </div>

    <!-- 第三行 -->
    <div class="bottom-row">
      <!-- 科室排队深度 -->
      <div class="card">
        <div class="card-title">科室排队深度</div>
        <v-chart class="dept-chart" :option="deptQueueOption" autoresize />
      </div>
      <!-- 支付方式分布 -->
      <div class="card">
        <div class="card-title">支付方式分布</div>
        <div class="pay-methods-pills">
          <span class="pay-pill" style="background:#dcfce7;color:#16a34a">微信 42%</span>
          <span class="pay-pill" style="background:#dbeafe;color:#1d4ed8">支付宝 31%</span>
          <span class="pay-pill" style="background:#fef3c7;color:#d97706">银联 18%</span>
          <span class="pay-pill" style="background:#f1f5f9;color:#64748b">医保 9%</span>
        </div>
        <div class="pay-bar">
          <div style="width:42%;background:#22c55e;height:100%"></div>
          <div style="width:31%;background:#3b82f6;height:100%"></div>
          <div style="width:18%;background:#f59e0b;height:100%"></div>
          <div style="width:9%;background:#94a3b8;height:100%"></div>
        </div>
        <div class="pay-counts">
          <div><div style="font-size:16px;font-weight:800;color:#1e293b">42%</div><div style="font-size:11px;color:#94a3b8">微信</div></div>
          <div><div style="font-size:16px;font-weight:800;color:#1e293b">31%</div><div style="font-size:11px;color:#94a3b8">支付宝</div></div>
          <div><div style="font-size:16px;font-weight:800;color:#1e293b">18%</div><div style="font-size:11px;color:#94a3b8">银联</div></div>
          <div><div style="font-size:16px;font-weight:800;color:#1e293b">9%</div><div style="font-size:11px;color:#94a3b8">医保</div></div>
        </div>
      </div>
      <!-- 最新告警列表 -->
      <div class="card">
        <div class="card-title">
          最近告警
          <router-link to="/alerts" style="font-size:12px;color:#3b82f6;text-decoration:none;font-weight:400">查看全部 →</router-link>
        </div>
        <div class="alert-list">
          <div
            v-for="alert in recentAlerts"
            :key="alert.id"
            class="alert-item"
            :class="alert.level === 'P0' ? 'alert-p0' : 'alert-p1'"
          >
            <div class="alert-item-top">
              <span class="alert-level-badge" :class="alert.level === 'P0' ? 'badge-p0' : 'badge-p1'">{{ alert.level }}</span>
              <span class="alert-time">{{ formatAlertTime(alert.timestamp) }}</span>
            </div>
            <div class="alert-item-msg">{{ typeLabel(alert.type) }} · {{ alert.terminalId || '-' }}</div>
          </div>
          <div v-if="recentAlerts.length === 0" style="font-size:12px;color:#94a3b8;text-align:center;padding:16px 0">暂无告警</div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAlertsStore } from '../stores/alerts'
import { useTerminalsStore } from '../stores/terminals'
import { useStatsStore } from '../stores/stats'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart, PieChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import * as echarts from 'echarts/core'

use([LineChart, PieChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const alertsStore = useAlertsStore()
const terminalsStore = useTerminalsStore()
const statsStore = useStatsStore()

onMounted(() => {
  alertsStore.startPolling()
  terminalsStore.startPolling()
  statsStore.startPolling()
})

// ── Computed helpers ────────────────────────────────────────────────────────
const todayText = computed(() => new Date().toLocaleDateString('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
}))

const onlineRate = computed(() => {
  const total = terminalsStore.terminals.length || 1
  return ((terminalsStore.onlineCount / total) * 100).toFixed(1)
})

const paymentSuccessDisplay = computed(() => {
  const r = statsStore.paymentSuccessRate
  if (r == null) return '暂无数据'
  return (r * 100).toFixed(1) + '%'
})

// ── Trade trend bar chart ───────────────────────────────────────────────────
const tradeTrendOption = computed(() => {
  const hours = alertsStore.alertsByHour
  const xData = hours.map(h => `${String(h.hour).padStart(2, '0')}:00`)
  const yData = hours.map(h => h.count > 0 ? h.count * 12 + 120 : null)
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: { fontSize: 10, color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#e2e8f0' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#f1f5f9' } }
    },
    series: [{
      type: 'bar',
      data: yData,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#3b82f6' },
          { offset: 1, color: '#93c5fd' }
        ]),
        borderRadius: [3, 3, 0, 0]
      },
      barWidth: '60%'
    }]
  }
})

// ── Alert type pie chart ────────────────────────────────────────────────────
const alertTypeLegend = computed(() => {
  const groups = { terminal_offline: 0, printer_error: 0, queue_overload: 0, other: 0 }
  for (const a of alertsStore.alerts) {
    const t = (a.type || '').toLowerCase()
    if (t.includes('offline')) groups.terminal_offline++
    else if (t.includes('printer')) groups.printer_error++
    else if (t.includes('queue')) groups.queue_overload++
    else groups.other++
  }
  return [
    { label: '终端离线', count: groups.terminal_offline, color: '#ef4444' },
    { label: '打印异常', count: groups.printer_error, color: '#f59e0b' },
    { label: '排队过载', count: groups.queue_overload, color: '#3b82f6' },
    { label: '其他', count: groups.other, color: '#94a3b8' },
  ]
})

const alertTypeOption = computed(() => ({
  tooltip: { trigger: 'item' },
  series: [{
    type: 'pie',
    radius: ['50%', '75%'],
    center: ['50%', '50%'],
    label: { show: false },
    data: alertTypeLegend.value.map(item => ({
      name: item.label,
      value: item.count,
      itemStyle: { color: item.color }
    }))
  }]
}))

// ── Terminal status ring chart ──────────────────────────────────────────────
const terminalRingOption = computed(() => ({
  tooltip: { trigger: 'item' },
  series: [{
    type: 'pie',
    radius: ['55%', '80%'],
    center: ['50%', '50%'],
    label: { show: false },
    data: [
      { name: '在线', value: terminalsStore.onlineCount, itemStyle: { color: '#22c55e' } },
      { name: '降级', value: terminalsStore.degradedCount, itemStyle: { color: '#f59e0b' } },
      { name: '离线', value: terminalsStore.offlineCount, itemStyle: { color: '#ef4444' } },
    ]
  }]
}))

// ── Dept queue depth bar chart ─────────────────────────────────────────────
const deptQueueOption = computed(() => {
  const depts = ['神经内科', '内科', '心血管科', '骨科', '急诊']
  const depths = [12, 15, 8, 5, 3]
  const colors = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6']
  const max = Math.max(...depths)
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: '0%', right: '15%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      max,
      axisLabel: { show: false },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'category',
      data: depts,
      axisLabel: { fontSize: 11, color: '#64748b' },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [{
      type: 'bar',
      data: depths.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [0, 4, 4, 0] } })),
      barWidth: '40%',
      label: { show: true, position: 'right', formatter: '{c}人', fontSize: 11, color: '#64748b' }
    }]
  }
})

// ── Recent alerts list ──────────────────────────────────────────────────────
const recentAlerts = computed(() => alertsStore.alerts.slice(0, 3))

function formatAlertTime(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return String(ts).slice(0, 16)
  const ago = Math.round((Date.now() - d.getTime()) / 60000)
  if (ago < 1) return '刚刚'
  if (ago < 60) return `${ago}分钟前`
  return `${Math.round(ago / 60)}小时前`
}

function typeLabel(type) {
  const map = {
    terminal_offline: '终端离线',
    printer_error: '打印机故障',
    card_reader_error: '读卡器故障',
    HEARTBEAT: '心跳告警',
    PAYMENT: '支付异常',
    ANOMALY: '异常检测',
    NETWORK: '网络告警',
    SYSTEM: '系统事件',
    DEVICE: '设备故障'
  }
  return map[type] || map[type?.toUpperCase()] || type || '未知'
}
</script>

<style scoped>
.dashboard-page { padding: 0; }

/* ── Hero bar ──────────────────────────────────────────────────────────────── */
.hero-bar {
  background: linear-gradient(120deg, #eef4ff 0%, #f8fbff 65%, #fff 100%);
  border-radius: 12px;
  padding: 18px 20px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hero-title { font-size: 20px; font-weight: 700; color: #1e293b; }
.hero-sub { font-size: 13px; color: #64748b; margin-top: 4px; }
.hero-right { display: flex; gap: 8px; }
.chip { padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.chip-blue { background: #dbeafe; color: #1d4ed8; }
.chip-red { background: #fee2e2; color: #dc2626; }
.chip-green { background: #dcfce7; color: #16a34a; }

/* ── KPI row ───────────────────────────────────────────────────────────────── */
.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.kpi-card { background: #fff; border: 1px solid #e2e8f0; border-left: 3px solid transparent; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.kpi-value { font-size: 28px; font-weight: 800; margin-bottom: 6px; }
.kpi-label { font-size: 13px; color: #64748b; margin-bottom: 4px; }
.kpi-sub { font-size: 11px; color: #94a3b8; }
.kpi-danger-active { background: #fff6f6; }

/* ── Chart row ─────────────────────────────────────────────────────────────── */
.chart-row { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.bottom-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.card-title { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
.chart { height: 200px; width: 100%; }

/* ── Alert type legend ─────────────────────────────────────────────────────── */
.mini-chart { height: 120px; }
.alert-type-legend { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.legend-label { color: #64748b; flex: 1; }
.legend-count { font-weight: 700; color: #1e293b; }

/* ── Terminal ring ─────────────────────────────────────────────────────────── */
.ring-chart { height: 120px; }
.terminal-ring-wrap { position: relative; display: flex; justify-content: center; }
.ring-total { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); text-align: center; font-size: 20px; font-weight: 800; color: #1e293b; }
.terminal-status-legend { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: #64748b; margin-top: 8px; }
.status-item { display: flex; align-items: center; gap: 6px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.online-rate { font-size: 12px; color: #64748b; text-align: center; margin-top: 6px; }

/* ── Dept queue ────────────────────────────────────────────────────────────── */
.dept-chart { height: 180px; }

/* ── Payment methods ───────────────────────────────────────────────────────── */
.pay-methods-pills { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.pay-pill { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.pay-bar { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; display: flex; margin-bottom: 12px; }
.pay-counts { display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; gap: 4px; }

/* ── Alert list ────────────────────────────────────────────────────────────── */
.alert-list { display: flex; flex-direction: column; gap: 8px; }
.alert-item { border-radius: 8px; padding: 10px 12px; }
.alert-p0 { background: #fff1f2; border-left: 3px solid #ef4444; }
.alert-p1 { background: #fffbeb; border-left: 3px solid #f59e0b; }
.alert-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.alert-level-badge { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; }
.badge-p0 { background: #fee2e2; color: #dc2626; }
.badge-p1 { background: #fef3c7; color: #d97706; }
.alert-time { font-size: 11px; color: #94a3b8; }
.alert-item-msg { font-size: 12px; color: #334155; }
</style>
