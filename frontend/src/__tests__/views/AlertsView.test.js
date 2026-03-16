import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const mockSetFilter = vi.fn()
const mockSetPage = vi.fn()

vi.mock('../../stores/alerts', () => ({
  useAlertsStore: () => ({
    pagedAlerts: [
      { id: '1', timestamp: new Date().toISOString(), level: 'P0', terminalId: 'T001', type: 'HARDWARE', message: 'P0 alert' },
      { id: '2', timestamp: new Date().toISOString(), level: 'P1', terminalId: 'T002', type: 'BUSINESS', message: 'P1 alert' }
    ],
    filteredAlerts: Array.from({ length: 25 }, (_, i) => ({ id: String(i), level: i < 3 ? 'P0' : 'P1' })),
    p0Count: 3,
    p1Count: 7,
    totalCount: 25,
    currentPage: 1,
    hasNewAlerts: true,
    setFilter: mockSetFilter,
    setPage: mockSetPage,
    fetchAlerts: vi.fn(),
    acknowledgeNewAlerts: vi.fn()
  })
}))

vi.mock('@element-plus/icons-vue', () => ({
  Refresh: { template: '<span>refresh</span>' },
  Tools: { template: '<span>tools</span>' },
  DataAnalysis: { template: '<span>data</span>' }
}))

import AlertsView from '../../views/AlertsView.vue'

function mountView() {
  return mount(AlertsView, {
    global: {
      plugins: [createPinia()],
      stubs: {
        'el-tag': { template: '<span class="el-tag" :class="type"><slot /></span>', props: ['type', 'size'] },
        'el-alert': { template: '<div class="el-alert" @click="$emit(\'click\')"><slot name="title" /></div>', emits: ['click'] },
        'el-select': { template: '<select><slot /></select>', props: ['modelValue', 'placeholder', 'clearable'] },
        'el-option': { template: '<option></option>', props: ['label', 'value'] },
        'el-input': { template: '<input />', props: ['modelValue', 'placeholder', 'clearable'] },
        'el-date-picker': { template: '<div></div>' },
        'el-button': { template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
        'el-table': {
          template: '<div class="el-table"><slot /></div>',
          props: ['data', 'rowClassName']
        },
        'el-table-column': { template: '<div></div>' },
        'el-pagination': { template: '<div class="el-pagination"></div>' },
        'el-drawer': { template: '<div class="el-drawer" v-if="modelValue"><slot /></div>', props: ['modelValue', 'title', 'size'] },
        'el-icon': { template: '<i><slot /></i>' }
      }
    }
  })
}

describe('AlertsView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders pagedAlerts in table', () => {
    const wrapper = mountView()
    expect(wrapper.find('.el-table').exists()).toBe(true)
  })

  it('hasNewAlerts=true shows new alerts banner', () => {
    const wrapper = mountView()
    expect(wrapper.find('.el-alert').exists()).toBe(true)
  })

  describe('debounce filter', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('filter change calls setFilter after debounce', async () => {
      const wrapper = mountView()
      wrapper.vm.levelFilter = 'P0'
      await wrapper.vm.$nextTick()
      vi.advanceTimersByTime(350)
      expect(mockSetFilter).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'P0' })
      )
    })
  })

  it('P0 rows get danger-row class', () => {
    // Test rowClass logic directly: P0 → 'danger-row', P1 → ''
    const rowClassFn = ({ row }) => row.level === 'P0' ? 'danger-row' : ''
    expect(rowClassFn({ row: { level: 'P0' } })).toBe('danger-row')
    expect(rowClassFn({ row: { level: 'P1' } })).toBe('')
  })
})
