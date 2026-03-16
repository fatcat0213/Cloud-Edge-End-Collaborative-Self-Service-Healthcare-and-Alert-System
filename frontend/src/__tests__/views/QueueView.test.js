import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../../api', () => ({
  getQueue: vi.fn().mockResolvedValue({ data: { depth: 60, avgWaitMs: 45000, deptName: '神经内科' } })
}))

import QueueView from '../../views/QueueView.vue'
import { getQueue } from '../../api'

function mountView() {
  return mount(QueueView, {
    global: {
      plugins: [createPinia()],
      stubs: {
        'el-row': { template: '<div><slot /></div>' },
        'el-col': { template: '<div><slot /></div>', props: ['span'] },
        'el-form': { template: '<form><slot /></form>' },
        'el-form-item': { template: '<div><slot /></div>', props: ['label'] },
        'el-select': { template: '<select><slot /></select>', props: ['modelValue', 'placeholder'] },
        'el-option': { template: '<option></option>', props: ['label', 'value'] },
        'el-button': {
          template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
          props: ['type', 'loading'],
          emits: ['click']
        },
        'el-empty': { template: '<div class="el-empty"></div>', props: ['description'] },
        'el-tag': { template: '<span class="el-tag"><slot /></span>', props: ['type', 'size'] },
        'el-progress': { template: '<div class="el-progress"></div>', props: ['percentage', 'status', 'strokeWidth'] }
      }
    }
  })
}

describe('QueueView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders empty state before query', () => {
    const wrapper = mountView()
    expect(wrapper.find('.el-empty').exists()).toBe(true)
  })

  it('query calls getQueue API', async () => {
    const wrapper = mountView()
    wrapper.vm.selectedDept = 'NEU'
    await wrapper.vm.query()
    expect(getQueue).toHaveBeenCalledWith('NEU')
  })

  it('depth > 50 → stat-number has danger color', async () => {
    const wrapper = mountView()
    wrapper.vm.selectedDept = 'NEU'
    await wrapper.vm.query()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.result.depth).toBe(60)
    const statNumber = wrapper.find('.stat-number')
    expect(statNumber.attributes('style')).toContain('var(--color-danger)')
  })

  it('avgWaitMs > 30000 → wait time stat has warning color', async () => {
    const wrapper = mountView()
    wrapper.vm.selectedDept = 'NEU'
    await wrapper.vm.query()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.result.avgWaitMs).toBe(45000)
    const statNumbers = wrapper.findAll('.stat-number')
    // Second stat-number is wait time (index 1)
    expect(statNumbers[1].attributes('style')).toContain('var(--color-warning)')
  })
})
