import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const TERMINAL_LOCATIONS = {
  T001: '门诊大厅1号',
  T002: '门诊大厅2号',
  T003: '急诊通道',
  T004: '住院楼1层',
  T005: '住院楼2层',
  T006: '住院楼3层',
  T007: '门诊大厅3号',
  T008: '门诊大厅4号',
  T009: '检验中心',
  T010: '放射科',
  T011: '儿科门诊',
  T012: '内科门诊',
  T013: '外科门诊',
  T014: '妇产科',
  T015: '中医门诊',
  T016: '眼科门诊',
  T017: '口腔科',
  T018: '皮肤科',
  T019: '神经内科',
  T020: '心血管科'
}

function makeDefaultTerminal(id) {
  return {
    id,
    location: TERMINAL_LOCATIONS[id],
    status: 'online',
    hardware: { printer: 'ok', cardReader: 'ok', screen: 'ok' },
    queue: { depth: 0, avgWaitMs: 0 }
  }
}

const DEFAULT_TERMINALS = Object.keys(TERMINAL_LOCATIONS).map(makeDefaultTerminal)

export const useTerminalsStore = defineStore('terminals', () => {
  const terminals = ref(DEFAULT_TERMINALS.map(t => ({ ...t, hardware: { ...t.hardware }, queue: { ...t.queue } })))

  const onlineCount = computed(() => terminals.value.filter(t => t.status === 'online').length)
  const offlineCount = computed(() => terminals.value.filter(t => t.status === 'offline').length)
  const degradedCount = computed(() => terminals.value.filter(t => t.status === 'degraded').length)

  function applyAlerts(alerts) {
    const terminalMap = {}
    alerts.forEach(a => {
      if (!terminalMap[a.terminalId]) terminalMap[a.terminalId] = []
      terminalMap[a.terminalId].push(a)
    })
    terminals.value = terminals.value.map(t => {
      const termAlerts = terminalMap[t.id] || []
      const latestHardware = termAlerts.find(a => a.type === 'HARDWARE')
      const newT = { ...t, hardware: { ...t.hardware } }
      if (latestHardware) {
        if (latestHardware.message && latestHardware.message.includes('离线')) {
          newT.status = 'offline'
        } else if (latestHardware.message && latestHardware.message.includes('打印机')) {
          newT.status = 'degraded'
          newT.hardware.printer = 'paper_jam'
        } else if (latestHardware.message && latestHardware.message.includes('读卡')) {
          newT.status = 'degraded'
          newT.hardware.cardReader = 'error'
        }
      }
      return newT
    })
  }

  function resetAll() {
    terminals.value = DEFAULT_TERMINALS.map(t => ({
      ...t,
      hardware: { ...t.hardware },
      queue: { ...t.queue }
    }))
  }

  return { terminals, onlineCount, offlineCount, degradedCount, applyAlerts, resetAll }
})
