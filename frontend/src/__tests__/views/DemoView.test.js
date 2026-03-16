import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'

const mockInject = vi.fn()
const mockStart = vi.fn()
const mockStop = vi.fn()
const mockStartPolling = vi.fn()
const mockStopPolling = vi.fn()

vi.mock('../../stores/simulator', () => ({
  useSimulatorStore: () => ({
    running: false,
    runningCount: 0,
    totalSent: 0,
    totalAlerts: 0,
    eventLog: [
      { time: '12:00:00', layer: '端层', message: 'T001 发布心跳' },
      { time: '12:00:01', layer: '边层', message: 'Drools 触发规则' }
    ],
    apiReady: false,
    start: mockStart,
    stop: mockStop,
    inject: mockInject,
    addEventFromAlert: vi.fn(),
    startPolling: mockStartPolling,
    stopPolling: mockStopPolling
  })
}))

vi.mock('../../stores/alerts', () => ({
  useAlertsStore: () => ({
    alerts: []
  })
}))

vi.mock('../../components/FlowDiagram.vue', () => ({
  default: defineComponent({ name: 'FlowDiagram', template: '<div class="flow-diagram-stub"></div>' })
}))

import DemoView from '../../views/DemoView.vue'

function mountView() {
  return mount(DemoView, {
    global: {
      plugins: [createPinia()],
      stubs: {
        'el-tag': { template: '<span class="el-tag"><slot /></span>', props: ['type', 'size'] },
        'el-tooltip': { template: '<div><slot /></div>', props: ['content', 'disabled'] },
        'el-button': {
          template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          props: ['disabled', 'type', 'size'],
          emits: ['click']
        },
        'el-button-group': { template: '<div class="el-button-group"><slot /></div>' },
        'el-select': { template: '<select><slot /></select>', props: ['modelValue', 'placeholder'] },
        'el-option': { template: '<option></option>', props: ['label', 'value'] }
      }
    }
  })
}

describe('DemoView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('mounts without crashing', () => {
    const wrapper = mountView()
    expect(wrapper.exists()).toBe(true)
  })

  it('start button is disabled when apiReady=false', () => {
    const wrapper = mountView()
    const buttons = wrapper.findAll('.el-button')
    // First button is "启动全部"
    const startBtn = buttons.find(b => b.text().includes('启动全部'))
    expect(startBtn.attributes('disabled')).toBeDefined()
  })

  it('inject button calls simStore.inject with correct scene', async () => {
    // Call inject directly on vm
    const wrapper = mountView()
    wrapper.vm.inject('printer_jam')
    expect(mockInject).toHaveBeenCalledWith('printer_jam', 'T001')
  })

  it('calls simStore.startPolling on mount', () => {
    mountView()
    expect(mockStartPolling).toHaveBeenCalledTimes(1)
  })

  it('event log rows are rendered', () => {
    const wrapper = mountView()
    const rows = wrapper.findAll('.event-row')
    expect(rows.length).toBe(2)
  })
})
