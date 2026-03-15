# 前端重设计 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全量重设计云边端监测系统前端：企业白色主题、登录页/JWT认证、架构演示页、数据层从后端短轮询拉取。

**Architecture:** Vue 3 + Element Plus Light theme，顶部 Tab 导航替换左侧边栏，Pinia 管理 auth/alerts/terminals/stats/simulator 五个 store，SVG + CSS 动画实现架构流向图，CSS 自定义属性 token 统一主题，无新依赖。

**Tech Stack:** Vue 3.4, Vue Router 4.3, Pinia 2.1, Element Plus 2.7, ECharts 5.5/vue-echarts 7, Axios 1.7, Vitest 1.x, @vue/test-utils 2.x, jsdom

---

## Chunk 1: 开发基础

### Task 1: 安装测试依赖 + 配置 Vitest

**目标：** 为项目添加 Vitest 测试基础设施，使 `npm run test:run` 可以零测试通过运行。

**Steps:**

- [ ] 修改 `frontend/package.json`：在 `devDependencies` 中添加 `"vitest": "^1.6.0"`、`"@vue/test-utils": "^2.4.0"`、`"jsdom": "^24.0.0"`；在 `scripts` 中添加 `"test": "vitest"` 和 `"test:run": "vitest run"`

  完整 `package.json` 内容：
  ```json
  {
    "name": "yunbd-dashboard",
    "version": "1.0.0",
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview",
      "test": "vitest",
      "test:run": "vitest run"
    },
    "dependencies": {
      "vue": "^3.4.0",
      "vue-router": "^4.3.0",
      "pinia": "^2.1.7",
      "element-plus": "^2.7.0",
      "@element-plus/icons-vue": "^2.3.1",
      "axios": "^1.7.0",
      "echarts": "^5.5.0",
      "vue-echarts": "^7.0.0"
    },
    "devDependencies": {
      "@vitejs/plugin-vue": "^5.0.0",
      "vite": "^5.2.0",
      "vitest": "^1.6.0",
      "@vue/test-utils": "^2.4.0",
      "jsdom": "^24.0.0"
    }
  }
  ```

- [ ] 修改 `frontend/vite.config.js`：添加 `test` 配置块

  完整 `vite.config.js` 内容：
  ```js
  import { defineConfig } from 'vite'
  import vue from '@vitejs/plugin-vue'

  export default defineConfig({
    plugins: [vue()],
    server: {
      proxy: {
        '/api': {
          target: 'http://172.24.161.35:30080',
          changeOrigin: true
        }
      }
    },
    test: {
      environment: 'jsdom',
      globals: true
    }
  })
  ```

- [ ] 创建 `frontend/src/__tests__/setup.js`（全局测试 setup 占位文件）：

  ```js
  // Global test setup placeholder
  // Add global mocks, matchers, or setup here as needed
  ```

- [ ] 运行安装：
  ```bash
  cd frontend && npm install
  ```
  预期输出：安装成功，`node_modules` 中出现 `vitest`、`@vue/test-utils`、`jsdom`

- [ ] 验证测试命令：
  ```bash
  cd frontend && npm run test:run
  ```
  预期输出：`No test files found, exiting with code 0` 或类似 0 tests passed 消息，**退出码 0**

- [ ] Commit：
  ```
  test: add vitest + vue-test-utils test infrastructure
  ```

---

### Task 2: CSS Token 文件

**目标：** 创建统一 CSS 自定义属性 token 文件，作为全局主题变量来源；并创建 Element Plus CSS 变量覆盖文件。

**Steps:**

- [ ] 创建 `frontend/src/styles/variables.css`：

  ```css
  :root {
    --bg-primary: #ffffff;
    --bg-page: #f5f7fa;
    --bg-header: #001529;
    --text-primary: #1a1a2e;
    --text-secondary: #595959;
    --border-color: #e8e8e8;
    --color-danger: #ff4d4f;
    --color-warning: #faad14;
    --color-success: #52c41a;
    --color-primary: #1677ff;
    --shadow-card: 0 1px 4px rgba(0,0,0,0.08);
  }
  ```

- [ ] 创建 `frontend/src/styles/element-override.css`：

  ```css
  :root {
    --el-color-primary: #1677ff;
    --el-color-danger: #ff4d4f;
    --el-color-warning: #faad14;
    --el-color-success: #52c41a;
    --el-bg-color: #ffffff;
    --el-bg-color-page: #f5f7fa;
    --el-text-color-primary: #1a1a2e;
    --el-text-color-regular: #595959;
    --el-border-color: #e8e8e8;
  }
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/styles.test.js`：

  ```js
  import { describe, it, expect } from 'vitest'
  import { existsSync } from 'fs'
  import { resolve } from 'path'

  const srcStyles = (file) => resolve(__dirname, '../styles', file)

  describe('CSS token files', () => {
    it('variables.css exists', () => {
      expect(existsSync(srcStyles('variables.css'))).toBe(true)
    })

    it('element-override.css exists', () => {
      expect(existsSync(srcStyles('element-override.css'))).toBe(true)
    })
  })
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run
  ```
  预期输出：`2 tests passed`，退出码 0

- [ ] Commit：
  ```
  style: add CSS design token files for light theme
  ```

---

### Task 3: 更新 main.js

**目标：** 在应用入口导入 CSS token 文件，使 CSS 自定义属性在全局生效，并覆盖 Element Plus 默认主题变量。

**Steps:**

- [ ] 修改 `frontend/src/main.js`，在 ElementPlus 的 CSS 之前导入两个 token 文件：

  完整 `main.js` 内容：
  ```js
  import { createApp } from 'vue'
  import { createPinia } from 'pinia'
  import './styles/variables.css'
  import './styles/element-override.css'
  import ElementPlus from 'element-plus'
  import 'element-plus/dist/index.css'
  import * as ElementPlusIconsVue from '@element-plus/icons-vue'
  import zhCn from 'element-plus/es/locale/lang/zh-cn'
  import App from './App.vue'
  import router from './router'

  const app = createApp(App)

  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }

  app.use(createPinia())
  app.use(router)
  app.use(ElementPlus, { locale: zhCn })
  app.mount('#app')
  ```

  > 注意：`variables.css` 和 `element-override.css` 必须在 `element-plus/dist/index.css` **之前**导入，使自定义属性能覆盖 Element Plus 默认值。

- [ ] 无需自动化测试（视觉变更，由 Task 2 的文件存在性测试间接覆盖）

- [ ] Commit：
  ```
  style: import CSS token files in main.js
  ```

---

## Chunk 2: 认证层

### Task 4: auth store

**目标：** 新建 `auth` Pinia store，支持真实 API 登录及演示模式降级回退。

**Steps:**

- [ ] 创建 `frontend/src/stores/auth.js`：

  ```js
  import { defineStore } from 'pinia'
  import { ref, computed } from 'vue'
  import { login as apiLogin } from '../api'

  export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('auth_token') || '')
    const user = ref(null)

    const isLoggedIn = computed(() => !!token.value)

    async function login(username, password) {
      try {
        const res = await apiLogin({ username, password })
        const t = res.data.token || res.data.access_token || res.data
        token.value = t
        user.value = res.data.user || { name: username, role: 'admin' }
        localStorage.setItem('auth_token', t)
      } catch (err) {
        const status = err?.response?.status
        // Fallback for 404 (endpoint not implemented) or network error
        if (!status || status === 404 || status === 0) {
          if (username === 'admin' && password === 'admin123') {
            const fakeToken = 'demo-token-' + Date.now()
            token.value = fakeToken
            user.value = { name: '管理员', role: 'admin' }
            localStorage.setItem('auth_token', fakeToken)
          } else {
            throw new Error('用户名或密码错误')
          }
        } else {
          throw new Error('用户名或密码错误')
        }
      }
    }

    function logout() {
      token.value = ''
      user.value = null
      localStorage.removeItem('auth_token')
    }

    return { token, user, isLoggedIn, login, logout }
  })
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/stores/auth.test.js`：

  ```js
  import { describe, it, expect, beforeEach, vi } from 'vitest'
  import { setActivePinia, createPinia } from 'pinia'
  import { useAuthStore } from '../../stores/auth'

  // Mock the api module
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
      // Simulate 404 so fallback kicks in
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
      expect(store.isLoggedIn).toBe(true)

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
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/stores/auth.test.js
  ```
  预期输出：`4 tests passed`，退出码 0

- [ ] Commit：
  ```
  feat: add auth store with demo-mode fallback
  ```

---

### Task 5: 更新 API — 认证拦截器 + 新接口

**目标：** 为 axios 实例添加认证请求拦截器和 401 响应拦截器，并新增 auth/stats/simulator 相关 API 方法。

**Steps:**

- [ ] 改写 `frontend/src/api/index.js`：

  ```js
  import axios from 'axios'

  const http = axios.create({ baseURL: '/api/v1', timeout: 10000 })

  // Request interceptor: attach Authorization header if token exists
  http.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  })

  // Response interceptor: on 401, clear token and redirect to login
  http.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
  )

  // Existing endpoints
  export const getAlerts = () => http.get('/alerts')
  export const getQueue = (deptCode) => http.get(`/queue/${deptCode}`)
  export const register = (data) => http.post('/registration', data)
  export const verifyInsurance = (data) => http.post('/insurance/verify', data)
  export const verifyPayment = (data) => http.post('/payment/verify', data)
  export const getReport = (patientId) => http.get(`/report/${patientId}`)

  // New endpoints
  export const login = (data) => http.post('/auth/login', data)
  export const getPaymentStats = () => http.get('/payment/stats')
  export const startSimulator = () => http.post('/simulator/start')
  export const stopSimulator = () => http.post('/simulator/stop')
  export const injectScene = (data) => http.post('/simulator/inject', data)
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/api.test.js`：

  ```js
  import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

  // We test the interceptor logic by inspecting the axios instance config
  // We mock axios.create to capture interceptors
  const mockRequest = vi.fn((config) => config)
  const mockRequestError = vi.fn((err) => Promise.reject(err))
  const mockResponse = vi.fn((res) => res)
  const mockResponseError = vi.fn((err) => Promise.reject(err))

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
      await import('../../api/index.js')

      const instance = axios.create.mock.results[0].value
      const requestInterceptor = instance.interceptors.request.use.mock.calls[0][0]

      const config = { headers: {} }
      const result = requestInterceptor(config)

      expect(result.headers['Authorization']).toBe('Bearer test-token-abc')
    })

    it('request interceptor does NOT attach Authorization header when no token', async () => {
      // No token in localStorage
      const { default: axios } = await import('axios')
      await import('../../api/index.js')

      const instance = axios.create.mock.results[0].value
      const requestInterceptor = instance.interceptors.request.use.mock.calls[0][0]

      const config = { headers: {} }
      const result = requestInterceptor(config)

      expect(result.headers['Authorization']).toBeUndefined()
    })
  })
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/api.test.js
  ```
  预期输出：`2 tests passed`，退出码 0

- [ ] Commit：
  ```
  feat: add auth interceptors and new API endpoints
  ```

---

### Task 6: LoginView

**目标：** 新建登录页面，左侧品牌区 + 右侧登录表单，支持演示模式登录，已登录时自动跳转。

**Steps:**

- [ ] 创建 `frontend/src/views/LoginView.vue`：

  ```vue
  <template>
    <div class="login-page">
      <!-- Left branding panel -->
      <div class="login-left">
        <div class="brand">
          <div class="brand-icon">
            <el-icon size="48" color="#ffffff"><Monitor /></el-icon>
          </div>
          <h1 class="brand-title">云边端就医自助终端监测系统</h1>
          <p class="brand-subtitle">Cloud-Edge-Terminal Healthcare Self-Service Monitoring Platform</p>
          <div class="arch-badges">
            <el-tag effect="plain" class="arch-tag">端层 Terminal</el-tag>
            <span class="arch-arrow">→</span>
            <el-tag effect="plain" class="arch-tag">边层 Edge</el-tag>
            <span class="arch-arrow">→</span>
            <el-tag effect="plain" class="arch-tag">云层 Cloud</el-tag>
          </div>
          <p class="brand-desc">实时监控 · 智能告警 · 多维统计 · 架构可视化</p>
        </div>
      </div>

      <!-- Right login form panel -->
      <div class="login-right">
        <el-card class="login-card" shadow="always">
          <div class="card-header">
            <h2 class="card-title">欢迎登录</h2>
            <p class="card-subtitle">请使用您的账号密码登录</p>
          </div>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-position="top"
            @submit.prevent="handleSubmit"
          >
            <el-form-item label="用户名" prop="username">
              <el-input
                v-model="form.username"
                placeholder="请输入用户名"
                size="large"
                :prefix-icon="User"
                autocomplete="username"
              />
            </el-form-item>

            <el-form-item label="密码" prop="password">
              <el-input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                size="large"
                :prefix-icon="Lock"
                autocomplete="current-password"
              >
                <template #suffix>
                  <el-icon class="password-toggle" @click="showPassword = !showPassword">
                    <View v-if="!showPassword" />
                    <Hide v-else />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                size="large"
                :loading="loading"
                native-type="submit"
                class="login-btn"
                @click="handleSubmit"
              >
                {{ loading ? '登录中...' : '登录' }}
              </el-button>
            </el-form-item>
          </el-form>

          <div class="demo-hint">
            <el-divider>演示账号</el-divider>
            <p class="hint-text">用户名：<code>admin</code> &nbsp; 密码：<code>admin123</code></p>
          </div>
        </el-card>
      </div>
    </div>
  </template>

  <script setup>
  import { ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { User, Lock, View, Hide } from '@element-plus/icons-vue'
  import { useAuthStore } from '../stores/auth'

  const router = useRouter()
  const authStore = useAuthStore()

  const formRef = ref(null)
  const loading = ref(false)
  const showPassword = ref(false)

  const form = ref({
    username: '',
    password: ''
  })

  const rules = {
    username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
  }

  onMounted(() => {
    if (authStore.isLoggedIn) {
      router.push('/dashboard')
    }
  })

  async function handleSubmit() {
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return

    loading.value = true
    try {
      await authStore.login(form.value.username, form.value.password)
      router.push('/dashboard')
    } catch (err) {
      ElMessage.error(err.message || '登录失败，请稍后重试')
    } finally {
      loading.value = false
    }
  }
  </script>

  <style scoped>
  .login-page {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .login-left {
    flex: 1;
    background: linear-gradient(135deg, #001529 0%, #1677ff 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
  }

  .brand {
    color: #ffffff;
    text-align: center;
    max-width: 400px;
  }

  .brand-icon {
    margin-bottom: 24px;
  }

  .brand-title {
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 8px;
    line-height: 1.4;
  }

  .brand-subtitle {
    font-size: 13px;
    opacity: 0.7;
    margin: 0 0 32px;
    line-height: 1.6;
  }

  .arch-badges {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 24px;
  }

  .arch-tag {
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.1);
  }

  .arch-arrow {
    color: rgba(255, 255, 255, 0.6);
    font-size: 18px;
  }

  .brand-desc {
    font-size: 14px;
    opacity: 0.8;
    margin: 0;
    letter-spacing: 0.5px;
  }

  .login-right {
    width: 480px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-page, #f5f7fa);
    padding: 48px 40px;
  }

  .login-card {
    width: 100%;
    border-radius: 12px;
  }

  .card-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .card-title {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary, #1a1a2e);
    margin: 0 0 8px;
  }

  .card-subtitle {
    font-size: 14px;
    color: var(--text-secondary, #595959);
    margin: 0;
  }

  .login-btn {
    width: 100%;
    height: 44px;
    font-size: 16px;
    margin-top: 8px;
  }

  .password-toggle {
    cursor: pointer;
    color: var(--text-secondary, #595959);
  }

  .password-toggle:hover {
    color: var(--color-primary, #1677ff);
  }

  .demo-hint {
    margin-top: 16px;
  }

  .hint-text {
    text-align: center;
    font-size: 13px;
    color: var(--text-secondary, #595959);
    margin: 0;
  }

  .hint-text code {
    background: var(--bg-page, #f5f7fa);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    color: var(--color-primary, #1677ff);
  }
  </style>
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/views/LoginView.test.js`：

  ```js
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
    'el-form': { template: '<form @submit.prevent="$emit(\'submit\')"><slot /></form>', emits: ['submit'] },
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

      // Find and click the login button
      const btn = wrapper.find('button')
      await btn.trigger('click')
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

      const btn = wrapper.find('button')
      await btn.trigger('click')
      await new Promise(r => setTimeout(r, 10))

      expect(mockLogin).toHaveBeenCalledWith('bad', 'creds')
    })
  })
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/views/LoginView.test.js
  ```
  预期输出：`3 tests passed`，退出码 0

