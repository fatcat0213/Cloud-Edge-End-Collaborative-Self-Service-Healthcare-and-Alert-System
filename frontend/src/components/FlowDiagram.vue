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
