import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getAlerts } from '../api'

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

  // Pagination state
  const currentPage = ref(1)
  const pageSize = 20

  // Track previous total to detect new arrivals
  const previousTotal = ref(0)

  // Core counts
  const p0Count = computed(() => alerts.value.filter(a => a.level === 'P0').length)
  const p1Count = computed(() => alerts.value.filter(a => a.level === 'P1').length)
  const totalCount = computed(() => alerts.value.length)

  // Filtered alerts
  const filteredAlerts = computed(() => {
    return alerts.value.filter(a => {
      if (filterLevel.value && a.level !== filterLevel.value) return false
      if (filterType.value && a.type !== filterType.value) return false
      if (filterTerminalId.value && a.terminalId !== filterTerminalId.value) return false
      if (filterStartTime.value && new Date(a.timestamp) < filterStartTime.value) return false
      if (filterEndTime.value && new Date(a.timestamp) > filterEndTime.value) return false
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

  async function fetchAlerts() {
    try {
      loading.value = true
      const res = await getAlerts()
      previousTotal.value = alerts.value.length
      alerts.value = res.data
    } catch (e) {
      // edge service may not have alerts yet — degrade silently
    } finally {
      loading.value = false
    }
  }

  function setFilter({ level = '', type = '', terminalId = '', startTime = null, endTime = null } = {}) {
    filterLevel.value = level
    filterType.value = type
    filterTerminalId.value = terminalId
    filterStartTime.value = startTime
    filterEndTime.value = endTime
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

  return {
    alerts,
    loading,
    filterLevel,
    filterType,
    filterTerminalId,
    filterStartTime,
    filterEndTime,
    currentPage,
    pageSize,
    p0Count,
    p1Count,
    totalCount,
    filteredAlerts,
    pagedAlerts,
    totalPages,
    hasNewAlerts,
    fetchAlerts,
    setFilter,
    setPage,
    startPolling,
    stopPolling,
    acknowledgeNewAlerts
  }
})