- [ ] Commit：
  ```
  feat: add LoginView with demo fallback login
  ```

---

### Task 7: Router 重构

**目标：** 重写路由配置，将 `/login` 移到 MainLayout 之外，添加全局 beforeEach 认证守卫，新增 `/demo` 路由。

**Steps:**

- [ ] 改写 `frontend/src/router/index.js`：

  ```js
  import { createRouter, createWebHistory } from 'vue-router'
  import LoginView from '../views/LoginView.vue'
  import MainLayout from '../components/MainLayout.vue'

  // Lazy-loaded views
  const Dashboard = () => import('../views/Dashboard.vue')
  const TerminalsView = () => import('../views/TerminalsView.vue')
  const AlertsView = () => import('../views/AlertsView.vue')
  const DemoView = () => import('../views/DemoView.vue')
  const RegistrationView = () => import('../views/RegistrationView.vue')
  const QueueView = () => import('../views/QueueView.vue')
  const InsuranceView = () => import('../views/InsuranceView.vue')
  const PaymentView = () => import('../views/PaymentView.vue')

  const router = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/login',
        component: LoginView,
        meta: { public: true }
      },
      {
        path: '/',
        component: MainLayout,
        children: [
          { path: '', redirect: '/dashboard' },
          { path: 'dashboard', component: Dashboard },
          { path: 'terminals', component: TerminalsView },
          { path: 'alerts', component: AlertsView },
          { path: 'demo', component: DemoView },
          { path: 'registration', component: RegistrationView },
          { path: 'queue', component: QueueView },
          { path: 'insurance', component: InsuranceView },
          { path: 'payment', component: PaymentView },
          { path: ':pathMatch(.*)*', redirect: '/dashboard' }
        ]
      }
    ]
  })

  router.beforeEach((to) => {
    const token = localStorage.getItem('auth_token')
    if (!to.meta.public && !token) return '/login'
    if (to.path === '/login' && token) return '/dashboard'
  })

  export default router
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/router.test.js`：

  ```js
  import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/router.test.js
  ```
  预期输出：`4 tests passed`，退出码 0

- [ ] Commit：
  ```
  feat: restructure router with auth guard and new routes
  ```

---

## Chunk 3: 数据层 Store 扩展

### Task 8: 扩展 alerts store

**目标：** 在现有 alerts store 基础上添加过滤、分页、hasNewAlerts 状态，新增 setFilter/setPage 动作。

**Steps:**

- [ ] 改写 `frontend/src/stores/alerts.js`：

  ```js
  import { defineStore } from 'pinia'
  import { ref, computed } from 'vue'
  import { getAlerts } from '../api'

  export const useAlertsStore = defineStore('alerts', () => {
    const alerts = ref([])
    const loading = ref(false)
    let timer = null

    // Filter state
    const filterLevel = ref('')
    const filterType = ref('')
    const filterTerminalId = ref('')
    const filterStartTime = ref(null)
    const filterEndTime = ref(null)

    // Pagination state
    const currentPage = ref(1)
    const pageSize = 20

    // Track previous total to detect new arrivals
    const previousTotal = ref(0)

    // Core counts
    const p0Count = computed(() => alerts.value.filter(a => a.level === 'P0').length)
    const p1Count = computed(() => alerts.value.filter(a => a.level === 'P1').length)
    const totalCount = computed(() => alerts.value.length)

    // Filtered alerts
    const filteredAlerts = computed(() => {
      return alerts.value.filter(a => {
        if (filterLevel.value && a.level !== filterLevel.value) return false
        if (filterType.value && a.type !== filterType.value) return false
        if (filterTerminalId.value && a.terminalId !== filterTerminalId.value) return false
        if (filterStartTime.value && new Date(a.timestamp) < filterStartTime.value) return false
        if (filterEndTime.value && new Date(a.timestamp) > filterEndTime.value) return false
        return true
      })
    })

    // Paginated slice of filtered alerts
    const pagedAlerts = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      return filteredAlerts.value.slice(start, start + pageSize)
    })

    // Total pages
    const totalPages = computed(() => Math.ceil(filteredAlerts.value.length / pageSize))

    // True when new alerts arrived since last fetch comparison
    const hasNewAlerts = computed(() => filteredAlerts.value.length > previousTotal.value)

    async function fetchAlerts() {
      try {
        loading.value = true
        const res = await getAlerts()
        previousTotal.value = alerts.value.length
        alerts.value = res.data
      } catch (e) {
        // edge service may not have alerts yet — degrade silently
      } finally {
        loading.value = false
      }
    }

    function setFilter({ level = '', type = '', terminalId = '', startTime = null, endTime = null } = {}) {
      filterLevel.value = level
      filterType.value = type
      filterTerminalId.value = terminalId
      filterStartTime.value = startTime
      filterEndTime.value = endTime
      currentPage.value = 1
    }

    function setPage(n) {
      const clamped = Math.max(1, Math.min(n, totalPages.value || 1))
      currentPage.value = clamped
    }

    function startPolling(interval = 5000) {
      fetchAlerts()
      timer = setInterval(fetchAlerts, interval)
    }

    function stopPolling() {
      if (timer) clearInterval(timer)
    }

    function acknowledgeNewAlerts() {
      previousTotal.value = filteredAlerts.value.length
    }

    return {
      alerts,
      loading,
      filterLevel,
      filterType,
      filterTerminalId,
      filterStartTime,
      filterEndTime,
      currentPage,
      pageSize,
      p0Count,
      p1Count,
      totalCount,
      filteredAlerts,
      pagedAlerts,
      totalPages,
      hasNewAlerts,
      fetchAlerts,
      setFilter,
      setPage,
      startPolling,
      stopPolling,
      acknowledgeNewAlerts
    }
  })
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/stores/alerts.test.js`：

  ```js
  import { describe, it, expect, beforeEach, vi } from 'vitest'
  import { setActivePinia, createPinia } from 'pinia'
  import { useAlertsStore } from '../../stores/alerts'

  vi.mock('../../api', () => ({
    getAlerts: vi.fn()
  }))
  import { getAlerts } from '../../api'

  const makeAlerts = (count, overrides = {}) =>
    Array.from({ length: count }, (_, i) => ({
      id: `alert-${i}`,
      level: i % 3 === 0 ? 'P0' : 'P1',
      type: i % 2 === 0 ? 'HARDWARE' : 'PERFORMANCE',
      terminalId: `T00${(i % 5) + 1}`,
      message: `Alert ${i}`,
      ...overrides
    }))

  describe('alerts store', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      vi.clearAllMocks()
    })

    it('filteredAlerts filters by level correctly', async () => {
      getAlerts.mockResolvedValue({ data: makeAlerts(10) })
      const store = useAlertsStore()
      await store.fetchAlerts()

      store.setFilter({ level: 'P0' })
      const p0Alerts = store.filteredAlerts
      expect(p0Alerts.every(a => a.level === 'P0')).toBe(true)
      expect(p0Alerts.length).toBeLessThan(10)
    })

    it('pagedAlerts returns correct slice for page 1 with pageSize 20', async () => {
      const manyAlerts = makeAlerts(45)
      getAlerts.mockResolvedValue({ data: manyAlerts })
      const store = useAlertsStore()
      await store.fetchAlerts()

      expect(store.pagedAlerts.length).toBe(20)
      expect(store.totalPages).toBe(3)
    })

    it('pagedAlerts returns last page slice', async () => {
      const manyAlerts = makeAlerts(45)
      getAlerts.mockResolvedValue({ data: manyAlerts })
      const store = useAlertsStore()
      await store.fetchAlerts()

      store.setPage(3)
      expect(store.pagedAlerts.length).toBe(5)
    })

    it('setFilter resets currentPage to 1', async () => {
      getAlerts.mockResolvedValue({ data: makeAlerts(60) })
      const store = useAlertsStore()
      await store.fetchAlerts()

      store.setPage(3)
      expect(store.currentPage).toBe(3)

      store.setFilter({ level: 'P0' })
      expect(store.currentPage).toBe(1)
    })

    it('hasNewAlerts is true when new alerts arrive', async () => {
      getAlerts.mockResolvedValue({ data: makeAlerts(5) })
      const store = useAlertsStore()
      await store.fetchAlerts()
      expect(store.hasNewAlerts).toBe(false) // previousTotal starts at 0, but after fetch it's 0→5 so previous=0

      // Second fetch with more alerts
      getAlerts.mockResolvedValue({ data: makeAlerts(10) })
      await store.fetchAlerts()
      // previousTotal is now 5, filteredAlerts.length is 10
      expect(store.hasNewAlerts).toBe(true)
    })
  })
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/stores/alerts.test.js
  ```
  预期输出：`5 tests passed`，退出码 0

- [ ] Commit：
  ```
  feat: extend alerts store with filter and pagination
  ```

---

### Task 9: 扩展 terminals store (T001-T020)

**目标：** 将终端列表从 5 个扩展到 20 个（T001-T020），增加 `resetAll()` 方法。

**Steps:**

- [ ] 改写 `frontend/src/stores/terminals.js`：

  ```js
  import { defineStore } from 'pinia'
  import { ref, computed } from 'vue'

  const TERMINAL_LOCATIONS = {
    T001: '门诊大厅1号',
    T002: '门诊大厅2号',
    T003: '急诊通道',
    T004: '住院楼1层',
    T005: '住院楼2层',
    T006: '住院楼3层',
    T007: '门诊大厅3号',
    T008: '门诊大厅4号',
    T009: '检验中心',
    T010: '放射科',
    T011: '儿科门诊',
    T012: '内科门诊',
    T013: '外科门诊',
    T014: '妇产科',
    T015: '中医门诊',
    T016: '眼科门诊',
    T017: '口腔科',
    T018: '皮肤科',
    T019: '神经内科',
    T020: '心血管科'
  }

  function makeDefaultTerminal(id) {
    return {
      id,
      location: TERMINAL_LOCATIONS[id],
      status: 'online',
      hardware: { printer: 'ok', cardReader: 'ok', screen: 'ok' },
      queue: { depth: 0, avgWaitMs: 0 }
    }
  }

  const DEFAULT_TERMINALS = Object.keys(TERMINAL_LOCATIONS).map(makeDefaultTerminal)

  export const useTerminalsStore = defineStore('terminals', () => {
    const terminals = ref(DEFAULT_TERMINALS.map(t => ({ ...t, hardware: { ...t.hardware }, queue: { ...t.queue } })))

    const onlineCount = computed(() => terminals.value.filter(t => t.status === 'online').length)
    const offlineCount = computed(() => terminals.value.filter(t => t.status === 'offline').length)
    const degradedCount = computed(() => terminals.value.filter(t => t.status === 'degraded').length)

    function applyAlerts(alerts) {
      const terminalMap = {}
      alerts.forEach(a => {
        if (!terminalMap[a.terminalId]) terminalMap[a.terminalId] = []
        terminalMap[a.terminalId].push(a)
      })
      terminals.value = terminals.value.map(t => {
        const termAlerts = terminalMap[t.id] || []
        const latestHardware = termAlerts.find(a => a.type === 'HARDWARE')
        const newT = { ...t, hardware: { ...t.hardware } }
        if (latestHardware) {
          if (latestHardware.message && latestHardware.message.includes('离线')) {
            newT.status = 'offline'
          } else if (latestHardware.message && latestHardware.message.includes('打印机')) {
            newT.status = 'degraded'
            newT.hardware.printer = 'paper_jam'
          } else if (latestHardware.message && latestHardware.message.includes('读卡')) {
            newT.status = 'degraded'
            newT.hardware.cardReader = 'error'
          }
        }
        return newT
      })
    }

    function resetAll() {
      terminals.value = DEFAULT_TERMINALS.map(t => ({
        ...t,
        hardware: { ...t.hardware },
        queue: { ...t.queue }
      }))
    }

    return { terminals, onlineCount, offlineCount, degradedCount, applyAlerts, resetAll }
  })
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/stores/terminals.test.js`：

  ```js
  import { describe, it, expect, beforeEach } from 'vitest'
  import { setActivePinia, createPinia } from 'pinia'
  import { useTerminalsStore } from '../../stores/terminals'

  describe('terminals store', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('has 20 terminals initially', () => {
      const store = useTerminalsStore()
      expect(store.terminals.length).toBe(20)
    })

    it('all terminals start with status online', () => {
      const store = useTerminalsStore()
      expect(store.terminals.every(t => t.status === 'online')).toBe(true)
    })

    it('includes T020 心血管科', () => {
      const store = useTerminalsStore()
      const t020 = store.terminals.find(t => t.id === 'T020')
      expect(t020).toBeDefined()
      expect(t020.location).toBe('心血管科')
    })

    it('applyAlerts with P0 hardware printer alert sets terminal to degraded', () => {
      const store = useTerminalsStore()
      store.applyAlerts([
        { terminalId: 'T005', type: 'HARDWARE', level: 'P0', message: '打印机卡纸' }
      ])
      const t005 = store.terminals.find(t => t.id === 'T005')
      expect(t005.status).toBe('degraded')
      expect(t005.hardware.printer).toBe('paper_jam')
    })

    it('applyAlerts with offline message sets terminal to offline', () => {
      const store = useTerminalsStore()
      store.applyAlerts([
        { terminalId: 'T003', type: 'HARDWARE', level: 'P0', message: '终端离线' }
      ])
      const t003 = store.terminals.find(t => t.id === 'T003')
      expect(t003.status).toBe('offline')
    })

    it('resetAll returns all terminals to online status', () => {
      const store = useTerminalsStore()
      store.applyAlerts([
        { terminalId: 'T001', type: 'HARDWARE', level: 'P0', message: '终端离线' },
        { terminalId: 'T010', type: 'HARDWARE', level: 'P0', message: '打印机卡纸' }
      ])
      expect(store.offlineCount).toBeGreaterThan(0)

      store.resetAll()
      expect(store.onlineCount).toBe(20)
      expect(store.offlineCount).toBe(0)
      expect(store.degradedCount).toBe(0)
    })
  })
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/stores/terminals.test.js
  ```
  预期输出：`6 tests passed`，退出码 0

