import { defineStore } from 'pinia'
import { ref } from 'vue'
import { startSimulator, stopSimulator, injectScene, getAlerts } from '../api'

const MAX_EVENT_LOG = 50

export const useSimulatorStore = defineStore('simulator', () => {
  const running = ref(false)
  const runningCount = ref(0)
  const totalSent = ref(0)
  const totalAlerts = ref(0)
  const eventLog = ref([])
  const apiReady = ref(false)
  let timer = null

  function pushEvent(entry) {
    eventLog.value.push(entry)
    if (eventLog.value.length > MAX_EVENT_LOG) {
      eventLog.value.shift()
    }
  }

  async function start() {
    try {
      await startSimulator()
      running.value = true
      apiReady.value = true
    } catch (e) {
      // API not available — degrade gracefully, do not throw
      apiReady.value = false
    }
  }

  async function stop() {
    try {
      await stopSimulator()
    } catch (e) {
      // Degrade silently
    } finally {
      running.value = false
    }
  }

  async function inject(scene, terminalId) {
    // Always push to event log regardless of API result
    pushEvent({
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      layer: '端层',
      message: `注入场景: ${scene} → ${terminalId}`
    })

    try {
      await injectScene({ scene, terminalId })
    } catch (e) {
      // Degrade silently — event log already recorded
    }
  }

  function addEventFromAlert(alert) {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })

    // Edge layer event
    pushEvent({
      time,
      layer: '边层',
      message: `[${alert.level}] ${alert.terminalId} — ${alert.type}: ${alert.message || '告警触发'}`
    })

    // Cloud layer event
    pushEvent({
      time,
      layer: '云层',
      message: `收到告警 ${alert.id || ''} 来自 ${alert.terminalId}，级别 ${alert.level}`
    })
  }

  function startPolling(interval = 3000) {
    timer = setInterval(async () => {
      try {
        const res = await getAlerts()
        const newCount = res.data?.length ?? 0
        if (newCount > totalAlerts.value) {
          totalAlerts.value = newCount
        }
        totalSent.value += 20 // simulate heartbeat packet count
        runningCount.value = newCount
      } catch (e) {
        // Degrade silently
      }
    }, interval)
  }

  function stopPolling() {
    if (timer) clearInterval(timer)
  }

  return {
    running,
    runningCount,
    totalSent,
    totalAlerts,
    eventLog,
    apiReady,
    start,
    stop,
    inject,
    addEventFromAlert,
    startPolling,
    stopPolling
  }
})
