import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAlertsStore } from '../../stores/alerts'

vi.mock('../../api', () => ({
  getAlerts: vi.fn()
}))
import { getAlerts } from '../../api'

const makeAlerts = (count, overrides = {}) =>
  Array.from({ length: count }, (_, i) => ({
    id: `alert-${i}`,
    level: i % 3 === 0 ? 'P0' : 'P1',
    type: i % 2 === 0 ? 'HARDWARE' : 'PERFORMANCE',
    terminalId: `T00${(i % 5) + 1}`,
    message: `Alert ${i}`,
    ...overrides
  }))

describe('alerts store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('filteredAlerts filters by level correctly', async () => {
    getAlerts.mockResolvedValue({ data: makeAlerts(10) })
    const store = useAlertsStore()
    await store.fetchAlerts()

    store.setFilter({ level: 'P0' })
    const p0Alerts = store.filteredAlerts
    expect(p0Alerts.every(a => a.level === 'P0')).toBe(true)
    expect(p0Alerts.length).toBeLessThan(10)
  })

  it('pagedAlerts returns correct slice for page 1 with pageSize 20', async () => {
    const manyAlerts = makeAlerts(45)
    getAlerts.mockResolvedValue({ data: manyAlerts })
    const store = useAlertsStore()
    await store.fetchAlerts()

    expect(store.pagedAlerts.length).toBe(20)
    expect(store.totalPages).toBe(3)
  })

  it('pagedAlerts returns last page slice', async () => {
    const manyAlerts = makeAlerts(45)
    getAlerts.mockResolvedValue({ data: manyAlerts })
    const store = useAlertsStore()
    await store.fetchAlerts()

    store.setPage(3)
    expect(store.pagedAlerts.length).toBe(5)
  })

  it('setFilter resets currentPage to 1', async () => {
    getAlerts.mockResolvedValue({ data: makeAlerts(60) })
    const store = useAlertsStore()
    await store.fetchAlerts()

    store.setPage(3)
    expect(store.currentPage).toBe(3)

    store.setFilter({ level: 'P0' })
    expect(store.currentPage).toBe(1)
  })

  it('hasNewAlerts is true when new alerts arrive', async () => {
    getAlerts.mockResolvedValue({ data: makeAlerts(5) })
    const store = useAlertsStore()
    await store.fetchAlerts()
    expect(store.hasNewAlerts).toBe(true) // previousTotal=0, filteredAlerts.length=5 => true

    // Second fetch with more alerts
    getAlerts.mockResolvedValue({ data: makeAlerts(10) })
    await store.fetchAlerts()
    // previousTotal is now 5, filteredAlerts.length is 10
    expect(store.hasNewAlerts).toBe(true)
  })
})