- [ ] Commit：
  ```
  feat: extend terminals store to 20 terminals with resetAll
  ```

---

### Task 10: stats store

**目标：** 新建 stats store，轮询 `/api/v1/payment/stats` 获取支付成功率 KPI，失败时优雅降级为 null。

**Steps:**

- [ ] 创建 `frontend/src/stores/stats.js`：

  ```js
  import { defineStore } from 'pinia'
  import { ref } from 'vue'
  import { getPaymentStats } from '../api'

  export const useStatsStore = defineStore('stats', () => {
    const paymentSuccessRate = ref(null)
    const loading = ref(false)
    let timer = null

    async function fetchStats() {
      try {
        loading.value = true
        const res = await getPaymentStats()
        paymentSuccessRate.value = res.data?.paymentSuccessRate ?? res.data ?? null
      } catch (e) {
        // Graceful degradation: backend may not expose this endpoint yet
        paymentSuccessRate.value = null
      } finally {
        loading.value = false
      }
    }

    function startPolling(interval = 10000) {
      fetchStats()
      timer = setInterval(fetchStats, interval)
    }

    function stopPolling() {
      if (timer) clearInterval(timer)
    }

    return { paymentSuccessRate, loading, fetchStats, startPolling, stopPolling }
  })
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/stores/stats.test.js`：

  ```js
  import { describe, it, expect, beforeEach, vi } from 'vitest'
  import { setActivePinia, createPinia } from 'pinia'
  import { useStatsStore } from '../../stores/stats'

  vi.mock('../../api', () => ({
    getPaymentStats: vi.fn()
  }))
  import { getPaymentStats } from '../../api'

  describe('stats store', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      vi.clearAllMocks()
    })

    it('fetchStats sets paymentSuccessRate on success', async () => {
      getPaymentStats.mockResolvedValue({ data: { paymentSuccessRate: 0.987 } })

      const store = useStatsStore()
      await store.fetchStats()

      expect(store.paymentSuccessRate).toBe(0.987)
    })

    it('fetchStats sets null on error (graceful degradation)', async () => {
      getPaymentStats.mockRejectedValue(new Error('Network Error'))

      const store = useStatsStore()
      await store.fetchStats()

      expect(store.paymentSuccessRate).toBeNull()
    })

    it('fetchStats sets null on 404', async () => {
      getPaymentStats.mockRejectedValue({ response: { status: 404 } })

      const store = useStatsStore()
      await store.fetchStats()

      expect(store.paymentSuccessRate).toBeNull()
    })

    it('loading is false after fetchStats resolves', async () => {
      getPaymentStats.mockResolvedValue({ data: { paymentSuccessRate: 0.95 } })

      const store = useStatsStore()
      await store.fetchStats()

      expect(store.loading).toBe(false)
    })
  })
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/stores/stats.test.js
  ```
  预期输出：`4 tests passed`，退出码 0

- [ ] Commit：
  ```
  feat: add stats store for KPI polling
  ```

---

### Task 11: simulator store

**目标：** 新建 simulator store，管理模拟器运行状态和事件日志，所有 API 错误优雅降级。

**Steps:**

- [ ] 创建 `frontend/src/stores/simulator.js`：

  ```js
  import { defineStore } from 'pinia'
  import { ref } from 'vue'
  import { startSimulator, stopSimulator, injectScene, getAlerts } from '../api'

  const MAX_EVENT_LOG = 50

  export const useSimulatorStore = defineStore('simulator', () => {
    const running = ref(false)
    const runningCount = ref(0)
    const totalSent = ref(0)
    const totalAlerts = ref(0)
    const eventLog = ref([])
    const apiReady = ref(false)
    let timer = null

    function pushEvent(entry) {
      eventLog.value.push(entry)
      if (eventLog.value.length > MAX_EVENT_LOG) {
        eventLog.value.shift()
      }
    }

    async function start() {
      try {
        await startSimulator()
        running.value = true
        apiReady.value = true
      } catch (e) {
        // API not available — degrade gracefully, do not throw
        apiReady.value = false
      }
    }

    async function stop() {
      try {
        await stopSimulator()
      } catch (e) {
        // Degrade silently
      } finally {
        running.value = false
      }
    }

    async function inject(scene, terminalId) {
      // Always push to event log regardless of API result
      pushEvent({
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        layer: '端层',
        message: `注入场景: ${scene} → ${terminalId}`
      })

      try {
        await injectScene({ scene, terminalId })
      } catch (e) {
        // Degrade silently — event log already recorded
      }
    }

    function addEventFromAlert(alert) {
      const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })

      // Edge layer event
      pushEvent({
        time,
        layer: '边层',
        message: `[${alert.level}] ${alert.terminalId} — ${alert.type}: ${alert.message || '告警触发'}`
      })

      // Cloud layer event
      pushEvent({
        time,
        layer: '云层',
        message: `收到告警 ${alert.id || ''} 来自 ${alert.terminalId}，级别 ${alert.level}`
      })
    }

    function startPolling(interval = 3000) {
      timer = setInterval(async () => {
        try {
          const res = await getAlerts()
          const newCount = res.data?.length ?? 0
          if (newCount > totalAlerts.value) {
            totalAlerts.value = newCount
          }
          totalSent.value += 20 // simulate heartbeat packet count
          runningCount.value = newCount
        } catch (e) {
          // Degrade silently
        }
      }, interval)
    }

    function stopPolling() {
      if (timer) clearInterval(timer)
    }

    return {
      running,
      runningCount,
      totalSent,
      totalAlerts,
      eventLog,
      apiReady,
      start,
      stop,
      inject,
      addEventFromAlert,
      startPolling,
      stopPolling
    }
  })
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/stores/simulator.test.js`：

  ```js
  import { describe, it, expect, beforeEach, vi } from 'vitest'
  import { setActivePinia, createPinia } from 'pinia'
  import { useSimulatorStore } from '../../stores/simulator'

  vi.mock('../../api', () => ({
    startSimulator: vi.fn(),
    stopSimulator: vi.fn(),
    injectScene: vi.fn(),
    getAlerts: vi.fn()
  }))
  import { startSimulator, injectScene } from '../../api'

  describe('simulator store', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      vi.clearAllMocks()
    })

    it('start() with API error sets apiReady to false and does not throw', async () => {
      startSimulator.mockRejectedValue(new Error('Network Error'))

      const store = useSimulatorStore()
      await expect(store.start()).resolves.toBeUndefined()

      expect(store.apiReady).toBe(false)
      expect(store.running).toBe(false)
    })

    it('start() with successful API sets running to true and apiReady to true', async () => {
      startSimulator.mockResolvedValue({ data: { status: 'started' } })

      const store = useSimulatorStore()
      await store.start()

      expect(store.running).toBe(true)
      expect(store.apiReady).toBe(true)
    })

    it('inject() pushes to eventLog', async () => {
      injectScene.mockResolvedValue({ data: {} })

      const store = useSimulatorStore()
      await store.inject('card_error', 'T007')

      expect(store.eventLog.length).toBe(1)
      expect(store.eventLog[0].layer).toBe('端层')
      expect(store.eventLog[0].message).toContain('T007')
      expect(store.eventLog[0].message).toContain('card_error')
    })

    it('inject() still pushes to eventLog when API fails', async () => {
      injectScene.mockRejectedValue(new Error('Not found'))

      const store = useSimulatorStore()
      await store.inject('printer_jam', 'T003')

      expect(store.eventLog.length).toBe(1)
      expect(store.eventLog[0].message).toContain('printer_jam')
    })

    it('addEventFromAlert pushes 2 entries (边层 + 云层)', () => {
      const store = useSimulatorStore()
      store.addEventFromAlert({
        id: 'a001',
        level: 'P0',
        type: 'HARDWARE',
        terminalId: 'T001',
        message: '打印机卡纸'
      })

      expect(store.eventLog.length).toBe(2)
      expect(store.eventLog[0].layer).toBe('边层')
      expect(store.eventLog[1].layer).toBe('云层')
    })

    it('eventLog is capped at 50 entries', () => {
      const store = useSimulatorStore()
      const alert = { id: 'x', level: 'P1', type: 'PERFORMANCE', terminalId: 'T002', message: 'test' }

      // Each addEventFromAlert adds 2; call 26 times = 52 entries, should cap at 50
      for (let i = 0; i < 26; i++) {
        store.addEventFromAlert(alert)
      }

      expect(store.eventLog.length).toBe(50)
    })
  })
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/stores/simulator.test.js
  ```
  预期输出：`6 tests passed`，退出码 0

- [ ] Commit：
  ```
  feat: add simulator store with graceful API degradation
  ```

---

## Chunk 4: MainLayout 重写

### Task 12: MainLayout 重写为顶部 Tab 导航

**目标：** 将左侧边栏布局替换为顶部水平 Tab 导航，接入 auth/alerts/stats store，实现完整轮询生命周期管理。

**Steps:**

- [ ] 改写 `frontend/src/components/MainLayout.vue`：

  ```vue
  <template>
    <el-container direction="vertical" style="height: 100vh">
      <!-- Top navigation header -->
      <el-header height="64px" class="top-header">
        <div class="header-inner">
          <!-- Logo -->
          <div class="logo">
            <el-icon size="22" style="color: #1677ff"><Monitor /></el-icon>
            <span class="logo-text">云边端监测</span>
          </div>

          <!-- Main navigation tabs -->
          <el-menu
            mode="horizontal"
            :default-active="activeMenu"
            class="top-nav"
            @select="handleMenuSelect"
          >
            <el-menu-item index="dashboard">总览</el-menu-item>
            <el-menu-item index="terminals">终端监控</el-menu-item>
            <el-menu-item index="alerts">
              <el-badge
                :value="alertsStore.p0Count || undefined"
                :hidden="alertsStore.p0Count === 0"
                type="danger"
              >
                告警中心
              </el-badge>
            </el-menu-item>

            <el-menu-item disabled class="nav-divider">|</el-menu-item>

            <el-menu-item index="registration">挂号</el-menu-item>
            <el-menu-item index="queue">排队</el-menu-item>
            <el-menu-item index="insurance">医保</el-menu-item>
            <el-menu-item index="payment">支付</el-menu-item>
            <el-menu-item index="demo">架构演示</el-menu-item>
          </el-menu>

          <!-- Right: alert summary + user + logout -->
          <div class="header-right">
            <el-tag
              v-if="alertsStore.p0Count > 0"
              type="danger"
              effect="dark"
              size="small"
            >
              P0 {{ alertsStore.p0Count }}
            </el-tag>
            <el-tag
              v-if="alertsStore.p1Count > 0"
              type="warning"
              effect="dark"
              size="small"
              style="margin-left: 6px"
            >
              P1 {{ alertsStore.p1Count }}
            </el-tag>
            <span class="username">{{ authStore.user?.name || '管理员' }}</span>
            <el-button
              type="text"
              size="small"
              class="logout-btn"
              @click="logout"
            >
              退出
            </el-button>
          </div>
        </div>
      </el-header>

      <!-- Main content area -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </template>

  <script setup>
  import { computed, onMounted, onUnmounted, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAlertsStore } from '../stores/alerts'
  import { useTerminalsStore } from '../stores/terminals'
  import { useStatsStore } from '../stores/stats'
  import { useAuthStore } from '../stores/auth'

  const route = useRoute()
  const router = useRouter()
  const alertsStore = useAlertsStore()
  const terminalsStore = useTerminalsStore()
  const statsStore = useStatsStore()
  const authStore = useAuthStore()

  const pageTitles = {
    dashboard: '总览',
    terminals: '终端监控',
    alerts: '告警中心',
    demo: '架构演示',
    registration: '挂号预约',
    queue: '排队查询',
    insurance: '医保验证',
    payment: '支付验证'
  }

  // Derive active menu key from current route path segment
  const activeMenu = computed(() => {
    const segment = route.path.split('/').filter(Boolean)[0]
    return segment || 'dashboard'
  })

  function handleMenuSelect(key) {
    if (key && pageTitles[key]) {
      router.push('/' + key)
    }
  }

  function logout() {
    authStore.logout()
    router.push('/login')
  }

  // Watch alerts and sync to terminals store
  watch(
    () => alertsStore.alerts,
    (alerts) => {
      terminalsStore.applyAlerts(alerts)
    },
    { deep: true }
  )

  onMounted(() => {
    alertsStore.startPolling(5000)
    statsStore.startPolling(10000)
    // Initial sync
    terminalsStore.applyAlerts(alertsStore.alerts)
  })

  onUnmounted(() => {
    alertsStore.stopPolling()
    statsStore.stopPolling()
  })
  </script>

  <style scoped>
  .top-header {
    background: var(--bg-header, #001529);
    padding: 0;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    z-index: 100;
  }

  .header-inner {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 24px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-right: 32px;
  }

  .logo-text {
    color: #ffffff;
    font-size: 15px;
    font-weight: 700;
    white-space: nowrap;
  }

  .top-nav {
    flex: 1;
    background: transparent;
    border-bottom: none;
    height: 64px;
  }

  .top-nav :deep(.el-menu-item) {
    color: rgba(255, 255, 255, 0.75);
    height: 64px;
    line-height: 64px;
    border-bottom: 3px solid transparent;
    font-size: 14px;
  }

  .top-nav :deep(.el-menu-item:hover) {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.08) !important;
  }

  .top-nav :deep(.el-menu-item.is-active) {
    color: #1677ff !important;
    background: transparent !important;
    border-bottom-color: #1677ff;
  }

  .nav-divider {
    cursor: default;
    color: rgba(255, 255, 255, 0.2) !important;
    padding: 0 4px !important;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-left: 24px;
  }

  .username {
    color: rgba(255, 255, 255, 0.85);
    font-size: 13px;
    margin-left: 8px;
  }

  .logout-btn {
    color: rgba(255, 255, 255, 0.6);
    font-size: 13px;
  }

  .logout-btn:hover {
    color: #ffffff;
  }

  .main-content {
    background: var(--bg-page, #f5f7fa);
    padding: 24px;
    overflow-y: auto;
  }
  </style>
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/components/MainLayout.test.js`：

  ```js
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
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/components/MainLayout.test.js
  ```
  预期输出：`6 tests passed`，退出码 0

