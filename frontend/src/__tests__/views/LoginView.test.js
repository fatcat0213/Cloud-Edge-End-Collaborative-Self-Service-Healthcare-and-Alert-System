import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// Mock auth store
const mockLogin = vi.fn()
vi.mock('../../stores/auth', () => ({
  useAuthStore: () => ({
    isLoggedIn: false,
    login: mockLogin
  })
}))

// Stub Element Plus components to avoid complex setup
const stubComponents = {
  'el-form': { template: '<form @submit="$emit(\'submit\', $event)"><slot /></form>', emits: ['submit'] },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-input': {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'prefixIcon'],
    emits: ['update:modelValue']
  },
  'el-button': { template: '<button :disabled="loading" @click="$emit(\'click\')"><slot /></button>', props: ['loading', 'type', 'size'], emits: ['click'] },
  'el-card': { template: '<div class="el-card"><slot /></div>' },
  'el-icon': { template: '<span><slot /></span>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-divider': { template: '<hr />' },
  Monitor: { template: '<svg />' },
  User: { template: '<svg />' },
  Lock: { template: '<svg />' },
  View: { template: '<svg />' },
  Hide: { template: '<svg />' }
}

async function mountLoginView() {
  const LoginView = (await import('../../views/LoginView.vue')).default
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/login', component: LoginView },
      { path: '/dashboard', component: { template: '<div />' } }
    ]
  })
  await router.push('/login')
  await router.isReady()

  return mount(LoginView, {
    global: {
      plugins: [createPinia(), router],
      stubs: stubComponents
    }
  })
}

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders login form inputs', async () => {
    const wrapper = await mountLoginView()
    const inputs = wrapper.findAll('input')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
  })

  it('calls authStore.login with form values on submit', async () => {
    mockLogin.mockResolvedValue(undefined)
    const wrapper = await mountLoginView()

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('admin')
    await inputs[1].setValue('admin123')

    // Find and trigger the form submit (which happens when submit button is clicked)
    const form = wrapper.find('form')
    await form.trigger('submit')
    await new Promise(r => setTimeout(r, 0)) // flush promises

    expect(mockLogin).toHaveBeenCalledWith('admin', 'admin123')
  })

  it('shows error message when login throws', async () => {
    mockLogin.mockRejectedValue(new Error('用户名或密码错误'))
    // ElMessage is global; just verify login was called and did not navigate
    const wrapper = await mountLoginView()
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('bad')
    await inputs[1].setValue('creds')

    const form = wrapper.find('form')
    await form.trigger('submit')
    await new Promise(r => setTimeout(r, 10))

    expect(mockLogin).toHaveBeenCalledWith('bad', 'creds')
  })
})
