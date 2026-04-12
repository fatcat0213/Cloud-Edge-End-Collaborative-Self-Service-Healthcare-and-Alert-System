import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getEdgeAlerts, acknowledgeAlert, resolveAlert } from '../api'

export const useAlertsStore = defineStore('alerts', () => {
  const alerts = ref([])
  const loading = ref(false)
  let timer = null

  // Filter state
  const filterLevel = ref('')
  const filterType = ref('')
  const filterTerminalId = ref('')
  const filterStartTime = ref(null)
  const filterEndTime = ref(null)
  const filterStatus = ref('')  // ACTIVE, ACKNOWLEDGED, RESOLVED

  // Pagination state
  const currentPage = ref(1)
  const pageSize = 20

  // Track previous total to detect new arrivals
  const previousTotal = ref(0)

  // Core counts
  const p0Count = computed(() => alerts.value.filter(a => a.level === 'P0').length)
  const p1Count = computed(() => alerts.value.filter(a => a.level === 'P1').length)
  const totalCount = computed(() => alerts.value.length)
  const activeCount = computed(() => alerts.value.filter(a => a.status === 'ACTIVE' || !a.status).length)

  // Filtered alerts
  const filteredAlerts = computed(() => {
    return alerts.value.filter(a => {
      if (filterLevel.value && a.level !== filterLevel.value) return false
      if (filterType.value && a.type !== filterType.value) return false
      if (filterTerminalId.value && a.terminalId !== filterTerminalId.value) return false
      if (filterStartTime.value && new Date(a.timestamp) < filterStartTime.value) return false
      if (filterEndTime.value && new Date(a.timestamp) > filterEndTime.value) return false
      if (filterStatus.value && a.status !== filterStatus.value) return false
      return true
    })
  })

  // Paginated slice of filtered alerts
  const pagedAlerts = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    return filteredAlerts.value.slice(start, start + pageSize)
  })

  // Total pages
  const totalPages = computed(() => Math.ceil(filteredAlerts.value.length / pageSize))

  // True when new alerts arrived since last fetch comparison
  const hasNewAlerts = computed(() => filteredAlerts.value.length > previousTotal.value)

  function normalizeAlertsPayload(payload) {
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.data)) return payload.data
    if (Array.isArray(payload?.items)) return payload.items
    if (Array.isArray(payload?.data?.items)) return payload.data.items
    return []
  }

  async function fetchAlerts() {
    try {
      loading.value = true
      const res = await getEdgeAlerts({ all: true })
      previousTotal.value = alerts.value.length
      alerts.value = normalizeAlertsPayload(res?.data)
    } catch (e) {
      console.error('Failed to fetch alerts:', e)
      alerts.value = []
    } finally {
      loading.value = false
    }
  }

  async function acknowledge(alertId) {
    try {
      await acknowledgeAlert(alertId)
      // Update local state
      const alert = alerts.value.find(a => a.id === alertId)
      if (alert) {
        alert.status = 'ACKNOWLEDGED'
        alert.acknowledgedAt = Date.now()
      }
    } catch (e) {
      console.error('Failed to acknowledge alert:', e)
    }
  }

  async function resolve(alertId) {
    try {
      await resolveAlert(alertId)
      // Update local state
      const alert = alerts.value.find(a => a.id === alertId)
      if (alert) {
        alert.status = 'RESOLVED'
        alert.resolvedAt = Date.now()
      }
    } catch (e) {
      console.error('Failed to resolve alert:', e)
    }
  }

  function setFilter({ level = '', type = '', terminalId = '', startTime = null, endTime = null, status = '' } = {}) {
    filterLevel.value = level
    filterType.value = type
    filterTerminalId.value = terminalId
    filterStartTime.value = startTime
    filterEndTime.value = endTime
    filterStatus.value = status
    currentPage.value = 1
  }

  function setPage(n) {
    const clamped = Math.max(1, Math.min(n, totalPages.value || 1))
    currentPage.value = clamped
  }

  function startPolling(interval = 5000) {
    fetchAlerts()
    timer = setInterval(fetchAlerts, interval)
  }

  function stopPolling() {
    if (timer) clearInterval(timer)
  }

  function acknowledgeNewAlerts() {
    previousTotal.value = filteredAlerts.value.length
  }

  // 24h 分组 (用于未来趋势图扩展)
  const alertsByHour = computed(() => {
    const now = Date.now()
    const buckets = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: 0,
      p0: 0, p1: 0, p2: 0
    }))
    for (const a of alerts.value) {
      if (!a.timestamp) continue
      const age = now - new Date(a.timestamp).getTime()
      if (age < 0 || age > 86400000) continue
      const h = new Date(a.timestamp).getHours()
      buckets[h].count++
      if (a.level === 'P0') buckets[h].p0++
      else if (a.level === 'P1') buckets[h].p1++
      else buckets[h].p2++
    }
    return buckets
  })

  // 按来源分组统计
  const bySource = computed(() => {
    const map = { EDGE: 0, CLOUD: 0, TERMINAL: 0 }
    for (const a of alerts.value) {
      const key = (a.source || 'EDGE').toUpperCase()
      if (key in map) map[key]++
      else { map.EDGE = (map.EDGE || 0) + 1 }
    }
    return Object.entries(map).map(([source, count]) => ({ source, count }))
  })

  return {
    alerts,
    loading,
    filterLevel,
    filterType,
    filterTerminalId,
    filterStartTime,
    filterEndTime,
    filterStatus,
    currentPage,
    pageSize,
    p0Count,
    p1Count,
    totalCount,
    activeCount,
    filteredAlerts,
    pagedAlerts,
    totalPages,
    hasNewAlerts,
    fetchAlerts,
    acknowledge,
    resolve,
    setFilter,
    setPage,
    startPolling,
    stopPolling,
    alertsByHour,
    bySource,
    acknowledgeNewAlerts
  }
})