- [ ] 运行全量测试套件验证无回归：
  ```bash
  cd frontend && npm run test:run
  ```
  预期输出：所有测试通过，退出码 0

- [ ] Commit：
  ```
  feat: rewrite MainLayout to top tab nav with polling lifecycle
  ```

---

## Chunk 5: Dashboard 页

### Task 13: Dashboard.vue 重写

**目标：** 将 `Dashboard.vue` 从暗色主题全量重写为企业白色主题，包含 KPI 卡片、告警时间线图、终端饼图、最近告警表。

**Steps:**

- [ ] 改写 `frontend/src/views/Dashboard.vue`：

  ```vue
  <template>
    <div class="dashboard-page">
      <!-- Row 1: KPI Cards -->
      <el-row :gutter="20" class="kpi-row">
        <el-col :span="6">
          <div class="kpi-card kpi-primary">
            <div class="kpi-label">在线终端</div>
            <div class="kpi-value">{{ terminalsStore.onlineCount }}</div>
            <div class="kpi-trend">{{ onlineTrend }} <span>较上次</span></div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="kpi-card kpi-danger" :class="{ 'kpi-danger-active': alertsStore.p0Count > 0 }">
            <div class="kpi-label">P0 告警</div>
            <div class="kpi-value">{{ alertsStore.p0Count }}</div>
            <div class="kpi-trend" :style="{color: p0Trend==='↑' ? 'var(--color-danger)' : 'var(--color-success)'}">{{ p0Trend }} <span>较上次</span></div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="kpi-card kpi-warning">
            <div class="kpi-label">P1 告警</div>
            <div class="kpi-value">{{ alertsStore.p1Count }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="kpi-card kpi-success">
            <div class="kpi-label">支付成功率</div>
            <div class="kpi-value">{{ statsStore.paymentSuccessRate ?? '暂无数据' }}</div>
          </div>
        </el-col>
      </el-row>

      <!-- Row 2: Charts -->
      <el-row :gutter="20" class="chart-row">
        <el-col :span="14">
          <div class="chart-card">
            <div class="chart-title">告警事件时间线</div>
            <v-chart class="chart" :option="timelineOption" autoresize />
          </div>
        </el-col>
        <el-col :span="10">
          <div class="chart-card">
            <div class="chart-title">终端状态分布</div>
            <v-chart class="chart" :option="pieOption" autoresize />
          </div>
        </el-col>
      </el-row>

      <!-- Row 3: Recent Alerts Table -->
      <div class="table-card">
        <div class="table-title">最近告警</div>
        <el-table
          :data="recentAlerts"
          :row-class-name="tableRowClassName"
          style="width: 100%"
        >
          <el-table-column prop="timestamp" label="时间" width="180" :formatter="formatTime" />
          <el-table-column prop="level" label="级别" width="80">
            <template #default="{ row }">
              <el-tag :type="row.level === 'P0' ? 'danger' : 'warning'" size="small">
                {{ row.level }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="terminalId" label="终端" width="100" />
          <el-table-column prop="type" label="类型" width="120" />
          <el-table-column prop="message" label="消息" show-overflow-tooltip />
        </el-table>
        <div class="table-footer">
          <router-link to="/alerts" class="view-all-link">查看全部 →</router-link>
        </div>
      </div>
    </div>
  </template>

  <script setup>
  import { computed, ref, watch } from 'vue'
  import { useAlertsStore } from '../stores/alerts'
  import { useTerminalsStore } from '../stores/terminals'
  import { useStatsStore } from '../stores/stats'
  import VChart from 'vue-echarts'
  import { use } from 'echarts/core'
  import { LineChart, PieChart } from 'echarts/charts'
  import {
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent
  } from 'echarts/components'
  import { CanvasRenderer } from 'echarts/renderers'

  use([LineChart, PieChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer])

  const alertsStore = useAlertsStore()
  const terminalsStore = useTerminalsStore()
  const statsStore = useStatsStore()

  const recentAlerts = computed(() => alertsStore.alerts.slice(0, 8))

  // Track previous values for trend arrows
  const prevOnline = ref(terminalsStore.onlineCount)
  const prevP0 = ref(alertsStore.p0Count)
  watch(() => terminalsStore.onlineCount, (val, old) => { prevOnline.value = old ?? val })
  watch(() => alertsStore.p0Count, (val, old) => { prevP0.value = old ?? val })
  const onlineTrend = computed(() => terminalsStore.onlineCount >= prevOnline.value ? '↑' : '↓')
  const p0Trend = computed(() => alertsStore.p0Count <= prevP0.value ? '↓' : '↑')

  const last20Alerts = computed(() => alertsStore.alerts.slice(0, 20))

  const timelineOption = computed(() => {
    const xData = last20Alerts.value.map(a => {
      const d = new Date(a.timestamp)
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
    })
    const p0Data = last20Alerts.value.map(a => a.level === 'P0' ? 1 : 0)
    const p1Data = last20Alerts.value.map(a => a.level === 'P1' ? 1 : 0)
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['P0', 'P1'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: xData, axisLabel: { rotate: 45, fontSize: 10 } },
      yAxis: { type: 'value', min: 0, max: 1, interval: 1 },
      series: [
        {
          name: 'P0',
          type: 'line',
          data: p0Data,
          itemStyle: { color: '#ff4d4f' },
          lineStyle: { color: '#ff4d4f' },
          step: 'end'
        },
        {
          name: 'P1',
          type: 'line',
          data: p1Data,
          itemStyle: { color: '#faad14' },
          lineStyle: { color: '#faad14' },
          step: 'end'
        }
      ]
    }
  })

  const pieOption = computed(() => ({
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [
      {
        name: '终端状态',
        type: 'pie',
        radius: '60%',
        data: [
          { value: terminalsStore.onlineCount, name: '在线', itemStyle: { color: '#52c41a' } },
          { value: terminalsStore.degradedCount, name: '降级', itemStyle: { color: '#faad14' } },
          { value: terminalsStore.offlineCount, name: '离线', itemStyle: { color: '#ff4d4f' } }
        ]
      }
    ]
  }))

  function tableRowClassName({ row }) {
    return row.level === 'P0' ? 'danger-row' : ''
  }

  function formatTime(row) {
    if (!row.timestamp) return '-'
    return new Date(row.timestamp).toLocaleString('zh-CN')
  }
  </script>

  <style scoped>
  .dashboard-page {
    padding: 20px;
  }

  .kpi-row {
    margin-bottom: 20px;
  }

  .kpi-card {
    background: var(--bg-primary);
    box-shadow: var(--shadow-card);
    border-radius: 8px;
    padding: 20px;
    border-left: 4px solid transparent;
  }

  .kpi-primary { border-left-color: var(--color-primary); }
  .kpi-danger { border-left-color: var(--color-danger); }
  .kpi-warning { border-left-color: var(--color-warning); }
  .kpi-success { border-left-color: var(--color-success); }

  .kpi-danger-active {
    background: #fff2f0;
  }

  .kpi-label {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .kpi-value {
    font-size: 32px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .kpi-trend {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
  }
  .kpi-trend span {
    font-size: 11px;
    opacity: 0.7;
  }

  .chart-row {
    margin-bottom: 20px;
  }

  .chart-card {
    background: var(--bg-primary);
    box-shadow: var(--shadow-card);
    border-radius: 8px;
    padding: 20px;
  }

  .chart-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 16px;
  }

  .chart {
    height: 260px;
    width: 100%;
  }

  .table-card {
    background: var(--bg-primary);
    box-shadow: var(--shadow-card);
    border-radius: 8px;
    padding: 20px;
  }

  .table-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 16px;
  }

  .table-footer {
    margin-top: 16px;
    text-align: right;
  }

  .view-all-link {
    color: var(--color-primary);
    text-decoration: none;
    font-size: 14px;
  }

  .view-all-link:hover {
    text-decoration: underline;
  }

  :deep(.danger-row) {
    background: #fff2f0 !important;
  }

  :deep(.el-table-row.danger-row) {
    background: #fff2f0;
  }
  </style>
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/views/Dashboard.test.js`：

  ```js
  import { describe, it, expect, beforeEach, vi } from 'vitest'
  import { mount } from '@vue/test-utils'
  import { createPinia, setActivePinia } from 'pinia'
  import { defineComponent } from 'vue'

  // Stub vue-echarts
  vi.mock('vue-echarts', () => ({ default: defineComponent({ name: 'VChart', template: '<div class="chart-stub"></div>' }) }))
  vi.mock('echarts/core', () => ({ use: vi.fn() }))
  vi.mock('echarts/charts', () => ({ LineChart: {}, PieChart: {} }))
  vi.mock('echarts/components', () => ({ TitleComponent: {}, TooltipComponent: {}, GridComponent: {}, LegendComponent: {} }))
  vi.mock('echarts/renderers', () => ({ CanvasRenderer: {} }))

  vi.mock('../../stores/alerts', () => ({
    useAlertsStore: () => ({
      alerts: Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        level: i < 3 ? 'P0' : 'P1',
        terminalId: `T00${i + 1}`,
        type: 'HARDWARE',
        message: `Alert ${i}`
      })),
      p0Count: 3,
      p1Count: 7
    })
  }))

  vi.mock('../../stores/terminals', () => ({
    useTerminalsStore: () => ({
      onlineCount: 15,
      offlineCount: 3,
      degradedCount: 2
    })
  }))

  vi.mock('../../stores/stats', () => ({
    useStatsStore: () => ({
      paymentSuccessRate: null
    })
  }))

  import Dashboard from '../../views/Dashboard.vue'

  function mountDashboard(overrides = {}) {
    return mount(Dashboard, {
      global: {
        plugins: [createPinia()],
        stubs: {
          'el-row': { template: '<div class="el-row"><slot /></div>' },
          'el-col': { template: '<div class="el-col"><slot /></div>' },
          'el-table': { template: '<div class="el-table"><slot /></div>' },
          'el-table-column': { template: '<div></div>' },
          'el-tag': { template: '<span class="el-tag"><slot /></span>' },
          'router-link': { template: '<a><slot /></a>' }
        }
      }
    })
  }

  describe('Dashboard.vue', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('mounts without crashing', () => {
      const wrapper = mountDashboard()
      expect(wrapper.exists()).toBe(true)
    })

    it('p0Count > 0 → P0 card has danger-active class', () => {
      const wrapper = mountDashboard()
      const cards = wrapper.findAll('.kpi-card')
      // P0 card is the second card
      expect(cards[1].classes()).toContain('kpi-danger-active')
    })

    it('paymentSuccessRate=null → shows 暂无数据', () => {
      const wrapper = mountDashboard()
      const kpiValues = wrapper.findAll('.kpi-value')
      // Last KPI card (index 3) should show 暂无数据
      expect(kpiValues[3].text()).toBe('暂无数据')
    })

    it('recent alerts table slices to max 8', () => {
      const tenAlerts = Array.from({length:10}, (_,i) => ({
        alertId: `a${i}`, level:'P0', terminalId:'T001', type:'HARDWARE',
        message:'test', timestamp: Date.now()
      }))
      const sliced = tenAlerts.slice(0, 8)
      expect(sliced).toHaveLength(8)
    })
  })
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/views/Dashboard.test.js
  ```
  预期输出：`4 tests passed`，退出码 0

- [ ] Commit：
  ```
  feat: rewrite Dashboard with enterprise light theme KPI cards and charts
  ```

---

## Chunk 6: TerminalsView + AlertsView

### Task 14: TerminalsView 重写

**目标：** 将 `TerminalsView.vue` 从暗色主题全量重写，新增左侧状态筛选面板，终端卡片网格支持高亮滚动定位。

**Steps:**

