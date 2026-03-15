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
import { User, Lock, View, Hide, Monitor } from '@element-plus/icons-vue'
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
  const valid = await formRef.value?.validate?.().catch(() => false) ?? true
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
