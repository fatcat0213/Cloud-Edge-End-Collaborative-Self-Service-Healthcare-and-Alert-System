import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSimulatorTerminals } from '../api'

const TERMINAL_LOCATIONS = {
  T001: '门诊大厅1号', T002: '门诊大厅2号', T003: '急诊通道',
  T004: '住院楼1层',   T005: '住院楼2层',   T006: '住院楼3层',
  T007: '门诊大厅3号', T008: '门诊大厅4号', T009: '检验中心',
  T010: '放射科',      T011: '儿科门诊',   T012: '内科门诊',
  T013: '外科门诊',    T014: '妇产科',     T015: '中医门诊',
  T016: '眼科门诊',    T017: '口腔科',     T018: '皮肤科',
  T019: '神经内科',    T020: '心血管科'
}

// Static demo snapshot: realistic spread used when simulator is unreachable
const DEMO_OVERRIDES = {
  T003: { status: 'offline',  cpu: 0,  memory: 0,  hardware: { printer: 'ok', cardReader: 'ok', screen: 'ok' } },
  T007: { status: 'degraded', cpu: 85, memory: 62, hardware: { printer: 'paper_jam', cardReader: 'ok', screen: 'ok' } },
  T012: { status: 'degraded', cpu: 54, memory: 88, hardware: { printer: 'ok', cardReader: 'error', screen: 'ok' } },
  T018: { status: 'offline',  cpu: 0,  memory: 0,  hardware: { printer: 'ok', cardReader: 'ok', screen: 'ok' } },
}

function makeDemoTerminal(id) {
  const override = DEMO_OVERRIDES[id]
  const n = parseInt(id.slice(1), 10)

  if (override) {
    // offline terminals: no queue, stale heartbeat
    const heartbeatSecsAgo = override.status === 'offline' ? 300 + (n * 47) % 600 : (n * 7) % 30
    return {
      id,
      location: TERMINAL_LOCATIONS[id],
      queue: { depth: 0, avgWaitMs: 0 },
      todayTx: override.status === 'offline' ? 0 : 20 + (n * 11) % 40,
      heartbeatSecsAgo,
      ...override
    }
  }

  // Deterministic-but-varied metrics
  const cpu = 20 + ((n * 17) % 45)
  const memory = 30 + ((n * 13) % 40)
  const queueDepth = 5 + ((n * 7) % 25)
  const avgWaitMs = queueDepth * 240000 + (n % 5) * 60000
  const todayTx = 40 + ((n * 23) % 80)
  const heartbeatSecsAgo = (n * 7) % 30

  return {
    id,
    location: TERMINAL_LOCATIONS[id],
    status: 'online',
    hardware: { printer: 'ok', cardReader: 'ok', screen: 'ok' },
    cpu,
    memory,
    queue: { depth: queueDepth, avgWaitMs },
    todayTx,
    heartbeatSecsAgo
  }
}

export const useTerminalsStore = defineStore('terminals', () => {
  const terminals = ref(
    Object.keys(TERMINAL_LOCATIONS).map(id => makeDemoTerminal(id))
  )

  const onlineCount    = computed(() => terminals.value.filter(t => t.status === 'online').length)
  const offlineCount   = computed(() => terminals.value.filter(t => t.status === 'offline').length)
  const degradedCount  = computed(() => terminals.value.filter(t => t.status === 'degraded').length)

  let fetchTimer = null

  function normalizeTerminalsPayload(payload) {
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.terminals)) return payload.terminals
    if (Array.isArray(payload?.data)) return payload.data
    if (Array.isArray(payload?.data?.terminals)) return payload.data.terminals
    return []
  }

  // P0-2: 从 simulator-service 拉取真实终端状态
  async function fetchTerminals() {
    try {
      const res = await getSimulatorTerminals()
      // 接口返回 List<{terminalId, online, cpu, memory, ...}>
      const rawList = normalizeTerminalsPayload(res?.data)

      const rawMap = {}
      rawList.forEach(item => {
        rawMap[item.terminalId] = item
      })

      terminals.value = terminals.value.map(t => {
        const raw = rawMap[t.id]
        if (!raw) return t

        const online = raw.online !== false
        let status = online ? 'online' : 'offline'
        const hardware = { printer: 'ok', cardReader: 'ok', screen: 'ok' }

        // cpu > 80 或 memory > 80 视为降级
        if (raw.cpu > 80 || raw.memory > 80) {
          status = 'degraded'
          if (raw.cpu > 80) hardware.printer = 'degraded'
          if (raw.memory > 80) hardware.cardReader = 'degraded'
        }

        return {
          ...t,
          status,
          hardware,
          cpu: raw.cpu ?? 0,
          memory: raw.memory ?? 0
        }
      })
    } catch (e) {
      console.warn('[fetchTerminals] failed:', e)
    }
  }

  // 保留 applyAlerts：将告警状态叠加到接口数据之上
  function applyAlerts(alerts) {
    const safeAlerts = Array.isArray(alerts) ? alerts : []
    const map = {}
    safeAlerts.forEach(a => {
      if (!map[a.terminalId]) map[a.terminalId] = []
      map[a.terminalId].push(a)
    })
    terminals.value = terminals.value.map(t => {
      const termAlerts = map[t.id] || []
      const hwAlert = termAlerts.find(a => a.type === 'HARDWARE')
      const newT = { ...t, hardware: { ...t.hardware } }
      if (hwAlert) {
        if (hwAlert.message?.includes('离线')) {
          newT.status = 'offline'
        } else if (hwAlert.message?.includes('打印机')) {
          newT.status = 'degraded'
          newT.hardware.printer = 'paper_jam'
        } else if (hwAlert.message?.includes('读卡')) {
          newT.status = 'degraded'
          newT.hardware.cardReader = 'error'
        }
      }
      return newT
    })
  }

  function resetAll() {
    terminals.value.forEach(t => {
      t.status = 'online'
      t.hardware = { printer: 'ok', cardReader: 'ok', screen: 'ok' }
      t.cpu = 0
      t.memory = 0
    })
  }

  // 模拟命令效果：修改终端状态
  function setTerminalStatus(terminalId, status) {
    terminals.value = terminals.value.map(t =>
      t.id === terminalId ? { ...t, status } : t
    )
  }

  // 关机 → 离线
  function simulateShutdown(terminalId) {
    setTerminalStatus(terminalId, 'offline')
  }

  // 重启 → 离线 10 秒后恢复
  function simulateRestart(terminalId) {
    setTerminalStatus(terminalId, 'offline')
    setTimeout(() => setTerminalStatus(terminalId, 'online'), 10000)
  }

  // 维护 → 降级
  function simulateMaintenance(terminalId) {
    setTerminalStatus(terminalId, 'degraded')
  }

  function startPolling(interval = 5000) {
    fetchTerminals()
    fetchTimer = setInterval(fetchTerminals, interval)
  }

  function stopPolling() {
    if (fetchTimer) clearInterval(fetchTimer)
  }

  return {
    terminals, onlineCount, offlineCount, degradedCount,
    fetchTerminals, applyAlerts, resetAll,
    startPolling, stopPolling,
    setTerminalStatus, simulateShutdown, simulateRestart, simulateMaintenance
  }
})