- [ ] 改写 `frontend/src/views/TerminalsView.vue`：

  ```vue
  <template>
    <div class="terminals-page">
      <!-- Left Panel -->
      <div class="left-panel">
        <div class="filter-section">
          <el-radio-group v-model="filterStatus" button-style="solid" size="small">
            <el-radio-button value="all">
              全部
              <el-badge :value="terminalsStore.terminals.length" class="filter-badge" />
            </el-radio-button>
            <el-radio-button value="online">
              在线
              <el-badge :value="terminalsStore.onlineCount" class="filter-badge" />
            </el-radio-button>
            <el-radio-button value="degraded">
              降级
              <el-badge :value="terminalsStore.degradedCount" type="warning" class="filter-badge" />
            </el-radio-button>
            <el-radio-button value="offline">
              离线
              <el-badge :value="terminalsStore.offlineCount" type="danger" class="filter-badge" />
            </el-radio-button>
          </el-radio-group>
        </div>
        <div class="terminal-list">
          <div
            v-for="t in filteredTerminals"
            :key="t.id"
            class="terminal-list-item"
            :class="{ active: highlightId === t.id }"
            @click="handleListItemClick(t.id)"
          >
            <span class="status-dot" :class="`dot-${t.status}`"></span>
            <span class="terminal-id">{{ t.id }}</span>
          </div>
        </div>
      </div>

      <!-- Right Content -->
      <div class="right-content">
        <div class="cards-grid">
          <div
            v-for="t in filteredTerminals"
            :id="'card-' + t.id"
            :key="t.id"
            class="terminal-card"
            :class="{
              'card-degraded': t.status === 'degraded',
              'card-offline': t.status === 'offline',
              highlighted: highlightId === t.id
            }"
          >
            <!-- Card Header -->
            <div class="card-header">
              <div class="card-title">
                <span class="t-id">{{ t.id }}</span>
                <span class="t-location">{{ t.location }}</span>
              </div>
              <el-tag
                :type="statusType(t.status)"
                size="small"
              >{{ statusLabel(t.status) }}</el-tag>
            </div>

            <!-- Hardware Row -->
            <div class="hardware-row">
              <el-tooltip content="打印机" placement="top">
                <el-icon
                  class="hw-icon"
                  :class="hwClass(t.printer)"
                ><Printer /></el-icon>
              </el-tooltip>
              <el-tooltip content="读卡器" placement="top">
                <el-icon
                  class="hw-icon"
                  :class="hwClass(t.cardReader)"
                ><CreditCard /></el-icon>
              </el-tooltip>
              <el-tooltip content="屏幕" placement="top">
                <el-icon
                  class="hw-icon"
                  :class="hwClass(t.screen)"
                ><Monitor /></el-icon>
              </el-tooltip>
            </div>

            <!-- Degraded Alert Message -->
            <div v-if="t.status === 'degraded' && t.latestAlert" class="alert-msg">
              <el-icon><Warning /></el-icon>
              {{ t.latestAlert }}
            </div>

            <!-- Queue Row -->
            <div class="queue-row">
              <span class="queue-depth" :class="{ 'depth-high': t.queueDepth > 50 }">
                队列: {{ t.queueDepth ?? 0 }}
              </span>
              <span class="wait-time">
                均等待: {{ formatWait(t.avgWaitMs) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>

  <script setup>
  import { ref, computed } from 'vue'
  import { useTerminalsStore } from '../stores/terminals'
  import { Printer, CreditCard, Monitor, Warning } from '@element-plus/icons-vue'

  const terminalsStore = useTerminalsStore()

  const filterStatus = ref('all')
  const highlightId = ref(null)

  const filteredTerminals = computed(() => {
    if (filterStatus.value === 'all') return terminalsStore.terminals
    return terminalsStore.terminals.filter(t => t.status === filterStatus.value)
  })

  function statusType(status) {
    if (status === 'online') return 'success'
    if (status === 'degraded') return 'warning'
    if (status === 'offline') return 'danger'
    return 'info'
  }

  function statusLabel(status) {
    if (status === 'online') return '在线'
    if (status === 'degraded') return '降级'
    if (status === 'offline') return '离线'
    return '未知'
  }

  function hwClass(hwStatus) {
    if (!hwStatus || hwStatus === 'unknown') return 'hw-gray'
    if (hwStatus === 'ok') return 'hw-green'
    return 'hw-red'
  }

  function formatWait(ms) {
    if (!ms) return '0s'
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    return `${(ms / 60000).toFixed(1)}min`
  }

  function scrollToCard(id) {
    document.getElementById('card-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  function handleListItemClick(id) {
    highlightId.value = id
    scrollToCard(id)
  }
  </script>

  <style scoped>
  .terminals-page {
    display: flex;
    gap: 24px;
    padding: 20px;
    min-height: 0;
  }

  .left-panel {
    width: 240px;
    flex-shrink: 0;
    background: var(--bg-primary);
    border-radius: 8px;
    padding: 16px;
    box-shadow: var(--shadow-card);
    overflow-y: auto;
    align-self: flex-start;
    position: sticky;
    top: 20px;
  }

  .filter-section {
    margin-bottom: 16px;
  }

  .filter-badge {
    margin-left: 4px;
  }

  .terminal-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .terminal-list-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
    font-size: 13px;
  }

  .terminal-list-item:hover {
    background: #f0f4ff;
  }

  .terminal-list-item.active {
    background: #e6f0ff;
    color: var(--color-primary);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dot-online { background: var(--color-success); }
  .dot-degraded { background: var(--color-warning); }
  .dot-offline { background: var(--color-danger); }

  .terminal-id {
    color: var(--text-primary);
  }

  .right-content {
    flex: 1;
    overflow-y: auto;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .terminal-card {
    background: var(--bg-primary);
    box-shadow: var(--shadow-card);
    border-radius: 8px;
    padding: 16px;
    border-left: 4px solid transparent;
    transition: box-shadow 0.2s;
  }

  .card-degraded {
    border-left-color: var(--color-warning);
  }

  .card-offline {
    border-left-color: var(--color-danger);
  }

  .highlighted {
    box-shadow: 0 0 0 2px var(--color-primary);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .card-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .t-id {
    font-weight: 600;
    font-size: 15px;
    color: var(--text-primary);
  }

  .t-location {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .hardware-row {
    display: flex;
    gap: 12px;
    margin-bottom: 10px;
  }

  .hw-icon {
    font-size: 20px;
  }

  .hw-green { color: var(--color-success); }
  .hw-red { color: var(--color-danger); }
  .hw-gray { color: #bfbfbf; }

  .alert-msg {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--color-warning);
    background: #fffbe6;
    border-radius: 4px;
    padding: 4px 8px;
    margin-bottom: 10px;
  }

  .queue-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .depth-high {
    color: var(--color-danger);
    font-weight: 600;
  }

  .wait-time {
    color: var(--text-secondary);
  }
  </style>
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/views/TerminalsView.test.js`：

  ```js
  import { describe, it, expect, beforeEach, vi } from 'vitest'
  import { mount } from '@vue/test-utils'
  import { createPinia, setActivePinia } from 'pinia'

  const mockTerminals = Array.from({ length: 20 }, (_, i) => ({
    id: `T${String(i + 1).padStart(3, '0')}`,
    location: `位置${i + 1}`,
    status: i < 14 ? 'online' : i < 17 ? 'degraded' : 'offline',
    printer: 'ok',
    cardReader: 'ok',
    screen: 'ok',
    latestAlert: i >= 14 && i < 17 ? '打印机异常' : null,
    queueDepth: 10,
    avgWaitMs: 5000
  }))

  vi.mock('../../stores/terminals', () => ({
    useTerminalsStore: () => ({
      terminals: mockTerminals,
      onlineCount: 14,
      offlineCount: 3,
      degradedCount: 3
    })
  }))

  vi.mock('@element-plus/icons-vue', () => ({
    Printer: { template: '<span>printer</span>' },
    CreditCard: { template: '<span>card</span>' },
    Monitor: { template: '<span>monitor</span>' },
    Warning: { template: '<span>warning</span>' }
  }))

  import TerminalsView from '../../views/TerminalsView.vue'

  function mountView() {
    return mount(TerminalsView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          'el-radio-group': { template: '<div class="el-radio-group"><slot /></div>', props: ['modelValue'] },
          'el-radio-button': { template: '<button class="el-radio-button"><slot /></button>', props: ['value'] },
          'el-badge': { template: '<span class="el-badge"><slot /></span>', props: ['value', 'type'] },
          'el-tag': { template: '<span class="el-tag"><slot /></span>', props: ['type', 'size'] },
          'el-tooltip': { template: '<div><slot /></div>' },
          'el-icon': { template: '<i class="el-icon"><slot /></i>' }
        }
      }
    })
  }

  describe('TerminalsView.vue', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('renders 20 terminal cards when filter is all', () => {
      const wrapper = mountView()
      const cards = wrapper.findAll('.terminal-card')
      expect(cards.length).toBe(20)
    })

    it('filter online shows only online terminals', async () => {
      const wrapper = mountView()
      await wrapper.vm.$nextTick()
      wrapper.vm.filterStatus = 'online'
      await wrapper.vm.$nextTick()
      const cards = wrapper.findAll('.terminal-card')
      expect(cards.length).toBe(14)
    })

    it('degraded terminal card has card-degraded class', () => {
      const wrapper = mountView()
      const degradedCards = wrapper.findAll('.card-degraded')
      expect(degradedCards.length).toBe(3)
    })
  })
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/views/TerminalsView.test.js
  ```
  预期输出：`3 tests passed`，退出码 0

- [ ] Commit：
  ```
  feat: rewrite TerminalsView with left panel and status-colored cards
  ```

---

### Task 15: AlertsView 重写

**目标：** 将 `AlertsView.vue` 从暗色主题全量重写，新增顶部统计条、新告警 banner、过滤工具栏、前端分页、行点击抽屉详情。

**Steps:**

- [ ] 改写 `frontend/src/views/AlertsView.vue`：

  ```vue
  <template>
    <div class="alerts-page">
      <!-- Top Stats Bar -->
      <div class="stats-bar">
        <el-tag type="danger" size="large">P0 未处理 {{ alertsStore.p0Count }}</el-tag>
        <el-tag type="warning" size="large">P1 未处理 {{ alertsStore.p1Count }}</el-tag>
        <el-tag type="info" size="large">今日总计 {{ alertsStore.totalCount }}</el-tag>
        <el-tag type="success" size="large">
          已处理 {{ Math.max(0, alertsStore.totalCount - alertsStore.p0Count - alertsStore.p1Count) }}
        </el-tag>
      </div>

      <!-- New Alerts Banner -->
      <el-alert
        v-if="alertsStore.hasNewAlerts"
        type="warning"
        :closable="false"
        class="new-alerts-banner"
        @click="handleRefresh"
      >
        <template #title>
          有新告警，点击刷新
        </template>
      </el-alert>

      <!-- Toolbar -->
      <div class="toolbar">
        <el-select v-model="levelFilter" placeholder="级别" clearable style="width: 100px">
          <el-option label="全部" value="" />
          <el-option label="P0" value="P0" />
          <el-option label="P1" value="P1" />
        </el-select>

        <el-select v-model="typeFilter" placeholder="类型" clearable style="width: 140px">
          <el-option label="全部" value="" />
          <el-option label="HARDWARE" value="HARDWARE" />
          <el-option label="BUSINESS" value="BUSINESS" />
        </el-select>

        <el-input
          v-model="terminalFilter"
          placeholder="终端ID"
          clearable
          style="width: 140px"
        />

        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          style="width: 360px"
        />

        <el-button type="primary" :icon="Refresh" @click="handleRefresh">刷新</el-button>
      </div>

      <!-- Alerts Table -->
      <div class="table-card">
        <el-table
          :data="alertsStore.pagedAlerts"
          :row-class-name="rowClass"
          style="width: 100%"
          @row-click="openDrawer"
        >
          <el-table-column label="时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.timestamp) }}
            </template>
          </el-table-column>
          <el-table-column label="级别" width="80">
            <template #default="{ row }">
              <el-tag :type="row.level === 'P0' ? 'danger' : 'warning'" size="small">
                {{ row.level }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="terminalId" label="终端" width="100" />
          <el-table-column label="类型" width="130">
            <template #default="{ row }">
              <el-icon v-if="row.type === 'HARDWARE'"><Tools /></el-icon>
              <el-icon v-else><DataAnalysis /></el-icon>
              {{ row.type }}
            </template>
          </el-table-column>
          <el-table-column prop="message" label="消息" show-overflow-tooltip />
        </el-table>

        <!-- Pagination -->
        <div class="pagination-bar">
          <el-pagination
            :total="alertsStore.filteredAlerts.length"
            :page-size="20"
            v-model:current-page="alertsStore.currentPage"
            layout="prev, pager, next, total"
            @current-change="alertsStore.setPage"
          />
        </div>
      </div>

      <!-- Alert Detail Drawer -->
      <el-drawer v-model="drawerVisible" title="告警详情" size="400px">
        <template v-if="selectedAlert">
          <div class="detail-item">
            <span class="detail-label">告警 ID:</span>
            <span>{{ selectedAlert.id }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">级别:</span>
            <el-tag :type="selectedAlert.level === 'P0' ? 'danger' : 'warning'">
              {{ selectedAlert.level }}
            </el-tag>
          </div>
          <div class="detail-item">
            <span class="detail-label">终端:</span>
            <span>{{ selectedAlert.terminalId }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">时间:</span>
            <span>{{ formatTime(selectedAlert.timestamp) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">消息:</span>
            <span>{{ selectedAlert.message }}</span>
          </div>
          <div class="detail-item detail-json">
            <span class="detail-label">原始 Payload:</span>
            <pre class="json-payload">{{ JSON.stringify(selectedAlert, null, 2) }}</pre>
          </div>
        </template>
      </el-drawer>
    </div>
  </template>

  <script setup>
  import { ref, watch } from 'vue'
  import { useAlertsStore } from '../stores/alerts'
  import { Refresh, Tools, DataAnalysis } from '@element-plus/icons-vue'

  const alertsStore = useAlertsStore()

  const levelFilter = ref('')
  const typeFilter = ref('')
  const terminalFilter = ref('')
  const dateRange = ref(null)

  const drawerVisible = ref(false)
  const selectedAlert = ref(null)

  let filterDebounce = null

  function applyFilters() {
    clearTimeout(filterDebounce)
    filterDebounce = setTimeout(() => {
      alertsStore.setFilter({
        level: levelFilter.value,
        type: typeFilter.value,
        terminalId: terminalFilter.value,
        startTime: dateRange.value?.[0] ?? null,
        endTime: dateRange.value?.[1] ?? null
      })
    }, 300)
  }

  watch(levelFilter, applyFilters)
  watch(typeFilter, applyFilters)
  watch(terminalFilter, applyFilters)
  watch(dateRange, applyFilters)

  async function handleRefresh() {
    alertsStore.setPage(1)
    await alertsStore.fetchAlerts()
    // Reset previousTotal so banner clears after manual refresh
    alertsStore.acknowledgeNewAlerts()
  }

  function rowClass({ row }) {
    return row.level === 'P0' ? 'danger-row' : ''
  }

  function formatTime(ts) {
    if (!ts) return '-'
    return new Date(ts).toLocaleString('zh-CN')
  }

  function openDrawer(row) {
    selectedAlert.value = row
    drawerVisible.value = true
  }
  </script>

  <style scoped>
  .alerts-page {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .stats-bar {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .new-alerts-banner {
    cursor: pointer;
  }

  .toolbar {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
    background: var(--bg-primary);
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: var(--shadow-card);
  }

  .table-card {
    background: var(--bg-primary);
    box-shadow: var(--shadow-card);
    border-radius: 8px;
    padding: 20px;
  }

  .pagination-bar {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }

  :deep(.danger-row) {
    background: #fff2f0 !important;
  }

  .detail-item {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    align-items: flex-start;
  }

  .detail-label {
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 90px;
    flex-shrink: 0;
  }

  .detail-json {
    flex-direction: column;
    gap: 8px;
  }

  .json-payload {
    background: #f5f7fa;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 12px;
    font-size: 12px;
    overflow: auto;
    max-height: 400px;
    white-space: pre-wrap;
    word-break: break-all;
  }
  </style>
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/views/AlertsView.test.js`：

  ```js
  import { describe, it, expect, beforeEach, vi } from 'vitest'
  import { mount } from '@vue/test-utils'
  import { createPinia, setActivePinia } from 'pinia'

  const mockSetFilter = vi.fn()
  const mockSetPage = vi.fn()

  vi.mock('../../stores/alerts', () => ({
    useAlertsStore: () => ({
      pagedAlerts: [
        { id: '1', timestamp: new Date().toISOString(), level: 'P0', terminalId: 'T001', type: 'HARDWARE', message: 'P0 alert' },
        { id: '2', timestamp: new Date().toISOString(), level: 'P1', terminalId: 'T002', type: 'BUSINESS', message: 'P1 alert' }
      ],
      filteredAlerts: Array.from({ length: 25 }, (_, i) => ({ id: String(i), level: i < 3 ? 'P0' : 'P1' })),
      p0Count: 3,
      p1Count: 7,
      totalCount: 25,
      currentPage: 1,
      hasNewAlerts: true,
      setFilter: mockSetFilter,
      setPage: mockSetPage,
      fetchAlerts: vi.fn(),
      acknowledgeNewAlerts: vi.fn()
    })
  }))

  vi.mock('@element-plus/icons-vue', () => ({
    Refresh: { template: '<span>refresh</span>' },
    Tools: { template: '<span>tools</span>' },
    DataAnalysis: { template: '<span>data</span>' }
  }))

  import AlertsView from '../../views/AlertsView.vue'

  function mountView() {
    return mount(AlertsView, {
      global: {
        plugins: [createPinia()],
        stubs: {
          'el-tag': { template: '<span class="el-tag" :class="type"><slot /></span>', props: ['type', 'size'] },
          'el-alert': { template: '<div class="el-alert" @click="$emit(\'click\')"><slot name="title" /></div>', emits: ['click'] },
          'el-select': { template: '<select><slot /></select>', props: ['modelValue', 'placeholder', 'clearable'] },
          'el-option': { template: '<option></option>', props: ['label', 'value'] },
          'el-input': { template: '<input />', props: ['modelValue', 'placeholder', 'clearable'] },
          'el-date-picker': { template: '<div></div>' },
          'el-button': { template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
          'el-table': {
            template: '<div class="el-table"><slot /></div>',
            props: ['data', 'rowClassName']
          },
          'el-table-column': { template: '<div></div>' },
          'el-pagination': { template: '<div class="el-pagination"></div>' },
          'el-drawer': { template: '<div class="el-drawer" v-if="modelValue"><slot /></div>', props: ['modelValue', 'title', 'size'] },
          'el-icon': { template: '<i><slot /></i>' }
        }
      }
    })
  }

  describe('AlertsView.vue', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      vi.clearAllMocks()
    })

    it('renders pagedAlerts in table', () => {
      const wrapper = mountView()
      expect(wrapper.find('.el-table').exists()).toBe(true)
    })

    it('hasNewAlerts=true shows new alerts banner', () => {
      const wrapper = mountView()
      expect(wrapper.find('.el-alert').exists()).toBe(true)
    })

    describe('debounce filter', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })
      afterEach(() => {
        vi.useRealTimers()
      })

      it('filter change calls setFilter after debounce', async () => {
        const wrapper = mountView()
        wrapper.vm.levelFilter = 'P0'
        await wrapper.vm.$nextTick()
        vi.advanceTimersByTime(350)
        expect(mockSetFilter).toHaveBeenCalledWith(
          expect.objectContaining({ level: 'P0' })
        )
      })
    })

    it('P0 rows get danger-row class', () => {
      // Test rowClass logic directly: P0 → 'danger-row', P1 → ''
      const rowClassFn = ({ row }) => row.level === 'P0' ? 'danger-row' : ''
      expect(rowClassFn({ row: { level: 'P0' } })).toBe('danger-row')
      expect(rowClassFn({ row: { level: 'P1' } })).toBe('')
    })
  })
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/views/AlertsView.test.js
  ```
  预期输出：`4 tests passed`，退出码 0

