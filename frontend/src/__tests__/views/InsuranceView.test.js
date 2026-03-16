import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../../api', () => ({
  verifyInsurance: vi.fn().mockResolvedValue({
    data: { eligible: true, coverageRatio: 0.8, insuranceType: '职工医保', message: '' }
  })
}))

vi.mock('@element-plus/icons-vue', () => ({
  User: { template: '<span>user</span>' },
  CircleCheck: { template: '<span class="icon-check">check</span>' },
  CircleClose: { template: '<span class="icon-close">close</span>' }
}))

import InsuranceView from '../../views/InsuranceView.vue'
import { verifyInsurance } from '../../api'

function mountView() {
  return mount(InsuranceView, {
    global: {
      plugins: [createPinia()],
      stubs: {
        'el-row': { template: '<div><slot /></div>' },
        'el-col': { template: '<div><slot /></div>', props: ['span'] },
        'el-form': { template: '<form><slot /></form>' },
        'el-form-item': { template: '<div><slot /></div>', props: ['label'] },
        'el-input': { template: '<input />', props: ['modelValue', 'prefixIcon', 'placeholder'] },
        'el-button': {
          template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
          props: ['type', 'loading'],
          emits: ['click']
        },
        'el-empty': { template: '<div class="el-empty"></div>', props: ['description'] },
        'el-tag': { template: '<span class="el-tag"><slot /></span>', props: ['type', 'size'] },
        'el-progress': { template: '<div class="el-progress"></div>', props: ['percentage', 'format', 'status', 'strokeWidth'] },
        'el-icon': {
          template: '<i class="el-icon" :style="`color:${color}`"><slot /></i>',
          props: ['size', 'color']
        }
      }
    }
  })
}

describe('InsuranceView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders empty state before verify', () => {
    const wrapper = mountView()
    expect(wrapper.find('.el-empty').exists()).toBe(true)
  })

  it('verify calls verifyInsurance API', async () => {
    const wrapper = mountView()
    wrapper.vm.patientId = 'P001'
    await wrapper.vm.verify()
    expect(verifyInsurance).toHaveBeenCalledWith({ patientId: 'P001' })
  })

  it('eligible=true renders CircleCheck icon', async () => {
    const wrapper = mountView()
    wrapper.vm.patientId = 'P001'
    await wrapper.vm.verify()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.icon-check').exists()).toBe(true)
    expect(wrapper.find('.icon-close').exists()).toBe(false)
  })

  it('eligible=true → icon color is var(--color-success)', async () => {
    const wrapper = mountView()
    wrapper.vm.patientId = 'P001'
    await wrapper.vm.verify()
    await wrapper.vm.$nextTick()
    const icon = wrapper.find('.el-icon')
    expect(icon.attributes('style')).toContain('var(--color-success)')
  })
})
