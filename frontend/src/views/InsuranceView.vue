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
