import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  getPaymentStatistics,
  getPaymentRecords,
  getRegistrationRecords,
  getQueueByDept,
  getEdgeAlerts,
  getOpsLogs
} from '../api'

const DEPTS = ['NEU', 'CARD', 'ORTH', 'INT', 'EMRG']

export const useCloudSideStore = defineStore('cloudSide', () => {
  const loading = ref(false)
  const paymentStats = ref(null)
  const paymentRecords = ref([])
  const registrationRecords = ref([])
  const queueSnapshot = ref([])
  const edgeAlerts = ref([])
  const opsLog = ref([])

  async function recordOperation({ type, terminalId, status = 'SUCCESS', detail = '', operator = '系统' }) {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      operator,
      type,
      terminalId: terminalId || '-',
      status,
      detail
    }
    // Persist to backend (Redis) — fire and forget, don't block UI
    getOpsLogs(entry).catch(() => {})
    // Also keep in memory for current session reactivity
    opsLog.value.unshift(entry)
    if (opsLog.value.length > 100) opsLog.value = opsLog.value.slice(0, 100)
  }

  const totalTransactions = computed(() => paymentStats.value?.totalTransactions || paymentRecords.value.length)
  const paymentSuccessRate = computed(() => paymentStats.value?.successRate || 0)
  const registrationCount = computed(() => registrationRecords.value.length)
  const activeAlerts = computed(() => edgeAlerts.value.filter(a => (a.status || 'ACTIVE') === 'ACTIVE').length)
  const queueDepthTotal = computed(() => queueSnapshot.value.reduce((sum, q) => sum + (q.depth || 0), 0))

  async function refresh() {
    loading.value = true
    try {
      const [statsRes, payRes, regRes, alertsRes, queueRes] = await Promise.all([
        getPaymentStatistics(),
        getPaymentRecords(),
        getRegistrationRecords(),
        getEdgeAlerts({ all: true }),
        Promise.all(DEPTS.map(d => getQueueByDept(d)))
      ])

      paymentStats.value = statsRes?.data || null
      paymentRecords.value = Array.isArray(payRes?.data) ? payRes.data : []
      registrationRecords.value = Array.isArray(regRes?.data) ? regRes.data : []

      const alertsPayload = alertsRes?.data
      edgeAlerts.value = Array.isArray(alertsPayload)
        ? alertsPayload
        : Array.isArray(alertsPayload?.items)
          ? alertsPayload.items
          : []

      queueSnapshot.value = queueRes.map(r => r?.data || r || {})

      // Fetch opsLog from backend (Redis) on refresh
      try {
        const opsRes = await getOpsLogs()
        opsLog.value = Array.isArray(opsRes?.data) ? opsRes.data : []
      } catch (e) {
        // keep in-memory opsLog on error
      }
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    paymentStats,
    paymentRecords,
    registrationRecords,
    queueSnapshot,
    edgeAlerts,
    opsLog,
    totalTransactions,
    paymentSuccessRate,
    registrationCount,
    activeAlerts,
    queueDepthTotal,
    refresh,
    recordOperation
  }
})
