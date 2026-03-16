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
import { Monitor } from '@element-plus/icons-vue'
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
