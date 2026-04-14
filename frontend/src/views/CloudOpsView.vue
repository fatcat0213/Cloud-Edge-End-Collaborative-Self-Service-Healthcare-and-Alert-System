<template>
  <div class="cloud-page">
    <!-- Header -->
    <div class="cloud-header">
      <div class="header-left">
        <div class="header-icon">⚙</div>
        <div class="header-text">
          <div class="header-title">运维控制台</div>
          <div class="header-sub">Operations Console · 云边端协同运维监控</div>
        </div>
      </div>
      <div class="header-right">
        <div class="online-chip">
          <span class="online-dot"></span>
          在线率 {{ onlineRateDisplay }}
        </div>
        <el-button type="primary" class="action-btn" @click="showCmdDialog = true">
          <span>⬇</span> 下发命令
        </el-button>
        <el-button class="refresh-btn" @click="refreshAll" :loading="cloudStore.loading || edgeStore.loading">
          <span>⟳</span> 刷新
        </el-button>
      </div>
    </div>

    <!-- Three-column top section -->
    <div class="top-grid">
      <!-- Left: Cloud dispatched commands -->
      <div class="card">
        <div class="card-header">
          <span class="card-icon">📨</span>
          <span class="card-title">命令下发记录</span>
          <span class="card-badge">{{ recentCommands.length }} 条</span>
        </div>
        <div class="cmd-list">
          <div v-for="cmd in recentCommands" :key="cmd.commandId || cmd.id" class="cmd-item">
            <div class="cmd-top">
              <el-tag :type="cmdTypeTag(cmd.type)" size="small">{{ cmd.type || 'UNKNOWN' }}</el-tag>
              <span class="cmd-terminal">终端 {{ cmd.terminalId || '-' }}</span>
              <span class="cmd-time">{{ fmtTime(cmd.createdAt || cmd.timestamp) }}</span>
            </div>
            <div class="cmd-msg">{{ cmd.message || cmd.payload || '-' }}</div>
            <div class="cmd-status">
              <el-tag :type="cmdStatusTag(cmd.status)" size="small">{{ cmdStatusLabel(cmd.status) }}</el-tag>
            </div>
          </div>
          <el-empty v-if="!recentCommands.length" description="暂无下发指令" :image-size="48" />
        </div>
      </div>

      <!-- Center: Real-time business stream -->
      <div class="card">
        <div class="card-header">
          <span class="card-icon">⚡</span>
          <span class="card-title">实时业务流</span>
          <span class="live-chip">● LIVE</span>
        </div>
        <div class="biz-scroll">
          <div v-for="biz in bizRecords" :key="biz.id || biz.recordId || Math.random()" class="biz-item">
            <span class="biz-type" :class="'biz-' + bizType(biz.type)">{{ bizTypeLabel(biz.type) }}</span>
            <span class="biz-msg">{{ biz.patientName || biz.patientId || '' }} · {{ biz.message || biz.desc || formatBiz(biz) }}</span>
            <span class="biz-time">{{ fmtTime(biz.timestamp || biz.createdAt) }}</span>
          </div>
          <el-empty v-if="!bizRecords.length" description="暂无业务记录" :image-size="48" />
        </div>
      </div>

      <!-- Right: Edge reported events -->
      <div class="card">
        <div class="card-header">
          <span class="card-icon">📡</span>
          <span class="card-title">边端上报事件</span>
          <span class="card-badge">{{ recentEvents.length }} 条</span>
        </div>
        <div class="event-scroll" v-infinite-scroll="loadMoreEvents">
          <div
            v-for="evt in recentEvents"
            :key="evt.id || evt.eventId || Math.random()"
            class="evt-item"
            :class="evtLevelClass(evt.level)"
          >
            <div class="evt-top">
              <span class="evt-level-badge" :class="evtLevelClass(evt.level)">{{ evt.level || 'INFO' }}</span>
              <span class="evt-type">{{ typeLabel(evt.type) }}</span>
              <span class="evt-time">{{ fmtTime(evt.timestamp) }}</span>
            </div>
            <div class="evt-msg">{{ evt.message || evt.desc || '-' }}</div>
            <div class="evt-meta">终端 {{ evt.terminalId || '-' }}</div>
          </div>
          <el-empty v-if="!recentEvents.length" description="暂无上报事件" :image-size="48" />
        </div>
      </div>
    </div>

    <!-- Bottom tabs -->
    <div class="card tabs-card">
      <el-tabs v-model="activeTab" class="cloud-tabs">
        <el-tab-pane label="终端状态" name="terminals">
          <el-table :data="terminalTableData" stripe style="width:100%" size="small" v-loading="terminalsStore.terminals.length === 0">
            <el-table-column prop="id" label="终端ID" width="90">
              <template #default="{ row }">
                <span class="mono">{{ row.id }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="location" label="位置" width="140" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusTag(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="CPU" width="100">
              <template #default="{ row }">
                <div class="mini-bar-wrap">
                  <div class="mini-bar" :style="{ width: row.cpu + '%', background: cpuColor(row.cpu) }"></div>
                </div>
                <span class="mini-val">{{ row.cpu }}%</span>
              </template>
            </el-table-column>
            <el-table-column label="内存" width="100">
              <template #default="{ row }">
                <div class="mini-bar-wrap">
                  <div class="mini-bar" :style="{ width: row.memory + '%', background: memColor(row.memory) }"></div>
                </div>
                <span class="mini-val">{{ row.memory }}%</span>
              </template>
            </el-table-column>
            <el-table-column label="最近心跳" width="100">
              <template #default="{ row }">
                <span :class="heartbeatClass(row.heartbeatSecsAgo)">{{ row.heartbeatSecsAgo }}s 前</span>
              </template>
            </el-table-column>
            <el-table-column label="今日交易" width="90">
              <template #default="{ row }">
                <span class="mono">{{ row.todayTx || 0 }}</span>
              </template>
            </el-table-column>
            <el-table-column label="硬件状态">
              <template #default="{ row }">
                <span class="hw-tag" :class="hwClass(row.hardware?.printer)">打印机{{ hwLabel(row.hardware?.printer) }}</span>
                <span class="hw-tag" :class="hwClass(row.hardware?.cardReader)">读卡器{{ hwLabel(row.hardware?.cardReader) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="命令记录" name="commands">
          <el-table :data="commandTableData" stripe style="width:100%" size="small">
            <el-table-column label="命令ID" width="160">
              <template #default="{ row }">
                <span class="mono">{{ row.commandId || row.id || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="类型" width="110">
              <template #default="{ row }">
                <el-tag :type="cmdTypeTag(row.type)" size="small">{{ row.type || '-' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="目标终端" width="100">
              <template #default="{ row }">
                <span class="mono">{{ row.terminalId || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="cmdStatusTag(row.status)" size="small">{{ cmdStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="消息" />
            <el-table-column label="时间" width="160">
              <template #default="{ row }">
                {{ fmtTime(row.createdAt || row.timestamp) }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="消息统计" name="stats">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-card-title">消息速率</div>
              <div class="stat-big">{{ msgRateDisplay }}/s</div>
              <div class="stat-sub">云边端消息</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-title">消息类型分布</div>
              <div class="type-dist">
                <div v-for="t in msgTypeDist" :key="t.label" class="type-row">
                  <span class="type-label">{{ t.label }}</span>
                  <div class="type-bar-wrap">
                    <div class="type-bar" :style="{ width: t.pct + '%', background: t.color }"></div>
                  </div>
                  <span class="type-pct">{{ t.pct }}%</span>
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-card-title">云端 → 边端</div>
              <div class="stat-big">{{ cloudMsgCount }}</div>
              <div class="stat-sub">云端下发</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-title">边端 → 终端</div>
              <div class="stat-big">{{ edgeMsgCount }}</div>
              <div class="stat-sub">边端转发</div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- Command dispatch dialog -->
    <el-dialog v-model="showCmdDialog" width="560px" top="40px" :close-on-click-modal="false" class="cmd-dialog">
      <!-- Dialog header -->
      <template #header>
        <div class="cmd-dialog-header">
          <div class="cmd-dialog-titles">
            <div class="cmd-dialog-title">📨 下发命令</div>
            <div class="cmd-dialog-sub">远程控制自助终端 · 支持批量操作</div>
          </div>
          <div class="cmd-dialog-badges">
            <span class="cmd-badge">● {{ terminalsStore.onlineCount }} 在线</span>
            <span class="cmd-badge warn">⚠ {{ terminalsStore.terminals.length - terminalsStore.onlineCount }} 离线</span>
          </div>
        </div>
      </template>

      <div class="cmd-dialog-body">
        <!-- Step 1: Command type -->
        <div class="cmd-section-label">① 选择命令类型</div>
        <div class="cmd-grid">
          <div
            v-for="cmd in cmdOptions"
            :key="cmd.type"
            class="cmd-card"
            :class="{ selected: selectedCmd === cmd.type }"
            @click="selectedCmd = cmd.type"
          >
            <div class="cmd-icon">{{ cmd.icon }}</div>
            <div class="cmd-name">{{ cmd.label }}</div>
            <div class="cmd-desc">{{ cmd.desc }}</div>
          </div>
        </div>

        <!-- Step 2: Terminal selection -->
        <div class="cmd-section-label">
          ② 选择目标终端
          <span class="sel-count">（已选 {{ selectedTerminals.size }} 台）</span>
        </div>
        <div class="term-toolbar">
          <button class="term-toolbar-btn" @click="selectAllTerminals">全选</button>
          <button class="term-toolbar-btn" @click="clearAllTerminals">清空</button>
          <span class="term-toolbar-info">在线 {{ terminalsStore.onlineCount }} 台 · 离线 {{ terminalsStore.terminals.length - terminalsStore.onlineCount }} 台</span>
        </div>
        <div class="term-grid">
          <div
            v-for="t in terminalsStore.terminals"
            :key="t.id"
            class="term-chip"
            :class="{ selected: selectedTerminals.has(t.id), offline: t.status !== 'online' }"
            @click="toggleTerminal(t.id)"
          >
            <span class="term-dot" :class="statusDotClass(t.status)"></span>
            <div class="term-info">
              <div class="term-id">{{ t.id }}</div>
              <div class="term-loc">{{ t.location || '-' }}</div>
            </div>
          </div>
        </div>

        <!-- Confirm strip -->
        <div class="confirm-strip">
          <div class="confirm-item">
            <span class="confirm-label">命令</span>
            <span class="confirm-val">{{ cmdOptions.find(c => c.type === selectedCmd)?.icon }} {{ cmdOptions.find(c => c.type === selectedCmd)?.label }}</span>
          </div>
          <span class="confirm-arrow">→</span>
          <div class="confirm-item">
            <span class="confirm-label">目标</span>
            <span class="confirm-val">{{ selectedTerminalSummary }}</span>
          </div>
          <span class="confirm-arrow">→</span>
          <div class="confirm-item">
            <span class="confirm-label">预计</span>
            <span class="confirm-val">立即下发</span>
          </div>
        </div>
      </div>

      <!-- Dialog footer -->
      <template #footer>
        <div class="cmd-dialog-footer">
          <span class="footer-tip">⚠ 高危操作请确认终端编号</span>
          <div class="footer-actions">
            <el-button size="default" @click="showCmdDialog = false">取消</el-button>
            <el-button
              type="primary"
              :loading="cmdLoading"
              :disabled="selectedTerminals.size === 0"
              @click="sendCommandBatch"
              class="send-btn"
            >
              🚀 确认发送
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCloudSideStore } from '../stores/cloudSide'
import { useEdgeNodeStore } from '../stores/edgeNodeStore'
import { useTerminalsStore } from '../stores/terminals'

const cloudStore = useCloudSideStore()
const edgeStore = useEdgeNodeStore()
const terminalsStore = useTerminalsStore()

const activeTab = ref('terminals')
const showCmdDialog = ref(false)
const cmdLoading = ref(false)
const selectedCmd = ref('RESTART')
const selectedTerminals = ref(new Set())
const cmdForm = ref({ terminalId: '', type: 'HEALTH_CHECK', payload: '' })

const cmdOptions = [
  { type: 'RESTART', icon: '🔄', label: '重启', desc: '远程重启终端' },
  { type: 'MAINTENANCE', icon: '🔧', label: '维护模式', desc: '进入维护状态' },
  { type: 'HEALTH_CHECK', icon: '❤', label: '健康检查', desc: '检测终端状态' },
  { type: 'UPGRADE', icon: '⬆', label: '系统升级', desc: '更新系统版本' },
  { type: 'CONFIG_UPDATE', icon: '⚙', label: '配置更新', desc: '更新业务配置' },
  { type: 'SHUTDOWN', icon: '⏻', label: '关机', desc: '远程关闭终端' },
]

const selectedTerminalSummary = computed(() => {
  const ids = [...selectedTerminals.value]
  if (ids.length === 0) return '未选择终端'
  if (ids.length <= 3) return ids.join('、')
  return ids.slice(0, 3).join('、') + '...'
})

// Live counters (simulated for demo)
const cloudMsgCount = ref(0)
const edgeMsgCount = ref(0)
const terminalMsgCount = ref(0)

// -- Computed --
const onlineRateDisplay = computed(() => {
  const total = terminalsStore.terminals.length
  if (!total) return '85%'
  const online = terminalsStore.onlineCount
  return Math.round((online / total) * 100) + '%'
})
const terminalCount = computed(() => terminalsStore.terminals.length)
const msgRateDisplay = computed(() => {
  const rate = edgeStore.stats?.messageRate || (Math.random() * 0.8 + 0.5).toFixed(1)
  return parseFloat(rate).toFixed(1)
})
const edgeRateDisplay = computed(() => {
  const rate = edgeStore.stats?.edgeMessageRate || (Math.random() * 0.6 + 0.2).toFixed(1)
  return parseFloat(rate).toFixed(1)
})

const recentCommands = computed(() => edgeStore.commands.slice(0, 12))

const recentEvents = computed(() => {
  const fromAlerts = (cloudStore.edgeAlerts || []).map(a => ({ ...a, id: a.id || a.alertId }))
  return fromAlerts.slice(0, 20)
})

const bizRecords = computed(() => {
  const payments = (cloudStore.paymentRecords || []).map(p => ({ ...p, type: 'PAYMENT', id: p.payId || p.id }))
  const regs = (cloudStore.registrationRecords || []).map(r => ({ ...r, type: 'REGISTRATION', id: r.regId || r.id }))
  const combined = [...payments, ...regs].sort((a, b) => {
    const ta = a.timestamp || a.createdAt || 0
    const tb = b.timestamp || b.createdAt || 0
    return new Date(tb) - new Date(ta)
  })
  return combined.slice(0, 30)
})

const commandTableData = computed(() => edgeStore.commands.slice(0, 20))

const terminalTableData = computed(() => terminalsStore.terminals)

const msgTypeDist = computed(() => {
  const s = edgeStore.stats || {}
  const total = s.heartbeatCount + s.alertCount + s.businessCount || 1
  return [
    { label: '心跳', pct: Math.round((s.heartbeatCount || 40) / total * 100), color: '#3b82f6' },
    { label: '告警', pct: Math.round((s.alertCount || 20) / total * 100), color: '#ef4444' },
    { label: '业务', pct: Math.round((s.businessCount || 30) / total * 100), color: '#10b981' },
    { label: '命令', pct: Math.round((s.commandCount || 10) / total * 100), color: '#f59e0b' },
  ]
})

// -- Methods --
async function refreshAll() {
  await Promise.all([
    cloudStore.refresh(),
    edgeStore.fetchRecentCommands(),
    edgeStore.fetchStats(),
    terminalsStore.fetchTerminals()
  ])
}

function toggleTerminal(id) {
  if (selectedTerminals.value.has(id)) {
    selectedTerminals.value.delete(id)
  } else {
    selectedTerminals.value.add(id)
  }
  selectedTerminals.value = new Set(selectedTerminals.value)
}

function selectAllTerminals() {
  selectedTerminals.value = new Set(terminalsStore.terminals.map(t => t.id))
}

function clearAllTerminals() {
  selectedTerminals.value = new Set()
}

function statusDotClass(status) {
  if (status === 'online') return 'dot-green'
  if (status === 'offline') return 'dot-red'
  return 'dot-yellow'
}

async function sendCommandBatch() {
  if (selectedTerminals.value.size === 0) return
  cmdLoading.value = true
  try {
    const terminals = [...selectedTerminals.value]
    console.log('[DEBUG] Selected terminals:', terminals, '| Command:', selectedCmd.value)
    for (const tid of terminals) {
      const result = await edgeStore.dispatchCommand(tid, selectedCmd.value, cmdForm.value.payload)
      console.log('[DEBUG] Command sent to', tid, '→ result:', JSON.stringify(result))
      // 模拟命令效果
      if (selectedCmd.value === 'SHUTDOWN') {
        console.log('[DEBUG] Calling simulateShutdown for', tid)
        terminalsStore.simulateShutdown(tid)
      } else if (selectedCmd.value === 'RESTART') {
        terminalsStore.simulateRestart(tid)
      } else if (selectedCmd.value === 'MAINTENANCE') {
        terminalsStore.simulateMaintenance(tid)
      }
    }
    // Immediately refresh command list
    await edgeStore.fetchRecentCommands()
    showCmdDialog.value = false
    selectedTerminals.value = new Set()
    selectedCmd.value = 'RESTART'
    cmdForm.value.payload = ''
  } catch (err) {
    console.error('Command dispatch failed:', err)
  } finally {
    cmdLoading.value = false
  }
}

function loadMoreEvents() { /* infinite scroll handled by v-infinite-scroll */ }

function fmtTime(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return String(ts).slice(0, 16)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function typeLabel(type) {
  const map = {
    HEARTBEAT: '心跳', HARDWARE: '硬件', ANOMALY: '异常', QUEUE: '排队',
    PAYMENT: '支付', REGISTRATION: '挂号', INSURANCE: '医保',
    NETWORK: '网络', SYSTEM: '系统', terminal_offline: '终端离线',
    printer_error: '打印机', card_reader_error: '读卡器', BUSINESS: '业务'
  }
  return map[type] || map[type?.toUpperCase()] || type || '未知'
}

function evtLevelClass(level) {
  if (level === 'P0') return 'lvl-p0'
  if (level === 'P1') return 'lvl-p1'
  if (level === 'P2') return 'lvl-p2'
  return 'lvl-info'
}

function cmdTypeTag(type) {
  if (type === 'RESTART') return 'danger'
  if (type === 'MAINTENANCE') return 'warning'
  return 'success'
}

function cmdStatusTag(status) {
  if (status === 'SUCCESS' || status === 'COMPLETED') return 'success'
  if (status === 'FAILED' || status === 'ERROR') return 'danger'
  if (status === 'PENDING' || status === 'SENT') return 'warning'
  return 'info'
}

function cmdStatusLabel(status) {
  const m = { SUCCESS: '成功', FAILED: '失败', PENDING: '等待', SENT: '已发送', COMPLETED: '完成', ERROR: '错误' }
  return m[status] || status || '未知'
}

function statusTag(s) {
  if (s === 'online') return 'success'
  if (s === 'offline') return 'danger'
  return 'warning'
}

function statusLabel(s) {
  if (s === 'online') return '在线'
  if (s === 'offline') return '离线'
  if (s === 'degraded') return '降级'
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

function heartbeatClass(secs) {
  if (secs > 60) return 'hb-old'
  if (secs > 30) return 'hb-warn'
  return 'hb-fresh'
}

function hwClass(hw) {
  if (hw === 'ok' || !hw) return 'hw-ok'
  return 'hw-err'
}

function hwLabel(hw) {
  if (hw === 'ok' || !hw) return '正常'
  const labels = { paper_jam: '卡纸', error: '故障', degraded: '降级' }
  return labels[hw] || hw
}

function bizType(type) {
  if (type === 'PAYMENT' || type?.includes('PAY')) return 'payment'
  if (type === 'REGISTRATION' || type?.includes('REG')) return 'reg'
  if (type === 'INSURANCE' || type?.includes('INS')) return 'ins'
  return 'other'
}

function bizTypeLabel(type) {
  const m = { PAYMENT: '支付', REGISTRATION: '挂号', INSURANCE: '医保' }
  return m[type] || '业务'
}

function formatBiz(biz) {
  if (biz.amount) return `¥${biz.amount}`
  if (biz.deptName) return biz.deptName
  return '-'
}

// -- Live simulation --
let simTimer = null
onMounted(() => {
  refreshAll()
  edgeStore.startPolling(10000)
  simTimer = setInterval(() => {
    cloudMsgCount.value += Math.floor(Math.random() * 12 + 1)
    edgeMsgCount.value += Math.floor(Math.random() * 8 + 1)
    terminalMsgCount.value += Math.floor(Math.random() * 20 + 5)
  }, 2000)
})

onUnmounted(() => {
  if (simTimer) clearInterval(simTimer)
  edgeStore.stopPolling()
})
</script>

<style scoped>
.cloud-page { padding: 16px; background: #f0f4f8; min-height: 100%; }

/* Header */
.cloud-header {
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 50%, #1a8fe3 100%);
  border-radius: 14px; padding: 16px 20px; margin-bottom: 16px; color: #fff;
}
.header-left { display: flex; align-items: center; gap: 12px; }
.header-icon {
  width: 48px; height: 48px; background: rgba(255,255,255,0.15);
  border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;
}
.header-title { font-size: 20px; font-weight: 700; }
.header-sub { font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 2px; }
.header-right { display: flex; align-items: center; gap: 10px; }
.online-chip {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
  border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 600;
}
.online-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; }
.action-btn { background: #1a8fe3 !important; border-color: #1a8fe3 !important; color: #fff !important; border-radius: 8px !important; font-weight: 600 !important; }
.refresh-btn { background: rgba(255,255,255,0.15) !important; border: 1px solid rgba(255,255,255,0.3) !important; color: #fff !important; border-radius: 8px !important; }

/* Top grid */
.top-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }

/* Card */
.card {
  background: #fff; border-radius: 12px; padding: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;
}
.card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.card-icon { font-size: 16px; }
.card-title { font-size: 14px; font-weight: 700; color: #1e293b; flex: 1; }
.card-badge {
  font-size: 11px; padding: 2px 8px; background: #f1f5f9; color: #475569;
  border-radius: 20px; font-weight: 600;
}
.live-chip {
  font-size: 10px; padding: 2px 6px; background: #fef3c7; color: #d97706;
  border-radius: 20px; font-weight: 700; animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

/* Command list */
.cmd-list { display: flex; flex-direction: column; gap: 8px; max-height: 360px; overflow-y: auto; }
.cmd-item {
  border-radius: 8px; padding: 8px 10px; background: #f8fafc;
  border-left: 3px solid #3b82f6;
}
.cmd-top { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.cmd-terminal { font-size: 12px; color: #64748b; flex: 1; }
.cmd-time { font-size: 11px; color: #94a3b8; }
.cmd-msg { font-size: 12px; color: #334155; margin-bottom: 4px; }
.cmd-status { display: flex; }
.mono { font-family: monospace; }

/* Business stream (center column) */
.biz-scroll { display: flex; flex-direction: column; gap: 8px; max-height: 360px; overflow-y: auto; }
.biz-item {
  display: flex; align-items: center; gap: 8px;
  background: #f8fafc; border-radius: 8px; padding: 8px 10px;
  border: 1px solid #e2e8f0; font-size: 12px;
}
.biz-type { font-weight: 700; padding: 1px 6px; border-radius: 4px; font-size: 10px; flex-shrink: 0; }
.biz-payment { background: #dcfce7; color: #15803d; }
.biz-reg { background: #dbeafe; color: #1d4ed8; }
.biz-ins { background: #fef3c7; color: #d97706; }
.biz-other { background: #f1f5f9; color: #475569; }
.biz-msg { color: #334155; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.biz-time { color: #94a3b8; flex-shrink: 0; }

/* Event scroll */
.event-scroll { display: flex; flex-direction: column; gap: 8px; max-height: 360px; overflow-y: auto; }
.evt-item { border-radius: 8px; padding: 8px 10px; border-left: 3px solid #e2e8f0; background: #f8fafc; }
.evt-item.lvl-p0 { border-color: #ef4444; background: #fff1f2; }
.evt-item.lvl-p1 { border-color: #f59e0b; background: #fffbeb; }
.evt-item.lvl-p2 { border-color: #3b82f6; background: #eff6ff; }
.evt-top { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.evt-level-badge { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; }
.lvl-p0 .evt-level-badge { background: #fee2e2; color: #dc2626; }
.lvl-p1 .evt-level-badge { background: #fef3c7; color: #d97706; }
.lvl-p2 .evt-level-badge { background: #dbeafe; color: #1d4ed8; }
.lvl-info .evt-level-badge { background: #f1f5f9; color: #475569; }
.evt-type { font-size: 11px; color: #64748b; }
.evt-time { margin-left: auto; font-size: 11px; color: #94a3b8; }
.evt-msg { font-size: 12px; color: #334155; }
.evt-meta { font-size: 11px; color: #94a3b8; margin-top: 2px; }

/* Tabs */
.tabs-card { }
.cloud-tabs :deep(.el-tabs__header) { margin-bottom: 12px; }

/* Terminal table */
.mini-bar-wrap { display: inline-block; width: 50px; height: 6px; background: #f1f5f9; border-radius: 3px; vertical-align: middle; margin-right: 4px; overflow: hidden; }
.mini-bar { height: 100%; border-radius: 3px; }
.mini-val { font-size: 11px; color: #64748b; }
.hb-fresh { color: #059669; }
.hb-warn { color: #d97706; }
.hb-old { color: #dc2626; }
.hw-tag { font-size: 10px; padding: 1px 5px; border-radius: 4px; margin-right: 4px; }
.hw-ok { background: #dcfce7; color: #15803d; }
.hw-err { background: #fee2e2; color: #dc2626; }

/* Command table */
.stats-grid { display: grid; grid-template-columns: 1fr 2fr 1fr 1fr; gap: 12px; }
.stat-card {
  background: #f8fafc; border-radius: 10px; padding: 14px;
  border: 1px solid #e2e8f0;
}
.stat-card-title { font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 6px; }
.stat-big { font-size: 28px; font-weight: 700; color: #1a8fe3; }
.stat-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.type-dist { display: flex; flex-direction: column; gap: 8px; }
.type-row { display: flex; align-items: center; gap: 8px; }
.type-label { font-size: 11px; color: #64748b; min-width: 32px; }
.type-bar-wrap { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
.type-bar { height: 100%; border-radius: 4px; }
.type-pct { font-size: 11px; font-weight: 600; color: #0f172a; min-width: 28px; text-align: right; }

/* Command dispatch dialog */
.cmd-dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  border-radius: 12px; padding: 12px 16px; color: #fff;
}
.cmd-dialog-titles { }
.cmd-dialog-title { font-size: 15px; font-weight: 700; }
.cmd-dialog-sub { font-size: 11px; color: rgba(255,255,255,0.75); margin-top: 1px; }
.cmd-dialog-badges { display: flex; gap: 8px; }
.cmd-badge {
  padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
  background: rgba(255,255,255,0.18); color: #fff; border: 1px solid rgba(255,255,255,0.3);
}
.cmd-badge.warn { background: rgba(239,68,68,0.3); }

.cmd-dialog-body { padding: 14px 16px 0; }

.cmd-section-label {
  font-size: 12px; font-weight: 700; color: #374151; margin-bottom: 8px;
  display: flex; align-items: center; gap: 6px;
}
.sel-count { font-weight: 400; color: #4f46e5; margin-left: 4px; }

.cmd-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
.cmd-card {
  border: 2px solid #e5e7eb; border-radius: 8px; padding: 10px 8px;
  cursor: pointer; transition: all 0.15s; background: #fff; text-align: center;
}
.cmd-card:hover { border-color: #6366f1; background: #f5f3ff; }
.cmd-card.selected { border-color: #4f46e5; background: #eef2ff; }
.cmd-icon { font-size: 18px; margin-bottom: 4px; }
.cmd-name { font-size: 12px; font-weight: 700; color: #1f2937; }
.cmd-desc { font-size: 9px; color: #9ca3af; margin-top: 1px; }

.term-toolbar { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
.term-toolbar-btn {
  padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
  border: 1px solid #d1d5db; background: #fff; color: #374151; cursor: pointer;
}
.term-toolbar-btn:hover { background: #f3f4f6; }
.term-toolbar-info { font-size: 11px; color: #6b7280; margin-left: 4px; }

.term-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; max-height: 144px; overflow-y: auto; padding-right: 4px; }
.term-chip {
  border: 1.5px solid #d1d5db; border-radius: 6px; padding: 6px 8px;
  cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 5px;
}
.term-chip:hover { border-color: #6366f1; background: #f5f3ff; }
.term-chip.selected { border-color: #4f46e5; background: #eef2ff; }
.term-chip.offline { opacity: 0.65; }
.term-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.dot-green { background: #10b981; }
.dot-red { background: #ef4444; }
.dot-yellow { background: #f59e0b; }
.term-info { flex: 1; min-width: 0; }
.term-id { font-size: 11px; font-weight: 700; color: #1f2937; }
.term-loc { font-size: 9px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.confirm-strip {
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
  padding: 10px 14px; display: flex; align-items: center; gap: 12px; margin: 12px 0;
}
.confirm-item { display: flex; align-items: center; gap: 5px; }
.confirm-label { font-size: 11px; color: #64748b; }
.confirm-val { font-size: 12px; font-weight: 700; color: #1f2937; }
.confirm-arrow { color: #d1d5db; font-size: 14px; }

.cmd-dialog-footer { display: flex; align-items: center; justify-content: space-between; padding: 10px 4px; }
.footer-tip { font-size: 11px; color: #9ca3af; display: flex; align-items: center; gap: 4px; }
.footer-actions { display: flex; gap: 8px; }
.send-btn { background: linear-gradient(135deg, #4f46e5, #6366f1) !important; border: none !important; color: #fff !important; }

.cmd-dialog :deep(.el-dialog__body) { padding-top: 0; padding-bottom: 0; }
</style>