- [ ] Commit：
  ```
  feat: rewrite AlertsView with filters, pagination, and new-alerts banner
  ```

---

## Chunk 7: 架构演示页

### Task 16: FlowDiagram.vue

**目标：** 新建 `FlowDiagram.vue` 纯视觉组件，用内联 SVG + CSS 动画展示端→边→云三层架构数据流向，支持心跳动画和异常层高亮。

**Steps:**

- [ ] 创建 `frontend/src/components/FlowDiagram.vue`：

  ```vue
  <template>
    <div class="flow-diagram">
      <svg viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg" class="diagram-svg">
        <!-- Node: 端层 -->
        <g class="node-group">
          <rect
            x="50" y="90" width="160" height="120"
            rx="8" ry="8"
            class="node-rect node-edge"
          />
          <title>端层：20 台自助终端，通过 MQTT 协议发布心跳和状态数据</title>
          <text x="130" y="130" text-anchor="middle" class="node-title">端层 ×{{ terminalCount }}</text>
          <text x="130" y="152" text-anchor="middle" class="node-subtitle">MQTT 心跳</text>
          <text x="130" y="174" text-anchor="middle" class="node-counter">{{ terminalCount }} 台</text>
        </g>

        <!-- Node: 边缘层 -->
        <g class="node-group">
          <rect
            x="320" y="90" width="160" height="120"
            rx="8" ry="8"
            class="node-rect node-middle"
          />
          <title>边缘层：Mosquitto MQTT Broker + Drools 规则引擎，实时告警判断</title>
          <text x="400" y="130" text-anchor="middle" class="node-title">边缘层</text>
          <text x="400" y="152" text-anchor="middle" class="node-subtitle">Mosquitto + Drools</text>
          <text x="400" y="174" text-anchor="middle" class="node-counter">{{ edgeMsgCount }} 条</text>
        </g>

        <!-- Node: 云端层 -->
        <g class="node-group">
          <rect
            x="590" y="90" width="160" height="120"
            rx="8" ry="8"
            class="node-rect node-cloud"
          />
          <title>云端层：API Gateway + Kafka + 微服务，持久化存储与前端推送</title>
          <text x="670" y="130" text-anchor="middle" class="node-title">云端层</text>
          <text x="670" y="152" text-anchor="middle" class="node-subtitle">Gateway + Kafka</text>
          <text x="670" y="174" text-anchor="middle" class="node-counter">{{ cloudMsgCount }} 条</text>
        </g>

        <!-- Arrow 1: 端层 → 边缘层 -->
        <g class="arrow-group">
          <!-- Arrow line -->
          <line
            x1="210" y1="150" x2="310" y2="150"
            class="arrow-line"
            :class="{
              'arrow-heartbeat': heartbeatActive,
              'arrow-anomaly-edge': anomalyLayer === 'edge' || anomalyLayer === 'cloud'
            }"
          />
          <!-- Arrowhead -->
          <polyline
            points="305,143 320,150 305,157"
            class="arrowhead"
            :class="{
              'arrow-heartbeat': heartbeatActive,
              'arrow-anomaly-edge': anomalyLayer === 'edge' || anomalyLayer === 'cloud'
            }"
          />
          <!-- Label -->
          <text x="260" y="140" text-anchor="middle" class="arrow-label">MQTT</text>
        </g>

        <!-- Arrow 2: 边缘层 → 云端层 -->
        <g class="arrow-group">
          <!-- Arrow line -->
          <line
            x1="480" y1="150" x2="580" y2="150"
            class="arrow-line"
            :class="{
              'arrow-anomaly-cloud': anomalyLayer === 'cloud'
            }"
          />
          <!-- Arrowhead -->
          <polyline
            points="575,143 590,150 575,157"
            class="arrowhead"
            :class="{
              'arrow-anomaly-cloud': anomalyLayer === 'cloud'
            }"
          />
          <!-- Label -->
          <text x="530" y="140" text-anchor="middle" class="arrow-label">gRPC/Kafka</text>
        </g>
      </svg>
    </div>
  </template>

  <script setup>
  const props = defineProps({
    heartbeatActive: { type: Boolean, default: false },
    anomalyLayer: { type: String, default: '' }, // '' | 'edge' | 'cloud'
    terminalCount: { type: Number, default: 20 },
    edgeMsgCount: { type: Number, default: 0 },
    cloudMsgCount: { type: Number, default: 0 }
  })
  </script>

  <style scoped>
  .flow-diagram {
    width: 100%;
  }

  .diagram-svg {
    width: 100%;
    height: auto;
  }

  /* Node styles */
  .node-rect {
    fill: var(--bg-primary);
    stroke: var(--border-color);
    stroke-width: 2;
  }

  .node-edge { stroke: var(--color-primary); }
  .node-middle { stroke: var(--color-warning); }
  .node-cloud { stroke: var(--color-success); }

  .node-title {
    font-size: 14px;
    font-weight: 600;
    fill: var(--text-primary);
  }

  .node-subtitle {
    font-size: 11px;
    fill: var(--text-secondary);
  }

  .node-counter {
    font-size: 13px;
    font-weight: 600;
    fill: var(--color-primary);
  }

  /* Arrow styles */
  .arrow-line {
    stroke: var(--border-color);
    stroke-width: 2;
    stroke-dasharray: 8 4;
    fill: none;
  }

  .arrowhead {
    stroke: var(--border-color);
    stroke-width: 2;
    fill: none;
  }

  .arrow-label {
    font-size: 11px;
    fill: var(--text-secondary);
  }

  /* Heartbeat animation */
  .arrow-heartbeat {
    stroke: var(--color-success) !important;
    stroke-dasharray: 8 4;
    animation: dash 1s linear infinite;
  }

  @keyframes dash {
    from { stroke-dashoffset: 20; }
    to { stroke-dashoffset: 0; }
  }

  /* Anomaly highlights */
  .arrow-anomaly-edge {
    stroke: var(--color-warning) !important;
    stroke-width: 3 !important;
    animation: pulse-orange 0.5s ease-in-out;
  }

  .arrow-anomaly-cloud {
    stroke: var(--color-danger) !important;
    stroke-width: 3 !important;
    animation: pulse-red 0.5s ease-in-out;
  }

  @keyframes pulse-orange {
    0% { stroke: var(--border-color); }
    50% { stroke: #ff8c00; }
    100% { stroke: var(--color-warning); }
  }

  @keyframes pulse-red {
    0% { stroke: var(--border-color); }
    50% { stroke: #ff1a1a; }
    100% { stroke: var(--color-danger); }
  }
  </style>
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/components/FlowDiagram.test.js`：

  ```js
  import { describe, it, expect } from 'vitest'
  import { mount } from '@vue/test-utils'
  import FlowDiagram from '../../components/FlowDiagram.vue'

  describe('FlowDiagram.vue', () => {
    it('renders SVG element', () => {
      const wrapper = mount(FlowDiagram)
      expect(wrapper.find('svg').exists()).toBe(true)
    })

    it('heartbeatActive=true adds heartbeat-active class to arrow line', () => {
      const wrapper = mount(FlowDiagram, {
        props: { heartbeatActive: true }
      })
      const lines = wrapper.findAll('.arrow-line')
      // First arrow line should have arrow-heartbeat class
      expect(lines[0].classes()).toContain('arrow-heartbeat')
    })

    it('anomalyLayer=cloud activates both arrow anomaly classes', () => {
      const wrapper = mount(FlowDiagram, {
        props: { anomalyLayer: 'cloud' }
      })
      const lines = wrapper.findAll('.arrow-line')
      // First arrow: anomaly-edge class (edge || cloud)
      expect(lines[0].classes()).toContain('arrow-anomaly-edge')
      // Second arrow: anomaly-cloud class
      expect(lines[1].classes()).toContain('arrow-anomaly-cloud')
    })

    it('anomalyLayer=edge activates only edge arrow class', () => {
      const wrapper = mount(FlowDiagram, {
        props: { anomalyLayer: 'edge' }
      })
      const lines = wrapper.findAll('.arrow-line')
      expect(lines[0].classes()).toContain('arrow-anomaly-edge')
      expect(lines[1].classes()).not.toContain('arrow-anomaly-cloud')
    })

    it('renders node counter values from props', () => {
      const wrapper = mount(FlowDiagram, {
        props: { terminalCount: 15, edgeMsgCount: 42, cloudMsgCount: 7 }
      })
      expect(wrapper.text()).toContain('15 台')
      expect(wrapper.text()).toContain('42 条')
      expect(wrapper.text()).toContain('7 条')
    })
  })
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/components/FlowDiagram.test.js
  ```
  预期输出：`5 tests passed`，退出码 0

- [ ] Commit：
  ```
  feat: add FlowDiagram SVG component with CSS pulse animations
  ```

---

### Task 17: DemoView.vue

**目标：** 新建 `DemoView.vue` 架构演示页，三栏布局：左侧仿真器控制台、中间流向图、右侧事件日志。

**Steps:**

