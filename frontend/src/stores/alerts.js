import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getAlerts } from '../api'

export const useAlertsStore = defineStore('alerts', () => {
  const alerts = ref([])
  const loading = ref(false)
  let timer = null

  const p0Count = computed(() => alerts.value.filter(a => a.level === 'P0').length)
  const p1Count = computed(() => alerts.value.filter(a => a.level === 'P1').length)
  const totalCount = computed(() => alerts.value.length)

  async function fetchAlerts() {
    try {
      loading.value = true
      const res = await getAlerts()
      alerts.value = res.data
    } catch (e) {
      // edge service may not have alerts yet
    } finally {
      loading.value = false
    }
  }

  function startPolling(interval = 5000) {
    fetchAlerts()
    timer = setInterval(fetchAlerts, interval)
  }

  function stopPolling() {
    if (timer) clearInterval(timer)
  }

  return { alerts, loading, p0Count, p1Count, totalCount, fetchAlerts, startPolling, stopPolling }
})
