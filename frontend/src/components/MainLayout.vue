<template>
  <div class="shell-layout">
    <aside class="shell-sidebar">
      <div class="brand-block">
        <el-icon size="22" color="var(--color-primary)"><Monitor /></el-icon>
        <div class="brand-text">
          <div class="brand-title">WellNest 医疗监控</div>
          <div class="brand-sub">云边端终端中心</div>
        </div>
      </div>
      <div class="nav-group-title">监控域</div>
      <div class="nav-list">
        <button class="nav-item" :class="{ active: activeMenu==='dashboard' }" @click="handleMenuSelect('dashboard')">总览</button>
        <button class="nav-item" :class="{ active: activeMenu==='terminals' }" @click="handleMenuSelect('terminals')">终端监控</button>
        <button class="nav-item" :class="{ active: activeMenu==='alerts' }" @click="handleMenuSelect('alerts')">
          告警中心
          <span v-if="alertsStore.p0Count" class="badge danger">{{ alertsStore.p0Count }}</span>
        </button>
        <button class="nav-item" :class="{ active: activeMenu==='terminal-side' }" @click="handleMenuSelect('terminal-side')">终端侧</button>
        <button class="nav-item" :class="{ active: activeMenu==='edge-side' }" @click="handleMenuSelect('edge-side')">边端侧</button>
      </div>
      <div class="nav-group-title">云端</div>
      <div class="nav-list">
        <button class="nav-item" :class="{ active: activeMenu==='cloud-side' }" @click="handleMenuSelect('cloud-side')">☁ 云端大屏</button>
        <button class="nav-item" :class="{ active: activeMenu==='cloud-ops' }" @click="handleMenuSelect('cloud-ops')">⚙ 运维控制台</button>
      </div>
    </aside>

    <section class="shell-main">
      <header class="shell-topbar">
        <div>
          <div class="top-title">{{ pageTitles[activeMenu] || '系统总览' }}</div>
          <div class="top-sub">实时监测 · 告警联动 · 医疗业务可视化</div>
        </div>
        <div class="top-right">
          <span class="badge danger" v-if="alertsStore.p0Count">P0 {{ alertsStore.p0Count }}</span>
          <span class="badge warning" v-if="alertsStore.p1Count">P1 {{ alertsStore.p1Count }}</span>
          <span class="username">{{ authStore.user?.name || '值班管理员' }}</span>
          <el-button type="primary" plain size="small" @click="logout">退出</el-button>
        </div>
      </header>
      <main class="content-wrap">
        <router-view />
      </main>
    </section>
  </div>
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
  'terminal-side': '终端侧',
  'edge-side': '边端侧',
  'cloud-side': '云端大屏',
  'cloud-ops': '运维控制台'
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
  terminalsStore.startPolling(5000)
  // Initial sync
  terminalsStore.applyAlerts(alertsStore.alerts)
})

onUnmounted(() => {
  alertsStore.stopPolling()
  statsStore.stopPolling()
  terminalsStore.stopPolling()
})
</script>

<style scoped>
.shell-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  height: 100vh;
  background: var(--bg-page);
}

.shell-sidebar {
  border-right: 1px solid var(--border-color);
  background: linear-gradient(180deg, #f8fbff 0%, #f5f9ff 100%);
  padding: 20px 16px;
  overflow-y: auto;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.brand-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.brand-sub {
  font-size: 12px;
  color: var(--text-secondary);
}

.nav-group-title {
  margin: 14px 8px 8px;
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  border: 1px solid transparent;
  background: transparent;
  border-radius: 10px;
  padding: 10px 12px;
  text-align: left;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-item:hover {
  background: #eef4ff;
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  border-color: #c7dbff;
  font-weight: 600;
}

.shell-main {
  display: grid;
  grid-template-rows: 76px 1fr;
  min-width: 0;
}

.shell-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px;
  border-bottom: 1px solid var(--border-color);
  background: #ffffffd6;
  backdrop-filter: blur(6px);
}

.top-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.top-sub {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.top-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.badge.danger { background: #fee2e2; color: #b91c1c; }
.badge.warning { background: #fef3c7; color: #a16207; }

.username {
  color: var(--text-secondary);
  font-size: 13px;
}

.content-wrap {
  overflow: auto;
  padding: 20px 22px;
}

@media (max-width: 1200px) {
  .shell-layout { grid-template-columns: 210px 1fr; }
  .top-title { font-size: 18px; }
}
</style>