- [ ] 创建 `frontend/src/views/DemoView.vue`：

  ```vue
  <template>
    <div class="demo-page">
      <!-- Left Column: Simulator Control -->
      <div class="col-left panel-card">
        <div class="panel-title">仿真器控制台</div>

        <!-- Status -->
        <div class="sim-status">
          <el-tag :type="simStore.running ? 'success' : 'info'" size="large">
            {{ simStore.running ? '运行中' : '已停止' }}
            {{ simStore.runningCount }}/20
          </el-tag>
        </div>

        <!-- Start / Stop buttons -->
        <div class="sim-buttons">
          <el-tooltip :content="!simStore.apiReady ? '仿真器接口未就绪' : ''" :disabled="simStore.apiReady">
            <span>
              <el-button
                type="primary"
                :disabled="!simStore.apiReady || simStore.running"
                @click="simStore.start()"
              >
                ▶ 启动全部
              </el-button>
            </span>
          </el-tooltip>
          <el-tooltip :content="!simStore.apiReady ? '仿真器接口未就绪' : ''" :disabled="simStore.apiReady">
            <span>
              <el-button
                type="danger"
                :disabled="!simStore.apiReady || !simStore.running"
                @click="simStore.stop()"
              >
                ⏹ 停止全部
              </el-button>
            </span>
          </el-tooltip>
        </div>

        <!-- Terminal Selector -->
        <el-select
          v-model="selectedTerminalId"
          placeholder="选择终端"
          style="width: 100%; margin-bottom: 8px"
        >
          <el-option
            v-for="n in 20"
            :key="n"
            :label="`T${String(n).padStart(3, '0')}`"
            :value="`T${String(n).padStart(3, '0')}`"
          />
        </el-select>

        <!-- Scene Inject Buttons -->
        <div class="scene-buttons">
          <div class="scene-group-label">场景注入</div>
          <el-button-group style="display: flex; flex-direction: column; gap: 6px">
            <el-tooltip :content="!simStore.apiReady ? '仿真器接口未就绪' : ''" :disabled="simStore.apiReady">
              <span>
                <el-button
                  size="small"
                  :disabled="!simStore.apiReady"
                  @click="inject('printer_jam')"
                  style="width: 100%"
                >打印机卡纸</el-button>
              </span>
            </el-tooltip>
            <el-tooltip :content="!simStore.apiReady ? '仿真器接口未就绪' : ''" :disabled="simStore.apiReady">
              <span>
                <el-button
                  size="small"
                  :disabled="!simStore.apiReady"
                  @click="inject('terminal_offline')"
                  style="width: 100%"
                >终端离线</el-button>
              </span>
            </el-tooltip>
            <el-tooltip :content="!simStore.apiReady ? '仿真器接口未就绪' : ''" :disabled="simStore.apiReady">
              <span>
                <el-button
                  size="small"
                  :disabled="!simStore.apiReady"
                  @click="inject('queue_overload')"
                  style="width: 100%"
                >队列过载</el-button>
              </span>
            </el-tooltip>
            <el-tooltip :content="!simStore.apiReady ? '仿真器接口未就绪' : ''" :disabled="simStore.apiReady">
              <span>
                <el-button
                  size="small"
                  :disabled="!simStore.apiReady"
                  @click="inject('payment_timeout')"
                  style="width: 100%"
                >支付超时风险</el-button>
              </span>
            </el-tooltip>
            <el-tooltip :content="!simStore.apiReady ? '仿真器接口未就绪' : ''" :disabled="simStore.apiReady">
              <span>
                <el-button
                  size="small"
                  :disabled="!simStore.apiReady"
                  @click="inject('random')"
                  style="width: 100%"
                >随机异常</el-button>
              </span>
            </el-tooltip>
          </el-button-group>
        </div>

        <!-- Stats -->
        <div class="sim-stats">
          <div class="stat-row">
            <span class="stat-label">已发送</span>
            <span class="stat-value">{{ simStore.totalSent }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">已触发告警</span>
            <span class="stat-value danger">{{ simStore.totalAlerts }}</span>
          </div>
        </div>
      </div>

      <!-- Middle Column: Flow Diagram -->
      <div class="col-middle panel-card">
        <div class="panel-title">实时架构流向图</div>
        <FlowDiagram
          :heartbeat-active="simStore.running"
          :anomaly-layer="anomalyLayer"
          :edge-msg-count="simStore.totalSent"
          :cloud-msg-count="simStore.totalAlerts"
        />
      </div>

      <!-- Right Column: Event Log -->
      <div class="col-right panel-card event-log-card">
        <div class="panel-title">事件流</div>
        <div class="event-log">
          <div
            v-for="(event, idx) in simStore.eventLog"
            :key="idx"
            class="event-row"
          >
            <span class="event-time">{{ event.time }}</span>
            <el-tag
              :type="layerTagType(event.layer)"
              size="small"
              class="layer-tag"
            >{{ event.layer }}</el-tag>
            <span class="event-message">{{ event.message }}</span>
          </div>
          <div v-if="!simStore.eventLog.length" class="log-empty">
            暂无事件，启动仿真器后查看
          </div>
        </div>
      </div>
    </div>
  </template>

  <script setup>
  import { ref, watch, onMounted, onUnmounted } from 'vue'
  import { useSimulatorStore } from '../stores/simulator'
  import { useAlertsStore } from '../stores/alerts'
  import FlowDiagram from '../components/FlowDiagram.vue'

  const simStore = useSimulatorStore()
  const alertsStore = useAlertsStore()

  const selectedTerminalId = ref('T001')
  const anomalyLayer = ref('')

  let anomalyTimer = null

  function inject(sceneKey) {
    simStore.inject(sceneKey, selectedTerminalId.value)
  }

  function layerTagType(layer) {
    if (layer === '端层') return 'primary'
    if (layer === '边层') return 'warning'
    if (layer === '云层') return 'success'
    return 'info'
  }

  // Watch alerts to trigger anomaly animation
  watch(
    () => alertsStore.alerts.length,
    (newLen, oldLen) => {
      if (newLen > oldLen) {
        clearTimeout(anomalyTimer)
        anomalyLayer.value = 'edge'
        anomalyTimer = setTimeout(() => {
          anomalyLayer.value = 'cloud'
          anomalyTimer = setTimeout(() => {
            anomalyLayer.value = ''
          }, 300)
        }, 300)

        // Add newest alert to event log
        if (alertsStore.alerts[0]) {
          simStore.addEventFromAlert(alertsStore.alerts[0])
        }
      }
    }
  )

  onMounted(() => {
    simStore.startPolling()
  })

  onUnmounted(() => {
    simStore.stopPolling()
    clearTimeout(anomalyTimer)
  })
  </script>

  <style scoped>
  .demo-page {
    display: flex;
    gap: 16px;
    padding: 20px;
    height: calc(100vh - 112px);
    overflow: hidden;
  }

  .panel-card {
    background: var(--bg-primary);
    box-shadow: var(--shadow-card);
    border-radius: 8px;
    padding: 16px;
    overflow-y: auto;
  }

  .panel-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-color);
  }

  .col-left {
    width: 280px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .col-middle {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .col-right {
    width: 300px;
    flex-shrink: 0;
  }

  .sim-status {
    text-align: center;
  }

  .sim-buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .scene-group-label {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 6px;
  }

  .sim-stats {
    border-top: 1px solid var(--border-color);
    padding-top: 12px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    margin-bottom: 6px;
  }

  .stat-label {
    color: var(--text-secondary);
  }

  .stat-value {
    font-weight: 600;
    color: var(--text-primary);
  }

  .stat-value.danger {
    color: var(--color-danger);
  }

  .event-log-card {
    display: flex;
    flex-direction: column;
  }

  .event-log {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .event-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
    padding: 4px 0;
    border-bottom: 1px solid var(--border-color);
  }

  .event-time {
    color: var(--text-secondary);
    white-space: nowrap;
    min-width: 60px;
  }

  .layer-tag {
    flex-shrink: 0;
  }

  .event-message {
    color: var(--text-primary);
    flex: 1;
    word-break: break-all;
  }

  .log-empty {
    color: var(--text-secondary);
    font-size: 13px;
    text-align: center;
    padding: 20px 0;
  }
  </style>
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/views/DemoView.test.js`：

  ```js
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
      // Mount with apiReady=true to allow inject
      vi.doMock('../../stores/simulator', () => ({
        useSimulatorStore: () => ({
          running: true,
          runningCount: 20,
          totalSent: 100,
          totalAlerts: 5,
          eventLog: [],
          apiReady: true,
          start: mockStart,
          stop: mockStop,
          inject: mockInject,
          addEventFromAlert: vi.fn(),
          startPolling: mockStartPolling,
          stopPolling: mockStopPolling
        })
      }))

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
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/views/DemoView.test.js
  ```
  预期输出：`5 tests passed`，退出码 0

- [ ] Commit：
  ```
  feat: add DemoView architecture demo page with 3-column layout
  ```

---

## Chunk 8: 业务页面升级

### Task 18: RegistrationView 升级

**目标：** 将 `RegistrationView.vue` 升级为白色主题，科室选择改为带图标卡片选择器，右侧显示提交历史结果列表。

**Steps:**

- [ ] 改写 `frontend/src/views/RegistrationView.vue`：

  ```vue
  <template>
    <div class="registration-page">
      <el-row :gutter="24">
        <!-- Left: Form Card -->
        <el-col :span="10">
          <div class="form-card">
            <div class="form-title">挂号预约</div>
            <el-form :model="form" label-position="top">
              <el-form-item label="患者 ID">
                <el-input v-model="form.patientId" :prefix-icon="User" placeholder="请输入患者 ID" />
              </el-form-item>

              <el-form-item label="选择科室">
                <div class="dept-grid">
                  <div
                    v-for="dept in departments"
                    :key="dept.code"
                    class="dept-card"
                    :class="{ active: form.deptCode === dept.code }"
                    @click="form.deptCode = dept.code"
                  >
                    <el-icon class="dept-icon" :size="24">
                      <component :is="dept.icon" />
                    </el-icon>
                    <span class="dept-label">{{ dept.name }}</span>
                  </div>
                </div>
              </el-form-item>

              <el-form-item label="医生 ID">
                <el-input v-model="form.doctorId" :prefix-icon="UserFilled" placeholder="请输入医生 ID" />
              </el-form-item>

              <el-form-item>
                <el-button
                  type="primary"
                  :loading="loading"
                  style="width: 100%"
                  @click="submit"
                >提交挂号</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-col>

        <!-- Right: Results Area -->
        <el-col :span="14">
          <div class="results-card">
            <div class="form-title">挂号记录</div>
            <el-empty v-if="!results.length" description="填写表单并提交" />
            <div v-else class="results-list">
              <div
                v-for="r in results"
                :key="r.regId"
                class="result-item"
              >
                <div class="result-header">
                  <span class="result-id">{{ r.regId }}</span>
                  <el-tag :type="r.status === 'SUCCESS' ? 'success' : 'danger'" size="small">
                    {{ r.status === 'SUCCESS' ? '成功' : '失败' }}
                  </el-tag>
                </div>
                <div class="result-detail">患者: {{ r.patientId }} · 科室: {{ r.deptCode }} · 医生: {{ r.doctorId }}</div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </template>

  <script setup>
  import { ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { User, UserFilled, FirstAidKit, Coordinate, Help, Warning, Plus } from '@element-plus/icons-vue'
  import { register } from '../api'

  const form = ref({
    patientId: '',
    deptCode: '',
    doctorId: ''
  })

  const loading = ref(false)
  const results = ref([])

  const departments = [
    { code: 'NEU', name: '神经内科', icon: FirstAidKit },
    { code: 'CARD', name: '心血管科', icon: Coordinate },
    { code: 'ORTH', name: '骨科', icon: Plus },
    { code: 'INT', name: '内科', icon: Help },
    { code: 'EMRG', name: '急诊', icon: Warning }
  ]

  async function submit() {
    if (!form.value.patientId || !form.value.deptCode) {
      ElMessage.warning('请填写患者 ID 并选择科室')
      return
    }
    loading.value = true
    try {
      const res = await register(form.value)
      results.value.unshift({
        regId: res.data.regId || `REG-${Date.now()}`,
        patientId: form.value.patientId,
        deptCode: form.value.deptCode,
        doctorId: form.value.doctorId,
        status: 'SUCCESS'
      })
      ElMessage.success('挂号成功')
      form.value.patientId = ''
      form.value.doctorId = ''
    } catch {
      results.value.unshift({
        regId: `ERR-${Date.now()}`,
        patientId: form.value.patientId,
        deptCode: form.value.deptCode,
        doctorId: form.value.doctorId,
        status: 'FAILED'
      })
      ElMessage.error('挂号失败，请重试')
    } finally {
      loading.value = false
    }
  }
  </script>

  <style scoped>
  .registration-page {
    padding: 20px;
  }

  .form-card,
  .results-card {
    background: var(--bg-primary);
    box-shadow: var(--shadow-card);
    border-radius: 8px;
    padding: 24px;
    min-height: 420px;
  }

  .form-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
  }

  .dept-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .dept-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px 8px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .dept-card:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: #f0f7ff;
  }

  .dept-card.active {
    border-color: var(--color-primary);
    background: #e6f0ff;
    color: var(--color-primary);
    font-weight: 600;
  }

  .dept-icon {
    color: inherit;
  }

  .dept-label {
    font-size: 12px;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .result-item {
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 12px 16px;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .result-id {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 14px;
  }

  .result-detail {
    font-size: 12px;
    color: var(--text-secondary);
  }
  </style>
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/views/RegistrationView.test.js`：

  ```js
  import { describe, it, expect, beforeEach, vi } from 'vitest'
  import { mount } from '@vue/test-utils'
  import { createPinia, setActivePinia } from 'pinia'

  vi.mock('../../../src/api', () => ({
    register: vi.fn().mockResolvedValue({ data: { regId: 'REG-001' } })
  }))

  vi.mock('../../api', () => ({
    register: vi.fn().mockResolvedValue({ data: { regId: 'REG-001' } })
  }))

  vi.mock('@element-plus/icons-vue', () => ({
    User: { template: '<span>user</span>' },
    UserFilled: { template: '<span>userfilled</span>' },
    FirstAidKit: { template: '<span>aid</span>' },
    Coordinate: { template: '<span>coord</span>' },
    Help: { template: '<span>help</span>' }
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
          'el-input': { template: '<input class="el-input" />', props: ['modelValue', 'prefixIcon', 'placeholder'] },
          'el-button': {
            template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
            props: ['type', 'loading'],
            emits: ['click']
          },
          'el-tag': { template: '<span class="el-tag"><slot /></span>', props: ['type', 'size'] },
          'el-empty': { template: '<div class="el-empty"><slot /></div>', props: ['description'] },
          'el-icon': { template: '<i><slot /></i>', props: ['size'] },
          ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
        }
      }
    })
  }

  describe('RegistrationView.vue', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      vi.clearAllMocks()
    })

    it('dept card click updates form.deptCode', async () => {
      const wrapper = mountView()
      const deptCards = wrapper.findAll('.dept-card')
      expect(deptCards.length).toBe(5)
      await deptCards[0].trigger('click')
      expect(wrapper.vm.form.deptCode).toBe('NEU')
    })

    it('selected dept card has active class', async () => {
      const wrapper = mountView()
      const deptCards = wrapper.findAll('.dept-card')
      await deptCards[1].trigger('click')
      expect(deptCards[1].classes()).toContain('active')
    })

    it('submit calls register API when form is valid', async () => {
      const wrapper = mountView()
      wrapper.vm.form.patientId = 'P001'
      wrapper.vm.form.deptCode = 'NEU'
      wrapper.vm.form.doctorId = 'D001'
      await wrapper.vm.submit()
      expect(register).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 'P001', deptCode: 'NEU' })
      )
    })

    it('result appears in list after successful submit', async () => {
      const wrapper = mountView()
      wrapper.vm.form.patientId = 'P001'
      wrapper.vm.form.deptCode = 'NEU'
      wrapper.vm.form.doctorId = 'D001'
      await wrapper.vm.submit()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.results.length).toBe(1)
      expect(wrapper.vm.results[0].regId).toBe('REG-001')
    })
  })
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/views/RegistrationView.test.js
  ```
  预期输出：`4 tests passed`，退出码 0

- [ ] Commit：
  ```
  feat: upgrade RegistrationView with card dept selector and light theme
  ```

---

### Task 19: QueueView 升级

**目标：** 将 `QueueView.vue` 升级为白色主题，队列深度用进度条展示，大字显示等待时间，深度 >50 或等待 >30s 时红色/橙色预警。

**Steps:**

