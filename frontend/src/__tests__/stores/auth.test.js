import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../stores/auth'

vi.mock('../../api', () => ({
  login: vi.fn()
}))

import { login as apiLogin } from '../../api'

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('login with demo credentials sets isLoggedIn to true', async () => {
    apiLogin.mockRejectedValue({ response: { status: 404 } })
    const store = useAuthStore()
    await store.login('admin', 'admin123')
    expect(store.isLoggedIn).toBe(true)
    expect(store.token).toMatch(/^demo-token-/)
    expect(store.user).toEqual({ name: '管理员', role: 'admin' })
    expect(localStorage.getItem('auth_token')).toMatch(/^demo-token-/)
  })

  it('logout resets isLoggedIn to false and clears localStorage', async () => {
    apiLogin.mockRejectedValue({ response: { status: 404 } })
    const store = useAuthStore()
    await store.login('admin', 'admin123')
    store.logout()
    expect(store.isLoggedIn).toBe(false)
    expect(store.token).toBe('')
    expect(store.user).toBeNull()
    expect(localStorage.getItem('auth_token')).toBeNull()
  })

  it('wrong credentials throw error', async () => {
    apiLogin.mockRejectedValue({ response: { status: 404 } })
    const store = useAuthStore()
    await expect(store.login('wronguser', 'wrongpass')).rejects.toThrow('用户名或密码错误')
    expect(store.isLoggedIn).toBe(false)
  })

  it('successful API login stores token from response', async () => {
    apiLogin.mockResolvedValue({
      data: { token: 'real-jwt-token', user: { name: '张三', role: 'admin' } }
    })
    const store = useAuthStore()
    await store.login('admin', 'secret')
    expect(store.isLoggedIn).toBe(true)
    expect(store.token).toBe('real-jwt-token')
    expect(store.user.name).toBe('张三')
  })
})
