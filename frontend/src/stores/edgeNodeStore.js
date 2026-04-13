import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { edgeCommandApi } from '../api/edgeCommand'

export const useEdgeNodeStore = defineStore('edgeNode', () => {
  const loading = ref(false)
  const commands = ref([])
  const stats = ref(null)

  const onlineRate = computed(() => {
    // No direct node data yet, derive from stats
    return stats.value?.onlineRate || 0
  })

  async function fetchRecentCommands() {
    loading.value = true
    try {
      const res = await edgeCommandApi.getRecentCommands(50)
      commands.value = res.data?.data || res.data || []
    } finally {
      loading.value = false
    }
  }

  async function dispatchCommand(terminalId, type, payload) {
    const res = await edgeCommandApi.dispatchCommand(terminalId, type, payload)
    const cmd = res.data?.data || res.data
    if (cmd?.commandId) {
      commands.value.unshift(cmd)
    }
    return cmd
  }

  async function fetchStats() {
    const res = await edgeCommandApi.getMessageStats()
    stats.value = res.data?.data || res.data || {}
  }

  let pollTimer = null

  function startPolling(intervalMs = 10000) {
    fetchRecentCommands()
    fetchStats()
    pollTimer = setInterval(() => {
      fetchRecentCommands()
      fetchStats()
    }, intervalMs)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  return {
    loading, commands, stats, onlineRate,
    fetchRecentCommands, dispatchCommand, fetchStats,
    startPolling, stopPolling
  }
})
