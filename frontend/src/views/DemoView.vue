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
