<template>
  <div>
    <div class="toolbar">
      <div style="display:flex;gap:8px;align-items:center">
        <el-select v-model="levelFilter" placeholder="告警级别" clearable size="small" style="width:130px">
          <el-option label="全部级别" value="" />
          <el-option label="P0 紧急" value="P0" />
          <el-option label="P1 重要" value="P1" />
        </el-select>
        <el-select v-model="typeFilter" placeholder="告警类型" clearable size="small" style="width:130px">
          <el-option label="全部类型" value="" />
          <el-option label="HARDWARE" value="HARDWARE" />
          <el-option label="BUSINESS" value="BUSINESS" />
        </el-select>
        <el-input v-model="terminalFilter" placeholder="终端ID" clearable size="small" style="width:120px" />
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <el-tag type="danger" effect="dark">P0: {{ alertsStore.p0Count }}</el-tag>
        <el-tag type="warning" effect="dark">P1: {{ alertsStore.p1Count }}</el-tag>
        <el-button size="small" @click="alertsStore.fetchAlerts()" :loading="alertsStore.loading">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <div class="panel" style="margin-top:16px">
      <el-table :data="filteredAlerts" class="alert-table" max-height="620">
        <el-table-column label="时间" width="180">
          <template #default="{ row }">{{ formatTime(row.timestamp) }}</template>
        </el-table-column>
        <el-table-column label="级别" width="80">
          <template #default="{ row }">
            <el-tag :type="row.level === 'P0' ? 'danger' : row.level === 'P1' ? 'warning' : 'info'" effect="dark" size="small">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="终端" width="90" prop="terminalId" />
        <el-table-column label="类型" width="110">
          <template #default="{ row }">
            <el-tag :type="row.type === 'HARDWARE' ? 'danger' : 'warning'" plain size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="告警信息" prop="message" min-width="240" />
        <el-table-column label="告警ID" width="280" prop="alertId">
          <template #default="{ row }">
            <span style="font-size:11px;color:#8b949e">{{ row.alertId }}</span>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="filteredAlerts.length === 0" class="empty-hint">
        暂无告警数据。运行终端异常回放：<br/>
        <code>mvn -pl simulator exec:java -Dexec.mainClass=com.yunbd.sim.AnomalyReplayRunner "-Dexec.args=localhost 1883 simulation/anomaly-samples.json"</code>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAlertsStore } from '../stores/alerts'

const alertsStore = useAlertsStore()
const levelFilter = ref('')
const typeFilter = ref('')
const terminalFilter = ref('')

const filteredAlerts = computed(() => {
  return alertsStore.alerts.filter(a => {
    if (levelFilter.value && a.level !== levelFilter.value) return false
    if (typeFilter.value && a.type !== typeFilter.value) return false
    if (terminalFilter.value && !a.terminalId.includes(terminalFilter.value)) return false
    return true
  })
})

function formatTime(ts) {
  return new Date(ts).toLocaleString('zh-CN', { hour12: false })
}
</script>

<style scoped>
.toolbar { display: flex; align-items: center; justify-content: space-between; }
.panel { background: #161b22; border: 1px solid #21262d; border-radius: 10px; padding: 16px; }
.alert-table :deep(th) { background: #1c2128 !important; color: #8b949e !important; border-bottom: 1px solid #21262d; }
.alert-table :deep(td) { background: transparent !important; color: #e6edf3 !important; border-bottom: 1px solid #21262d; }
.alert-table :deep(tr:hover td) { background: #1c2128 !important; }
.empty-hint { text-align: center; color: #484f58; padding: 32px; font-size: 13px; line-height: 2; }
.empty-hint code { color: #58a6ff; font-size: 11px; word-break: break-all; }
</style>
