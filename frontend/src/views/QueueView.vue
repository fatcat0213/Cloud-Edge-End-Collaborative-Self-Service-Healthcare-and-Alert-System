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
