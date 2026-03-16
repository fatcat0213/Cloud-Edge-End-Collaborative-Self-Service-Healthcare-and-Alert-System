import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSimulatorStore } from '../../stores/simulator'

vi.mock('../../api', () => ({
  startSimulator: vi.fn(),
  stopSimulator: vi.fn(),
  injectScene: vi.fn(),
  getAlerts: vi.fn()
}))
import { startSimulator, injectScene } from '../../api'

describe('simulator store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('start() with API error sets apiReady to false and does not throw', async () => {
    startSimulator.mockRejectedValue(new Error('Network Error'))

    const store = useSimulatorStore()
    await expect(store.start()).resolves.toBeUndefined()

    expect(store.apiReady).toBe(false)
    expect(store.running).toBe(false)
  })

  it('start() with successful API sets running to true and apiReady to true', async () => {
    startSimulator.mockResolvedValue({ data: { status: 'started' } })

    const store = useSimulatorStore()
    await store.start()

    expect(store.running).toBe(true)
    expect(store.apiReady).toBe(true)
  })

  it('inject() pushes to eventLog', async () => {
    injectScene.mockResolvedValue({ data: {} })

    const store = useSimulatorStore()
    await store.inject('card_error', 'T007')

    expect(store.eventLog.length).toBe(1)
    expect(store.eventLog[0].layer).toBe('端层')
    expect(store.eventLog[0].message).toContain('T007')
    expect(store.eventLog[0].message).toContain('card_error')
  })

  it('inject() still pushes to eventLog when API fails', async () => {
    injectScene.mockRejectedValue(new Error('Not found'))

    const store = useSimulatorStore()
    await store.inject('printer_jam', 'T003')

    expect(store.eventLog.length).toBe(1)
    expect(store.eventLog[0].message).toContain('printer_jam')
  })

  it('addEventFromAlert pushes 2 entries (边层 + 云层)', () => {
    const store = useSimulatorStore()
    store.addEventFromAlert({
      id: 'a001',
      level: 'P0',
      type: 'HARDWARE',
      terminalId: 'T001',
      message: '打印机卡纸'
    })

    expect(store.eventLog.length).toBe(2)
    expect(store.eventLog[0].layer).toBe('边层')
    expect(store.eventLog[1].layer).toBe('云层')
  })

  it('eventLog is capped at 50 entries', () => {
    const store = useSimulatorStore()
    const alert = { id: 'x', level: 'P1', type: 'PERFORMANCE', terminalId: 'T002', message: 'test' }

    // Each addEventFromAlert adds 2; call 26 times = 52 entries, should cap at 50
    for (let i = 0; i < 26; i++) {
      store.addEventFromAlert(alert)
    }

    expect(store.eventLog.length).toBe(50)
  })
})
