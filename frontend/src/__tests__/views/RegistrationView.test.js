import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../../api', () => ({
  register: vi.fn().mockResolvedValue({ data: { regId: 'REG-001' } })
}))

vi.mock('@element-plus/icons-vue', () => ({
  FirstAidKit: { template: '<span>aid</span>' },
  Coordinate: { template: '<span>coord</span>' },
  Help: { template: '<span>help</span>' },
  Warning: { template: '<span>warning</span>' },
  Plus: { template: '<span>plus</span>' }
}))

import RegistrationView from '../../views/RegistrationView.vue'
import { register } from '../../api'

function mountView() {
  return mount(RegistrationView, {
    global: {
      plugins: [createPinia()],
      stubs: {
        'el-row': { template: '<div class="el-row"><slot /></div>' },
        'el-col': { template: '<div class="el-col"><slot /></div>', props: ['span'] },
        'el-form': { template: '<form><slot /></form>', props: ['model', 'labelPosition'] },
        'el-form-item': { template: '<div class="el-form-item"><slot /></div>', props: ['label'] },
        'el-input': { template: '<input class="el-input" />', props: ['modelValue', 'placeholder'] },
        'el-button': {
          template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
          props: ['type', 'loading'],
          emits: ['click']
        },
        'el-tag': { template: '<span class="el-tag"><slot /></span>', props: ['type', 'size'] },
        'el-empty': { template: '<div class="el-empty"><slot /></div>', props: ['description'] },
        'el-icon': { template: '<i><slot /></i>', props: ['size'] }
      }
    }
  })
}

describe('RegistrationView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('dept card click updates deptCode', async () => {
    const wrapper = mountView()
    const deptCards = wrapper.findAll('.dept-card')
    expect(deptCards.length).toBe(5)
    await deptCards[0].trigger('click')
    expect(wrapper.vm.deptCode).toBe('NEU')
  })

  it('selected dept card has active class', async () => {
    const wrapper = mountView()
    const deptCards = wrapper.findAll('.dept-card')
    await deptCards[1].trigger('click')
    expect(deptCards[1].classes()).toContain('active')
  })

  it('submit calls register API when form is valid', async () => {
    const wrapper = mountView()
    wrapper.vm.patientId = 'P001'
    wrapper.vm.deptCode = 'NEU'
    wrapper.vm.doctorId = 'D001'
    await wrapper.vm.submit()
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'P001', deptCode: 'NEU' })
    )
  })

  it('result appears in list after successful submit', async () => {
    const wrapper = mountView()
    wrapper.vm.patientId = 'P001'
    wrapper.vm.deptCode = 'NEU'
    wrapper.vm.doctorId = 'D001'
    await wrapper.vm.submit()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.results.length).toBe(1)
    expect(wrapper.vm.results[0].regId).toBe('REG-001')
  })
})
