<template>
  <el-container class="layout">
    <!-- Sidebar -->
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <el-icon size="24" color="#409eff"><Monitor /></el-icon>
        <span>云边端监测系统</span>
      </div>
      <el-menu
        :default-active="route.path"
        router
        background-color="#161b22"
        text-color="#8b949e"
        active-text-color="#58a6ff"
        class="sidebar-menu"
      >
        <el-menu-item index="/">
          <el-icon><DataAnalysis /></el-icon>
          <span>系统总览</span>
        </el-menu-item>
        <el-menu-item index="/terminals">
          <el-icon><Monitor /></el-icon>
          <span>终端监控</span>
          <el-badge v-if="terminalsStore.offlineCount > 0" :value="terminalsStore.offlineCount" type="danger" class="menu-badge" />
        </el-menu-item>
        <el-menu-item index="/alerts">
          <el-icon><Bell /></el-icon>
          <span>告警中心</span>
          <el-badge v-if="alertsStore.p0Count > 0" :value="alertsStore.p0Count" type="danger" class="menu-badge" />
        </el-menu-item>
        <el-divider style="border-color:#30363d; margin: 8px 0" />
        <div class="menu-group-label">业务操作</div>
        <el-menu-item index="/registration">
          <el-icon><UserFilled /></el-icon>
          <span>挂号登记</span>
        </el-menu-item>
        <el-menu-item index="/queue">
          <el-icon><List /></el-icon>
          <span>排队查询</span>
        </el-menu-item>
        <el-menu-item index="/insurance">
          <el-icon><Wallet /></el-icon>
          <span>医保核验</span>
        </el-menu-item>
        <el-menu-item index="/payment">
          <el-icon><CreditCard /></el-icon>
          <span>支付核验</span>
        </el-menu-item>
      </el-menu>
      <div class="sidebar-footer">
        <div class="status-dot online"></div>
        <span>系统运行中</span>
      </div>
    </el-aside>

    <!-- Main -->
    <el-container direction="vertical" class="main-container">
      <el-header class="topbar">
        <div class="topbar-left">
          <span class="page-title">{{ pageTitle }}</span>
        </div>
        <div class="topbar-right">
          <el-tag v-if="alertsStore.p0Count > 0" type="danger" effect="dark" style="margin-right:8px">
            P0告警 {{ alertsStore.p0Count }}
          </el-tag>
          <el-tag v-if="alertsStore.p1Count > 0" type="warning" effect="dark" style="margin-right:8px">
            P1告警 {{ alertsStore.p1Count }}
          </el-tag>
          <span class="time">{{ currentTime }}</span>
        </div>
      </el-header>
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAlertsStore } from '../stores/alerts'
import { useTerminalsStore } from '../stores/terminals'
import { watch } from 'vue'

const route = useRoute()
const alertsStore = useAlertsStore()
const terminalsStore = useTerminalsStore()
const currentTime = ref('')

const pageTitles = {
  '/': '系统总览',
  '/terminals': '终端监控',
  '/alerts': '告警中心',
  '/registration': '挂号登记',
  '/queue': '排队查询',
  '/insurance': '医保核验',
  '/payment': '支付核验',
}
const pageTitle = computed(() => pageTitles[route.path] || '云边端监测系统')

let clockTimer = null
function updateTime() {
  currentTime.value = new Date().toLocaleString('zh-CN', { hour12: false })
}

watch(() => alertsStore.alerts, (alerts) => {
  terminalsStore.applyAlerts(alerts)
}, { deep: true })

onMounted(() => {
  alertsStore.startPolling(5000)
  updateTime()
  clockTimer = setInterval(updateTime, 1000)
})
onUnmounted(() => {
  alertsStore.stopPolling()
  clearInterval(clockTimer)
})
</script>

<style scoped>
.layout { height: 100vh; overflow: hidden; }
.sidebar {
  background: #161b22;
  border-right: 1px solid #21262d;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #e6edf3;
  border-bottom: 1px solid #21262d;
}
.sidebar-menu { border-right: none; flex: 1; }
.sidebar-menu :deep(.el-menu-item) { height: 44px; margin: 2px 8px; border-radius: 6px; }
.sidebar-menu :deep(.el-menu-item.is-active) { background: #1f2937 !important; }
.menu-badge { margin-left: auto; }
.menu-group-label {
  font-size: 11px;
  color: #484f58;
  padding: 4px 20px 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  font-size: 12px;
  color: #8b949e;
  border-top: 1px solid #21262d;
}
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-dot.online { background: #3fb950; box-shadow: 0 0 6px #3fb950; }
.topbar {
  height: 56px;
  background: #161b22;
  border-bottom: 1px solid #21262d;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}
.page-title { font-size: 16px; font-weight: 600; color: #e6edf3; }
.topbar-right { display: flex; align-items: center; gap: 8px; }
.time { font-size: 13px; color: #8b949e; font-variant-numeric: tabular-nums; }
.main-container { overflow: hidden; }
.main-content { background: #0d1117; overflow-y: auto; padding: 24px; }
</style>