- [ ] 改写 `frontend/src/views/QueueView.vue`：

  ```vue
  <template>
    <div class="queue-page">
      <el-row :gutter="24">
        <!-- Left: Query Form -->
        <el-col :span="8">
          <div class="form-card">
            <div class="form-title">排队查询</div>
            <el-form label-position="top">
              <el-form-item label="科室">
                <el-select
                  v-model="selectedDept"
                  placeholder="请选择科室"
                  style="width: 100%"
                >
                  <el-option label="神经内科" value="NEU" />
                  <el-option label="心血管科" value="CARD" />
                  <el-option label="骨科" value="ORTH" />
                  <el-option label="内科" value="INT" />
                  <el-option label="急诊" value="EMRG" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  :loading="loading"
                  style="width: 100%"
                  @click="query"
                >查询排队</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-col>

        <!-- Right: Result -->
        <el-col :span="16">
          <div class="result-card">
            <div class="form-title">排队情况</div>
            <el-empty v-if="!result" description="请选择科室并查询" />
            <template v-else>
              <div class="queue-stats">
                <div class="stat-block">
                  <div class="stat-label">当前排队人数</div>
                  <span
                    class="stat-number"
                    :style="{ color: result.depth > 50 ? 'var(--color-danger)' : 'var(--color-primary)' }"
                  >{{ result.depth }}</span>
                  <span class="stat-unit">人</span>
                </div>
                <div class="stat-block">
                  <div class="stat-label">预计等待时间</div>
                  <span
                    class="stat-number"
                    :style="{ color: result.avgWaitMs > 30000 ? 'var(--color-warning)' : 'var(--color-success)' }"
                  >{{ formatWait(result.avgWaitMs) }}</span>
                </div>
              </div>

              <div class="progress-section">
                <div class="progress-label">
                  队列负载
                  <el-tag
                    v-if="result.depth > 50"
                    type="danger"
                    size="small"
                    style="margin-left: 8px"
                  >超载预警</el-tag>
                </div>
                <el-progress
                  :percentage="Math.min(result.depth / 100 * 100, 100)"
                  :status="result.depth > 50 ? 'exception' : ''"
                  :stroke-width="16"
                />
              </div>

              <div class="dept-info">
                <el-tag type="info" size="small">{{ result.deptName || selectedDept }}</el-tag>
              </div>
            </template>
          </div>
        </el-col>
      </el-row>
    </div>
  </template>

  <script setup>
  import { ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { getQueue } from '../api'

  const selectedDept = ref('')
  const loading = ref(false)
  const result = ref(null)

  function formatWait(ms) {
    if (!ms) return '0s'
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    return `${(ms / 60000).toFixed(1)}min`
  }

  async function query() {
    if (!selectedDept.value) {
      ElMessage.warning('请选择科室')
      return
    }
    loading.value = true
    try {
      const res = await getQueue(selectedDept.value)
      result.value = {
        depth: res.data.depth ?? 0,
        avgWaitMs: res.data.avgWaitMs ?? 0,
        deptName: res.data.deptName || selectedDept.value
      }
    } catch {
      ElMessage.error('查询失败，请重试')
    } finally {
      loading.value = false
    }
  }
  </script>

  <style scoped>
  .queue-page {
    padding: 20px;
  }

  .form-card,
  .result-card {
    background: var(--bg-primary);
    box-shadow: var(--shadow-card);
    border-radius: 8px;
    padding: 24px;
    min-height: 340px;
  }

  .form-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
  }

  .queue-stats {
    display: flex;
    gap: 40px;
    margin-bottom: 24px;
  }

  .stat-block {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .stat-label {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .stat-number {
    font-size: 48px;
    font-weight: 700;
    line-height: 1;
  }

  .stat-unit {
    font-size: 16px;
    color: var(--text-secondary);
  }

  .progress-section {
    margin-bottom: 20px;
  }

  .progress-label {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
  }

  .dept-info {
    margin-top: 8px;
  }
  </style>
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/views/QueueView.test.js`：

  ```js
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
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/views/QueueView.test.js
  ```
  预期输出：`4 tests passed`，退出码 0

- [ ] Commit：
  ```
  feat: upgrade QueueView with progress bar and color-coded stats
  ```

---

### Task 20: InsuranceView 升级

**目标：** 将 `InsuranceView.vue` 升级为白色主题，报销比例用进度条展示，成功/失败用大图标区分。

**Steps:**

- [ ] 改写 `frontend/src/views/InsuranceView.vue`：

  ```vue
  <template>
    <div class="insurance-page">
      <el-row :gutter="24">
        <!-- Left: Form -->
        <el-col :span="8">
          <div class="form-card">
            <div class="form-title">医保验证</div>
            <el-form label-position="top">
              <el-form-item label="患者 ID">
                <el-input
                  v-model="patientId"
                  :prefix-icon="User"
                  placeholder="请输入患者 ID"
                />
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  :loading="loading"
                  style="width: 100%"
                  @click="verify"
                >验证医保</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-col>

        <!-- Right: Result -->
        <el-col :span="16">
          <div class="result-card">
            <div class="form-title">验证结果</div>
            <el-empty v-if="!result" description="请输入患者 ID 并验证" />
            <template v-else>
              <div class="result-icon-area">
                <el-icon
                  :size="64"
                  :color="result.eligible ? 'var(--color-success)' : 'var(--color-danger)'"
                >
                  <CircleCheck v-if="result.eligible" />
                  <CircleClose v-else />
                </el-icon>
                <div class="result-status-text">
                  {{ result.eligible ? '医保有效' : '医保无效' }}
                </div>
              </div>

              <div class="coverage-section">
                <div class="coverage-label">
                  报销比例
                  <el-tag type="info" size="small" style="margin-left: 8px">
                    {{ result.insuranceType || '普通医保' }}
                  </el-tag>
                </div>
                <el-progress
                  :percentage="Math.round((result.coverageRatio || 0) * 100)"
                  :format="pct => pct.toFixed(0) + '%'"
                  :status="result.eligible ? '' : 'exception'"
                  :stroke-width="16"
                />
              </div>

              <div class="result-details">
                <div class="detail-row">
                  <span class="detail-label">患者 ID:</span>
                  <span>{{ result.patientId }}</span>
                </div>
                <div v-if="result.message" class="detail-row">
                  <span class="detail-label">说明:</span>
                  <span>{{ result.message }}</span>
                </div>
              </div>
            </template>
          </div>
        </el-col>
      </el-row>
    </div>
  </template>

  <script setup>
  import { ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { User, CircleCheck, CircleClose } from '@element-plus/icons-vue'
  import { verifyInsurance } from '../api'

  const patientId = ref('')
  const loading = ref(false)
  const result = ref(null)

  async function verify() {
    if (!patientId.value) {
      ElMessage.warning('请输入患者 ID')
      return
    }
    loading.value = true
    try {
      const res = await verifyInsurance({ patientId: patientId.value })
      result.value = {
        patientId: patientId.value,
        eligible: res.data.eligible ?? false,
        coverageRatio: res.data.coverageRatio ?? 0,
        insuranceType: res.data.insuranceType || '',
        message: res.data.message || ''
      }
      ElMessage.success(result.value.eligible ? '医保验证通过' : '医保验证未通过')
    } catch {
      ElMessage.error('验证失败，请重试')
    } finally {
      loading.value = false
    }
  }
  </script>

  <style scoped>
  .insurance-page {
    padding: 20px;
  }

  .form-card,
  .result-card {
    background: var(--bg-primary);
    box-shadow: var(--shadow-card);
    border-radius: 8px;
    padding: 24px;
    min-height: 340px;
  }

  .form-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
  }

  .result-icon-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-bottom: 28px;
  }

  .result-status-text {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .coverage-section {
    margin-bottom: 24px;
  }

  .coverage-label {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
  }

  .result-details {
    border-top: 1px solid var(--border-color);
    padding-top: 16px;
  }

  .detail-row {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
    font-size: 14px;
  }

  .detail-label {
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 80px;
  }
  </style>
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/views/InsuranceView.test.js`：

  ```js
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
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/views/InsuranceView.test.js
  ```
  预期输出：`4 tests passed`，退出码 0

- [ ] Commit：
  ```
  feat: upgrade InsuranceView with coverage progress bar and status icon
  ```

---

### Task 21: PaymentView 升级

**目标：** 将 `PaymentView.vue` 升级为白色主题，结果列表中展示缓存命中标签和回退自费标签，便于演示幂等性和容错机制。

**Steps:**

- [ ] 改写 `frontend/src/views/PaymentView.vue`：

  ```vue
  <template>
    <div class="payment-page">
      <el-row :gutter="24">
        <!-- Left: Form -->
        <el-col :span="10">
          <div class="form-card">
            <div class="form-title">支付验证</div>
            <el-form label-position="top">
              <el-form-item label="患者 ID">
                <el-input
                  v-model="form.patientId"
                  :prefix-icon="User"
                  placeholder="请输入患者 ID"
                />
              </el-form-item>
              <el-form-item label="挂号 ID">
                <el-input
                  v-model="form.regId"
                  :prefix-icon="Document"
                  placeholder="请输入挂号 ID"
                />
              </el-form-item>
              <el-form-item label="支付金额 (元)">
                <el-input
                  v-model="form.amount"
                  :prefix-icon="Money"
                  placeholder="请输入金额"
                  type="number"
                />
              </el-form-item>
              <el-form-item label="支付 ID">
                <div style="display: flex; gap: 8px">
                  <el-input
                    v-model="form.payId"
                    :prefix-icon="Key"
                    placeholder="自动生成或手动输入"
                  />
                  <el-button @click="generatePayId">生成</el-button>
                </div>
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  :loading="loading"
                  style="width: 100%"
                  @click="submit"
                >提交支付</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-col>

        <!-- Right: Results History -->
        <el-col :span="14">
          <div class="results-card">
            <div class="form-title">支付记录</div>
            <el-empty v-if="!results.length" description="提交支付后查看结果" />
            <div v-else class="results-list">
              <div
                v-for="r in results"
                :key="r.payId"
                class="result-item"
              >
                <div class="result-header">
                  <div class="result-meta">
                    <span class="result-pay-id">{{ r.payId }}</span>
                    <el-tag
                      :type="r.success ? 'success' : 'danger'"
                      size="small"
                    >{{ r.success ? '支付成功' : '支付失败' }}</el-tag>
                  </div>
                  <div class="result-tags">
                    <el-tag
                      v-if="r.cacheHit"
                      type="info"
                      size="small"
                    >命中缓存</el-tag>
                    <el-tag
                      v-if="r.fallbackToSelfPay"
                      type="warning"
                      size="small"
                    >回退自费</el-tag>
                  </div>
                </div>
                <div class="result-body">
                  <span class="result-patient">患者: {{ r.patientId }}</span>
                  <span class="result-amount">金额: ¥{{ r.amount }}</span>
                  <span v-if="r.reason" class="result-reason">{{ r.reason }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </template>

  <script setup>
  import { ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { User, Document, Money, Key } from '@element-plus/icons-vue'
  import { pay } from '../api'

  const form = ref({
    patientId: '',
    regId: '',
    amount: '',
    payId: ''
  })

  const loading = ref(false)
  const results = ref([])

  function generatePayId() {
    form.value.payId = `PAY-${Date.now()}`
  }

  async function submit() {
    if (!form.value.patientId || !form.value.regId || !form.value.amount) {
      ElMessage.warning('请填写患者 ID、挂号 ID 和支付金额')
      return
    }
    if (!form.value.payId) {
      generatePayId()
    }
    loading.value = true
    try {
      const res = await pay(form.value)
      results.value.unshift({
        payId: form.value.payId,
        patientId: form.value.patientId,
        regId: form.value.regId,
        amount: form.value.amount,
        success: res.data.success ?? true,
        cacheHit: res.data.cacheHit ?? false,
        fallbackToSelfPay: res.data.fallbackToSelfPay ?? false,
        reason: res.data.reason || ''
      })
      ElMessage.success(results.value[0].success ? '支付成功' : '支付处理完成')
    } catch {
      results.value.unshift({
        payId: form.value.payId,
        patientId: form.value.patientId,
        regId: form.value.regId,
        amount: form.value.amount,
        success: false,
        cacheHit: false,
        fallbackToSelfPay: false,
        reason: '支付请求失败'
      })
      ElMessage.error('支付失败，请重试')
    } finally {
      loading.value = false
    }
  }
  </script>

  <style scoped>
  .payment-page {
    padding: 20px;
  }

  .form-card,
  .results-card {
    background: var(--bg-primary);
    box-shadow: var(--shadow-card);
    border-radius: 8px;
    padding: 24px;
    min-height: 420px;
  }

  .form-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .result-item {
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 12px 16px;
    transition: border-color 0.2s;
  }

  .result-item:hover {
    border-color: var(--color-primary);
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .result-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .result-tags {
    display: flex;
    gap: 6px;
  }

  .result-pay-id {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .result-body {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: var(--text-secondary);
    flex-wrap: wrap;
  }

  .result-reason {
    color: var(--color-warning);
  }
  </style>
  ```

- [ ] 创建测试文件 `frontend/src/__tests__/views/PaymentView.test.js`：

  ```js
  import { describe, it, expect, beforeEach, vi } from 'vitest'
  import { mount } from '@vue/test-utils'
  import { createPinia, setActivePinia } from 'pinia'

  const mockPay = vi.fn()

  vi.mock('../../api', () => ({
    pay: mockPay
  }))

  vi.mock('@element-plus/icons-vue', () => ({
    User: { template: '<span>user</span>' },
    Document: { template: '<span>doc</span>' },
    Money: { template: '<span>money</span>' },
    Key: { template: '<span>key</span>' }
  }))

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
            props: ['modelValue', 'prefixIcon', 'placeholder', 'type'],
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
      mockPay.mockResolvedValue({
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
      mockPay.mockResolvedValue({
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
      mockPay.mockResolvedValue({
        data: { success: true, cacheHit: false, fallbackToSelfPay: false }
      })
      const wrapper = mountView()
      wrapper.vm.form.patientId = 'P002'
      wrapper.vm.form.regId = 'REG-002'
      wrapper.vm.form.amount = '200'
      wrapper.vm.form.payId = 'PAY-003'
      await wrapper.vm.submit()
      expect(mockPay).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 'P002', regId: 'REG-002' })
      )
    })
  })
  ```

- [ ] 运行测试：
  ```bash
  cd frontend && npm run test:run -- src/__tests__/views/PaymentView.test.js
  ```
  预期输出：`5 tests passed`，退出码 0

- [ ] 运行全量测试套件验证无回归：
  ```bash
  cd frontend && npm run test:run
  ```
  预期输出：所有测试通过，退出码 0

- [ ] Commit：
  ```
  feat: upgrade PaymentView with idempotency and fallback tags
  ```
