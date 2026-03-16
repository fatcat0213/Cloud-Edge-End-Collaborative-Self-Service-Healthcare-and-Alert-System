<template>
  <div class="registration-page">
    <el-row :gutter="24">
      <!-- Left: Form Card -->
      <el-col :span="10">
        <div class="form-card">
          <div class="form-title">挂号预约</div>
          <el-form label-position="top">
            <el-form-item label="患者 ID">
              <el-input v-model="patientId" placeholder="请输入患者 ID" />
            </el-form-item>

            <el-form-item label="选择科室">
              <div class="dept-grid">
                <div
                  v-for="dept in departments"
                  :key="dept.code"
                  class="dept-card"
                  :class="{ active: deptCode === dept.code }"
                  @click="deptCode = dept.code"
                >
                  <el-icon class="dept-icon" :size="24">
                    <component :is="dept.icon" />
                  </el-icon>
                  <span class="dept-label">{{ dept.name }}</span>
                </div>
              </div>
            </el-form-item>

            <el-form-item label="医生 ID">
              <el-input v-model="doctorId" placeholder="请输入医生 ID" />
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
import { FirstAidKit, Coordinate, Help, Warning, Plus } from '@element-plus/icons-vue'
import { register } from '../api'

const patientId = ref('')
const deptCode = ref('')
const doctorId = ref('')
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
  if (!patientId.value || !deptCode.value) {
    ElMessage.warning('请填写患者 ID 并选择科室')
    return
  }
  loading.value = true
  try {
    const res = await register({
      patientId: patientId.value,
      deptCode: deptCode.value,
      doctorId: doctorId.value
    })
    results.value.unshift({
      regId: res.data.regId || `REG-${Date.now()}`,
      patientId: patientId.value,
      deptCode: deptCode.value,
      doctorId: doctorId.value,
      status: 'SUCCESS'
    })
    ElMessage.success('挂号成功')
    patientId.value = ''
    doctorId.value = ''
  } catch {
    results.value.unshift({
      regId: `ERR-${Date.now()}`,
      patientId: patientId.value,
      deptCode: deptCode.value,
      doctorId: doctorId.value,
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
