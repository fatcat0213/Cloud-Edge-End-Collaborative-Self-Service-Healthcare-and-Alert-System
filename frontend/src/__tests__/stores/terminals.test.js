import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTerminalsStore } from '../../stores/terminals'

describe('terminals store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has 20 terminals initially', () => {
    const store = useTerminalsStore()
    expect(store.terminals.length).toBe(20)
  })

  it('all terminals start with status online', () => {
    const store = useTerminalsStore()
    expect(store.terminals.every(t => t.status === 'online')).toBe(true)
  })

  it('includes T020 心血管科', () => {
    const store = useTerminalsStore()
    const t020 = store.terminals.find(t => t.id === 'T020')
    expect(t020).toBeDefined()
    expect(t020.location).toBe('心血管科')
  })

  it('applyAlerts with P0 hardware printer alert sets terminal to degraded', () => {
    const store = useTerminalsStore()
    store.applyAlerts([
      { terminalId: 'T005', type: 'HARDWARE', level: 'P0', message: '打印机卡纸' }
    ])
    const t005 = store.terminals.find(t => t.id === 'T005')
    expect(t005.status).toBe('degraded')
    expect(t005.hardware.printer).toBe('paper_jam')
  })

  it('applyAlerts with offline message sets terminal to offline', () => {
    const store = useTerminalsStore()
    store.applyAlerts([
      { terminalId: 'T003', type: 'HARDWARE', level: 'P0', message: '终端离线' }
    ])
    const t003 = store.terminals.find(t => t.id === 'T003')
    expect(t003.status).toBe('offline')
  })

  it('resetAll returns all terminals to online status', () => {
    const store = useTerminalsStore()
    store.applyAlerts([
      { terminalId: 'T001', type: 'HARDWARE', level: 'P0', message: '终端离线' },
      { terminalId: 'T010', type: 'HARDWARE', level: 'P0', message: '打印机卡纸' }
    ])
    expect(store.offlineCount).toBeGreaterThan(0)

    store.resetAll()
    expect(store.onlineCount).toBe(20)
    expect(store.offlineCount).toBe(0)
    expect(store.degradedCount).toBe(0)
  })
})
