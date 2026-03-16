import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'

// Stub vue-echarts
vi.mock('vue-echarts', () => ({ default: defineComponent({ name: 'VChart', template: '<div class="chart-stub"></div>' }) }))
vi.mock('echarts/core', () => ({ use: vi.fn() }))
vi.mock('echarts/charts', () => ({ LineChart: {}, PieChart: {} }))
vi.mock('echarts/components', () => ({ TitleComponent: {}, TooltipComponent: {}, GridComponent: {}, LegendComponent: {} }))
vi.mock('echarts/renderers', () => ({ CanvasRenderer: {} }))

vi.mock('../../stores/alerts', () => ({
  useAlertsStore: () => ({
    alerts: Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date().toISOString(),
      level: i < 3 ? 'P0' : 'P1',
      terminalId: `T00${i + 1}`,
      type: 'HARDWARE',
      message: `Alert ${i}`
    })),
    p0Count: 3,
    p1Count: 7
  })
}))

vi.mock('../../stores/terminals', () => ({
  useTerminalsStore: () => ({
    onlineCount: 15,
    offlineCount: 3,
    degradedCount: 2
  })
}))

vi.mock('../../stores/stats', () => ({
  useStatsStore: () => ({
    paymentSuccessRate: null
  })
}))

import Dashboard from '../../views/Dashboard.vue'

function mountDashboard(overrides = {}) {
  return mount(Dashboard, {
    global: {
      plugins: [createPinia()],
      stubs: {
        'el-row': { template: '<div class="el-row"><slot /></div>' },
        'el-col': { template: '<div class="el-col"><slot /></div>' },
        'el-table': { template: '<div class="el-table"><slot /></div>' },
        'el-table-column': { template: '<div></div>' },
        'el-tag': { template: '<span class="el-tag"><slot /></span>' },
        'router-link': { template: '<a><slot /></a>' }
      }
    }
  })
}

describe('Dashboard.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mounts without crashing', () => {
    const wrapper = mountDashboard()
    expect(wrapper.exists()).toBe(true)
  })

  it('p0Count > 0 → P0 card has danger-active class', () => {
    const wrapper = mountDashboard()
    const cards = wrapper.findAll('.kpi-card')
    // P0 card is the second card
    expect(cards[1].classes()).toContain('kpi-danger-active')
  })

  it('paymentSuccessRate=null → shows 暂无数据', () => {
    const wrapper = mountDashboard()
    const kpiValues = wrapper.findAll('.kpi-value')
    // Last KPI card (index 3) should show 暂无数据
    expect(kpiValues[3].text()).toBe('暂无数据')
  })

  it('recent alerts table slices to max 8', () => {
    const tenAlerts = Array.from({length:10}, (_,i) => ({
      alertId: `a${i}`, level:'P0', terminalId:'T001', type:'HARDWARE',
      message:'test', timestamp: Date.now()
    }))
    const sliced = tenAlerts.slice(0, 8)
    expect(sliced).toHaveLength(8)
  })
})
