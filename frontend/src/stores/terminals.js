import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAlertsStore } from './alerts'

// Simulate terminal states derived from alerts (in a real system, edge-service would expose terminal states)
export const useTerminalsStore = defineStore('terminals', () => {
  const terminals = ref([
    { id: 'T001', location: '门诊大厅1号', status: 'online', hardware: { printer: 'ok', cardReader: 'ok', screen: 'ok' }, queue: { depth: 0, avgWaitMs: 0 } },
    { id: 'T002', location: '门诊大厅2号', status: 'online', hardware: { printer: 'ok', cardReader: 'ok', screen: 'ok' }, queue: { depth: 0, avgWaitMs: 0 } },
    { id: 'T003', location: '急诊通道',     status: 'online', hardware: { printer: 'ok', cardReader: 'ok', screen: 'ok' }, queue: { depth: 0, avgWaitMs: 0 } },
    { id: 'T004', location: '住院楼1层',   status: 'online', hardware: { printer: 'ok', cardReader: 'ok', screen: 'ok' }, queue: { depth: 0, avgWaitMs: 0 } },
    { id: 'T005', location: '住院楼2层',   status: 'online', hardware: { printer: 'ok', cardReader: 'ok', screen: 'ok' }, queue: { depth: 0, avgWaitMs: 0 } },
  ])

  const onlineCount = computed(() => terminals.value.filter(t => t.status === 'online').length)
  const offlineCount = computed(() => terminals.value.filter(t => t.status === 'offline').length)
  const degradedCount = computed(() => terminals.value.filter(t => t.status === 'degraded').length)

  // Apply latest alert state to terminals
  function applyAlerts(alerts) {
    const terminalMap = {}
    alerts.forEach(a => {
      if (!terminalMap[a.terminalId]) terminalMap[a.terminalId] = []
      terminalMap[a.terminalId].push(a)
    })
    terminals.value = terminals.value.map(t => {
      const termAlerts = terminalMap[t.id] || []
      const latestHardware = termAlerts.find(a => a.type === 'HARDWARE')
      const newT = { ...t }
      if (latestHardware) {
        if (latestHardware.message && latestHardware.message.includes('离线')) {
          newT.status = 'offline'
        } else if (latestHardware.message && latestHardware.message.includes('打印机')) {
          newT.status = 'degraded'
          newT.hardware = { ...t.hardware, printer: 'paper_jam' }
        } else if (latestHardware.message && latestHardware.message.includes('读卡')) {
          newT.status = 'degraded'
          newT.hardware = { ...t.hardware, cardReader: 'error' }
        }
      }
      return newT
    })
  }

  return { terminals, onlineCount, offlineCount, degradedCount, applyAlerts }
})
