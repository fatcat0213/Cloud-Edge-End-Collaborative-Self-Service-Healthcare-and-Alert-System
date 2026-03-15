<template>
  <div>
    <div class="panel" style="max-width:560px">
      <div class="panel-header">支付核验</div>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px" style="margin-top:20px">
        <el-form-item label="患者ID" prop="patientId">
          <el-input v-model="form.patientId" placeholder="如 P001" />
        </el-form-item>
        <el-form-item label="挂号单号" prop="registrationId">
          <el-input v-model="form.registrationId" placeholder="如 REG-..." />
        </el-form-item>
        <el-form-item label="金额（元）" prop="amount">
          <el-input-number v-model="form.amount" :min="0.01" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="幂等键" prop="idempotencyKey">
          <el-input v-model="form.idempotencyKey" placeholder="唯一请求标识，重试时保持不变">
            <template #append>
              <el-button @click="genKey">生成</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submit" :loading="loading">发起核验</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="panel" style="margin-top:16px;max-width:560px" v-if="results.length > 0">
      <div class="panel-header">核验记录（同一幂等键多次请求测试）</div>
      <div class="result-list">
        <div class="result-item" v-for="(r, i) in results" :key="i" :class="r.reason === 'cached' ? 'cached' : 'fresh'">
          <div class="result-top">
            <el-tag :type="r.success ? 'success' : 'danger'" effect="dark">{{ r.success ? '成功' : '失败' }}</el-tag>
            <el-tag :type="r.reason === 'cached' ? 'info' : 'primary'" plain size="small">{{ r.reason === 'cached' ? '命中缓存' : '首次处理' }}</el-tag>
            <span class="result-time">第 {{ i + 1 }} 次</span>
          </div>
          <div class="result-detail">
            自费兜底：{{ r.fallbackToSelfPay ? '是' : '否' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { verifyPayment } from '../api'

const formRef = ref()
const loading = ref(false)
const results = ref([])
const form = reactive({ patientId: 'P001', registrationId: 'REG-001', amount: 150.00, idempotencyKey: '' })
const rules = {
  patientId: [{ required: true, message: '必填' }],
  registrationId: [{ required: true, message: '必填' }],
  idempotencyKey: [{ required: true, message: '必填' }],
}

function genKey() {
  form.idempotencyKey = 'PAY-' + Date.now()
}

async function submit() {
  await formRef.value.validate()
  loading.value = true
  try {
    const res = await verifyPayment({ ...form })
    results.value.unshift(res.data)
    ElMessage.success(res.data.reason === 'cached' ? '幂等命中缓存' : '核验通过')
  } catch (e) {
    ElMessage.error('核验失败')
  } finally {
    loading.value = false
  }
}

function reset() {
  formRef.value.resetFields()
  results.value = []
}
</script>

<style scoped>
.panel { background: #161b22; border: 1px solid #21262d; border-radius: 10px; padding: 24px; }
.panel-header { font-size: 15px; font-weight: 600; color: #e6edf3; border-bottom: 1px solid #21262d; padding-bottom: 12px; }
.result-list { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.result-item { padding: 12px 16px; border-radius: 8px; border: 1px solid #21262d; }
.result-item.cached { border-left: 3px solid #8b949e; background: #1c2128; }
.result-item.fresh { border-left: 3px solid #3fb950; background: #1c2128; }
.result-top { display: flex; align-items: center; gap: 8px; }
.result-time { margin-left: auto; font-size: 12px; color: #8b949e; }
.result-detail { font-size: 12px; color: #8b949e; margin-top: 6px; }
</style>
