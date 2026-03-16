import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getPaymentStats } from '../api'

export const useStatsStore = defineStore('stats', () => {
  const paymentSuccessRate = ref(null)
  const loading = ref(false)
  let timer = null

  async function fetchStats() {
    try {
      loading.value = true
      const res = await getPaymentStats()
      paymentSuccessRate.value = res.data?.paymentSuccessRate ?? res.data ?? null
    } catch (e) {
      // Graceful degradation: backend may not expose this endpoint yet
      paymentSuccessRate.value = null
    } finally {
      loading.value = false
    }
  }

  function startPolling(interval = 10000) {
    fetchStats()
    timer = setInterval(fetchStats, interval)
  }

  function stopPolling() {
    if (timer) clearInterval(timer)
  }

  return { paymentSuccessRate, loading, fetchStats, startPolling, stopPolling }
})
