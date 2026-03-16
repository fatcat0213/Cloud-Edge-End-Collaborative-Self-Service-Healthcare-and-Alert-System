import { describe, it, expect, beforeEach } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'

// We test the guard logic directly without importing the real router
// (which would try to import all view components)

function createTestRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: { template: '<div />' }, meta: { public: true } },
      {
        path: '/',
        component: { template: '<router-view />' },
        children: [
          { path: 'dashboard', component: { template: '<div />' } },
          { path: 'terminals', component: { template: '<div />' } }
        ]
      }
    ]
  })

  // Apply the same guard logic as the real router
  router.beforeEach((to) => {
    const token = localStorage.getItem('auth_token')
    if (!to.meta.public && !token) return '/login'
    if (to.path === '/login' && token) return '/dashboard'
  })

  return router
}

describe('Router auth guard', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('no token + non-public route redirects to /login', async () => {
    const router = createTestRouter()
    await router.push('/dashboard')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('has token + /login redirects to /dashboard', async () => {
    localStorage.setItem('auth_token', 'some-token')
    const router = createTestRouter()
    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/dashboard')
  })

  it('has token + /dashboard allows through', async () => {
    localStorage.setItem('auth_token', 'some-token')
    const router = createTestRouter()
    await router.push('/dashboard')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/dashboard')
  })

  it('/login is accessible without token (meta.public)', async () => {
    const router = createTestRouter()
    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/login')
  })
})
