import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { edgeCommandApi } from '../api/edgeCommand'

export const useEdgeNodeStore = defineStore('edgeNode', () => {
  const loading = ref(false)
  const commands = ref([])
  const stats = ref(null)

  // Command filter state
  const cmdFilterType = ref('')
  const cmdFilterTerminal = ref('')
  const cmdFilterStartTime = ref(null)
  const cmdFilterEndTime = ref(null)

  // Filtered commands based on filter criteria
  const filteredCommands = computed(() => {
    return (commands.value || []).filter(cmd => {
      if (cmdFilterType.value && cmd.type !== cmdFilterType.value) return false
      if (cmdFilterTerminal.value && cmd.terminalId !== cmdFilterTerminal.value) return false
      const cmdTime = cmd.timestamp || cmd.createdAt
      if (cmdFilterStartTime.value && cmdTime && new Date(cmdTime) < cmdFilterStartTime.value) return false
      if (cmdFilterEndTime.value && cmdTime && new Date(cmdTime) > cmdFilterEndTime.value) return false
      return true
    })
  })

  function setCmdFilter({ type = '', terminalId = '', startTime = null, endTime = null } = {}) {
    cmdFilterType.value = type
    cmdFilterTerminal.value = terminalId
    cmdFilterStartTime.value = startTime
    cmdFilterEndTime.value = endTime
  }
  let fetching = false

  const onlineRate = computed(() => {
    // No direct node data yet, derive from stats
    return stats.value?.onlineRate || 0
  })

  async function fetchRecentCommands() {
    if (fetching) return
    fetching = true
    loading.value = true
    try {
      const res = await edgeCommandApi.getRecentCommands(50)
      const data = res.data?.data ?? res.data
      commands.value = Array.isArray(data) ? data : []
    } catch (e) {
      // keep existing commands on error
    } finally {
      loading.value = false
      fetching = false
    }
  }

  async function dispatchCommand(terminalId, type, payload) {
    const res = await edgeCommandApi.dispatchCommand(terminalId, type, payload)
    const cmd = res.data?.data ?? res.data
    // Record operation
    const { useCloudSideStore } = await import('./cloudSide')
    const cloudSideStore = useCloudSideStore()
    cloudSideStore.recordOperation({
      type: 'SEND_COMMAND',
      terminalId,
      status: cmd?.status || 'SENT',
      detail: `${type} -> ${terminalId}`
    })
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
    startPolling, stopPolling,
    cmdFilterType, cmdFilterTerminal, cmdFilterStartTime, cmdFilterEndTime,
    filteredCommands, setCmdFilter
  }
})
