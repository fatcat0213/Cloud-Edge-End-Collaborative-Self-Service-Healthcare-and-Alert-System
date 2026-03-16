import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStatsStore } from '../../stores/stats'

vi.mock('../../api', () => ({
  getPaymentStats: vi.fn()
}))
import { getPaymentStats } from '../../api'

describe('stats store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchStats sets paymentSuccessRate on success', async () => {
    getPaymentStats.mockResolvedValue({ data: { paymentSuccessRate: 0.987 } })

    const store = useStatsStore()
    await store.fetchStats()

    expect(store.paymentSuccessRate).toBe(0.987)
  })

  it('fetchStats sets null on error (graceful degradation)', async () => {
    getPaymentStats.mockRejectedValue(new Error('Network Error'))

    const store = useStatsStore()
    await store.fetchStats()

    expect(store.paymentSuccessRate).toBeNull()
  })

  it('fetchStats sets null on 404', async () => {
    getPaymentStats.mockRejectedValue({ response: { status: 404 } })

    const store = useStatsStore()
    await store.fetchStats()

    expect(store.paymentSuccessRate).toBeNull()
  })

  it('loading is false after fetchStats resolves', async () => {
    getPaymentStats.mockResolvedValue({ data: { paymentSuccessRate: 0.95 } })

    const store = useStatsStore()
    await store.fetchStats()

    expect(store.loading).toBe(false)
  })
})
