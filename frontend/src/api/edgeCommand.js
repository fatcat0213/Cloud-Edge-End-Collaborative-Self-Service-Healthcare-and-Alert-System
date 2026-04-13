import axios from 'axios'

const client = axios.create({
  baseURL: '/api/v1'
})

export const edgeCommandApi = {
  dispatchCommand(terminalId, type, payload = null) {
    return client.post('/commands/dispatch', payload, {
      params: { terminalId, type }
    })
  },

  getRecentCommands(limit = 20) {
    return client.get('/commands/recent', { params: { limit } })
  },

  getCommandStatus(commandId) {
    return client.get(`/commands/${commandId}`)
  },

  getMessageStats() {
    return client.get('/stats/messages')
  }
}
