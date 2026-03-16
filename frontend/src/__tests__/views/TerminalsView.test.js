import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const mockTerminals = Array.from({ length: 20 }, (_, i) => ({
  id: `T${String(i + 1).padStart(3, '0')}`,
  location: `位置${i + 1}`,
  status: i < 14 ? 'online' : i < 17 ? 'degraded' : 'offline',
  printer: 'ok',
  cardReader: 'ok',
  screen: 'ok',
  latestAlert: i >= 14 && i < 17 ? '打印机异常' : null,
  queueDepth: 10,
  avgWaitMs: 5000
}))

vi.mock('../../stores/terminals', () => ({
  useTerminalsStore: () => ({
    terminals: mockTerminals,
    onlineCount: 14,
    offlineCount: 3,
    degradedCount: 3
  })
}))

vi.mock('@element-plus/icons-vue', () => ({
  Printer: { template: '<span>printer</span>' },
  CreditCard: { template: '<span>card</span>' },
  Monitor: { template: '<span>monitor</span>' },
  Warning: { template: '<span>warning</span>' }
}))

import TerminalsView from '../../views/TerminalsView.vue'

function mountView() {
  return mount(TerminalsView, {
    global: {
      plugins: [createPinia()],
      stubs: {
        'el-radio-group': { template: '<div class="el-radio-group"><slot /></div>', props: ['modelValue'] },
        'el-radio-button': { template: '<button class="el-radio-button"><slot /></button>', props: ['value'] },
        'el-badge': { template: '<span class="el-badge"><slot /></span>', props: ['value', 'type'] },
        'el-tag': { template: '<span class="el-tag"><slot /></span>', props: ['type', 'size'] },
        'el-tooltip': { template: '<div><slot /></div>' },
        'el-icon': { template: '<i class="el-icon"><slot /></i>' }
      }
    }
  })
}

describe('TerminalsView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders 20 terminal cards when filter is all', () => {
    const wrapper = mountView()
    const cards = wrapper.findAll('.terminal-card')
    expect(cards.length).toBe(20)
  })

  it('filter online shows only online terminals', async () => {
    const wrapper = mountView()
    await wrapper.vm.$nextTick()
    wrapper.vm.filterStatus = 'online'
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.terminal-card')
    expect(cards.length).toBe(14)
  })

  it('degraded terminal card has card-degraded class', () => {
    const wrapper = mountView()
    const degradedCards = wrapper.findAll('.card-degraded')
    expect(degradedCards.length).toBe(3)
  })
})
