<template>
  <div>
    <div class="panel" style="max-width:500px">
      <div class="panel-header">医保资格核验</div>
      <el-form label-width="100px" style="margin-top:20px">
        <el-form-item label="患者ID">
          <el-input v-model="patientId" placeholder="如 P001" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="verify" :loading="loading">核验</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="panel" style="margin-top:16px;max-width:500px" v-if="result">
      <div class="panel-header">核验结果</div>
      <div class="result-body">
        <div class="result-status" :class="result.eligible ? 'eligible' : 'ineligible'">
          <el-icon size="40">
            <CircleCheckFilled v-if="result.eligible" />
            <CircleCloseFilled v-else />
          </el-icon>
          <span>{{ result.eligible ? '医保有效' : '医保无效' }}</span>
        </div>
        <el-descriptions :column="1" border style="margin-top:16px">
          <el-descriptions-item label="患者ID">{{ result.patientId }}</el-descriptions-item>
          <el-descriptions-item label="报销比例">
            <el-progress :percentage="result.coverageRatio * 100" :format="p => p.toFixed(0) + '%'" status="success" />
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { verifyInsurance } from '../api'

const patientId = ref('P001')
const loading = ref(false)
const result = ref(null)

async function verify() {
  if (!patientId.value) return ElMessage.warning('请输入患者ID')
  loading.value = true
  try {
    const res = await verifyInsurance({ patientId: patientId.value })
    result.value = res.data
  } catch (e) {
    ElMessage.error('核验失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.panel { background: #161b22; border: 1px solid #21262d; border-radius: 10px; padding: 24px; }
.panel-header { font-size: 15px; font-weight: 600; color: #e6edf3; border-bottom: 1px solid #21262d; padding-bottom: 12px; }
.result-status { display: flex; align-items: center; gap: 12px; padding: 20px; border-radius: 8px; font-size: 18px; font-weight: 600; margin-top: 16px; }
.eligible { background: rgba(63,185,80,0.1); color: #3fb950; border: 1px solid rgba(63,185,80,0.3); }
.ineligible { background: rgba(248,81,73,0.1); color: #f85149; border: 1px solid rgba(248,81,73,0.3); }
</style>
