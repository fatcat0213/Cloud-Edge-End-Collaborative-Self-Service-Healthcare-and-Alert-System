import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../../api', () => ({
  pay: vi.fn()
}))

import { pay } from '../../api'
import PaymentView from '../../views/PaymentView.vue'

function mountView() {
  return mount(PaymentView, {
    global: {
      plugins: [createPinia()],
      stubs: {
        'el-row': { template: '<div><slot /></div>' },
        'el-col': { template: '<div><slot /></div>', props: ['span'] },
        'el-form': { template: '<form><slot /></form>' },
        'el-form-item': { template: '<div><slot /></div>', props: ['label'] },
        'el-input': {
          template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          props: ['modelValue', 'placeholder', 'type'],
          emits: ['update:modelValue']
        },
        'el-button': {
          template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
          props: ['type', 'loading'],
          emits: ['click']
        },
        'el-tag': {
          template: '<span class="el-tag" :data-type="type"><slot /></span>',
          props: ['type', 'size']
        },
        'el-empty': { template: '<div class="el-empty"></div>', props: ['description'] }
      }
    }
  })
}

describe('PaymentView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders empty state before submission', () => {
    const wrapper = mountView()
    expect(wrapper.find('.el-empty').exists()).toBe(true)
  })

  it('generatePayId sets payId with PAY- prefix', () => {
    const wrapper = mountView()
    wrapper.vm.generatePayId()
    expect(wrapper.vm.form.payId).toMatch(/^PAY-/)
  })

  it('cacheHit=true shows cache tag', async () => {
    pay.mockResolvedValue({
      data: { success: true, cacheHit: true, fallbackToSelfPay: false, reason: '' }
    })
    const wrapper = mountView()
    wrapper.vm.form.patientId = 'P001'
    wrapper.vm.form.regId = 'REG-001'
    wrapper.vm.form.amount = '100'
    wrapper.vm.form.payId = 'PAY-001'
    await wrapper.vm.submit()
    await wrapper.vm.$nextTick()
    const tags = wrapper.findAll('.el-tag')
    const cacheTag = tags.find(t => t.text().includes('命中缓存'))
    expect(cacheTag).toBeTruthy()
  })

  it('fallbackToSelfPay=true shows fallback tag', async () => {
    pay.mockResolvedValue({
      data: { success: false, cacheHit: false, fallbackToSelfPay: true, reason: '医保不可用' }
    })
    const wrapper = mountView()
    wrapper.vm.form.patientId = 'P001'
    wrapper.vm.form.regId = 'REG-001'
    wrapper.vm.form.amount = '100'
    wrapper.vm.form.payId = 'PAY-002'
    await wrapper.vm.submit()
    await wrapper.vm.$nextTick()
    const tags = wrapper.findAll('.el-tag')
    const fallbackTag = tags.find(t => t.text().includes('回退自费'))
    expect(fallbackTag).toBeTruthy()
  })

  it('pay API is called with form data on submit', async () => {
    pay.mockResolvedValue({
      data: { success: true, cacheHit: false, fallbackToSelfPay: false }
    })
    const wrapper = mountView()
    wrapper.vm.form.patientId = 'P002'
    wrapper.vm.form.regId = 'REG-002'
    wrapper.vm.form.amount = '200'
    wrapper.vm.form.payId = 'PAY-003'
    await wrapper.vm.submit()
    expect(pay).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'P002', regId: 'REG-002' })
    )
  })
})
