import { describe, it, expect, beforeEach, vi } from 'vitest'

// We test the interceptor logic by inspecting the axios instance config
// We mock axios.create to capture interceptors
vi.mock('axios', () => {
  const interceptorStore = { request: [], response: [] }
  const mockInstance = {
    interceptors: {
      request: {
        use: vi.fn((onFulfilled, onRejected) => {
          interceptorStore.request.push({ onFulfilled, onRejected })
        })
      },
      response: {
        use: vi.fn((onFulfilled, onRejected) => {
          interceptorStore.response.push({ onFulfilled, onRejected })
        })
      }
    },
    get: vi.fn(),
    post: vi.fn(),
    _interceptors: interceptorStore
  }
  return {
    default: {
      create: vi.fn(() => mockInstance)
    }
  }
})

describe('API interceptors', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('request interceptor attaches Authorization header when token in localStorage', async () => {
    localStorage.setItem('auth_token', 'test-token-abc')

    // Re-import to trigger interceptor registration
    const { default: axios } = await import('axios')
    await import('../api/index.js')

    const instance = axios.create.mock.results[0].value
    const requestInterceptor = instance.interceptors.request.use.mock.calls[0][0]

    const config = { headers: {} }
    const result = requestInterceptor(config)

    expect(result.headers['Authorization']).toBe('Bearer test-token-abc')
  })

  it('request interceptor does NOT attach Authorization header when no token', async () => {
    // No token in localStorage
    const { default: axios } = await import('axios')
    await import('../api/index.js')

    const instance = axios.create.mock.results[0].value
    const requestInterceptor = instance.interceptors.request.use.mock.calls[0][0]

    const config = { headers: {} }
    const result = requestInterceptor(config)

    expect(result.headers['Authorization']).toBeUndefined()
  })
})
