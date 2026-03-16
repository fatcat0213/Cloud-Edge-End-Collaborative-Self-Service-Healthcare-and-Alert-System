import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

const mockStartPolling = vi.fn()
const mockStopPolling = vi.fn()
const mockStatsStartPolling = vi.fn()
const mockStatsStopPolling = vi.fn()
const mockApplyAlerts = vi.fn()

vi.mock('../../stores/alerts', () => ({
  useAlertsStore: () => ({
    alerts: [],
    p0Count: 0,
    p1Count: 0,
    startPolling: mockStartPolling,
    stopPolling: mockStopPolling
  })
}))

vi.mock('../../stores/terminals', () => ({
  useTerminalsStore: () => ({
    applyAlerts: mockApplyAlerts
  })
}))

vi.mock('../../stores/stats', () => ({
  useStatsStore: () => ({
    startPolling: mockStatsStartPolling,
    stopPolling: mockStatsStopPolling
  })
}))

vi.mock('../../stores/auth', () => ({
  useAuthStore: () => ({
    user: { name: '管理员' },
    logout: vi.fn()
  })
}))

async function mountMainLayout() {
  const MainLayout = (await import('../../components/MainLayout.vue')).default
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: MainLayout,
        children: [
          { path: 'dashboard', component: { template: '<div />' } }
        ]
      },
      { path: '/login', component: { template: '<div />' } }
    ]
  })
  await router.push('/dashboard')
  await router.isReady()

  return mount(MainLayout, {
    global: {
      plugins: [createPinia(), router],
      stubs: {
        'router-view': { template: '<div class="router-view-stub" />' },
        'el-container': { template: '<div><slot /></div>' },
        'el-header': { template: '<header><slot /></header>', props: ['height'] },
        'el-main': { template: '<main><slot /></main>' },
        'el-menu': { template: '<nav><slot /></nav>', props: ['mode', 'defaultActive'], emits: ['select'] },
        'el-menu-item': { template: '<div @click="$emit(\'click\')"><slot /></div>', props: ['index', 'disabled'], emits: ['click'] },
        'el-badge': { template: '<span><slot /></span>', props: ['value', 'type', 'hidden'] },
        'el-tag': { template: '<span><slot /></span>', props: ['type', 'effect', 'size'] },
        'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>', props: ['type', 'size'], emits: ['click'] },
        'el-icon': { template: '<span><slot /></span>' },
        Monitor: { template: '<svg />' }
      }
    }
  })
}

describe('MainLayout', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('mounts without crashing', async () => {
    const wrapper = await mountMainLayout()
    expect(wrapper.exists()).toBe(true)
  })

  it('calls alertsStore.startPolling on mount', async () => {
    await mountMainLayout()
    expect(mockStartPolling).toHaveBeenCalledTimes(1)
    expect(mockStartPolling).toHaveBeenCalledWith(5000)
  })

  it('calls statsStore.startPolling on mount', async () => {
    await mountMainLayout()
    expect(mockStatsStartPolling).toHaveBeenCalledTimes(1)
    expect(mockStatsStartPolling).toHaveBeenCalledWith(10000)
  })

  it('calls alertsStore.stopPolling on unmount', async () => {
    const wrapper = await mountMainLayout()
    wrapper.unmount()
    expect(mockStopPolling).toHaveBeenCalledTimes(1)
  })

  it('calls statsStore.stopPolling on unmount', async () => {
    const wrapper = await mountMainLayout()
    wrapper.unmount()
    expect(mockStatsStopPolling).toHaveBeenCalledTimes(1)
  })

  it('renders router-view', async () => {
    const wrapper = await mountMainLayout()
    expect(wrapper.find('.router-view-stub').exists()).toBe(true)
  })
})
