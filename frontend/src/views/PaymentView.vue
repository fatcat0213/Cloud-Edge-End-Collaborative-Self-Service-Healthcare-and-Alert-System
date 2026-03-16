<template>
  <div class="payment-page">
    <el-row :gutter="24">
      <!-- Left: Form -->
      <el-col :span="10">
        <div class="form-card">
          <div class="form-title">支付验证</div>
          <el-form label-position="top">
            <el-form-item label="患者 ID">
              <el-input
                v-model="form.patientId"
                placeholder="请输入患者 ID"
              />
            </el-form-item>
            <el-form-item label="挂号 ID">
              <el-input
                v-model="form.regId"
                placeholder="请输入挂号 ID"
              />
            </el-form-item>
            <el-form-item label="支付金额 (元)">
              <el-input
                v-model="form.amount"
                placeholder="请输入金额"
                type="number"
              />
            </el-form-item>
            <el-form-item label="支付 ID">
              <div style="display: flex; gap: 8px">
                <el-input
                  v-model="form.payId"
                  placeholder="自动生成或手动输入"
                />
                <el-button @click="generatePayId">生成</el-button>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :loading="loading"
                style="width: 100%"
                @click="submit"
              >提交支付</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-col>

      <!-- Right: Results History -->
      <el-col :span="14">
        <div class="results-card">
          <div class="form-title">支付记录</div>
          <el-empty v-if="!results.length" description="提交支付后查看结果" />
          <div v-else class="results-list">
            <div
              v-for="r in results"
              :key="r.payId"
              class="result-item"
            >
              <div class="result-header">
                <div class="result-meta">
                  <span class="result-pay-id">{{ r.payId }}</span>
                  <el-tag
                    :type="r.success ? 'success' : 'danger'"
                    size="small"
                  >{{ r.success ? '支付成功' : '支付失败' }}</el-tag>
                </div>
                <div class="result-tags">
                  <el-tag
                    v-if="r.cacheHit"
                    type="info"
                    size="small"
                  >命中缓存</el-tag>
                  <el-tag
                    v-if="r.fallbackToSelfPay"
                    type="warning"
                    size="small"
                  >回退自费</el-tag>
                </div>
              </div>
              <div class="result-body">
                <span class="result-patient">患者: {{ r.patientId }}</span>
                <span class="result-amount">金额: ¥{{ r.amount }}</span>
                <span v-if="r.reason" class="result-reason">{{ r.reason }}</span>
              </div>
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
import { pay } from '../api'

const form = ref({
  patientId: '',
  regId: '',
  amount: '',
  payId: ''
})

const loading = ref(false)
const results = ref([])

function generatePayId() {
  form.value.payId = `PAY-${Date.now()}`
}

async function submit() {
  if (!form.value.patientId || !form.value.regId || !form.value.amount) {
    ElMessage.warning('请填写患者 ID、挂号 ID 和支付金额')
    return
  }
  if (!form.value.payId) {
    generatePayId()
  }
  loading.value = true
  try {
    const res = await pay(form.value)
    results.value.unshift({
      payId: form.value.payId,
      patientId: form.value.patientId,
      regId: form.value.regId,
      amount: form.value.amount,
      success: res.data.success ?? true,
      cacheHit: res.data.cacheHit ?? false,
      fallbackToSelfPay: res.data.fallbackToSelfPay ?? false,
      reason: res.data.reason || ''
    })
    ElMessage.success(results.value[0].success ? '支付成功' : '支付处理完成')
  } catch {
    results.value.unshift({
      payId: form.value.payId,
      patientId: form.value.patientId,
      regId: form.value.regId,
      amount: form.value.amount,
      success: false,
      cacheHit: false,
      fallbackToSelfPay: false,
      reason: '支付请求失败'
    })
    ElMessage.error('支付失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.payment-page {
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

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px 16px;
  transition: border-color 0.2s;
}

.result-item:hover {
  border-color: var(--color-primary);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-tags {
  display: flex;
  gap: 6px;
}

.result-pay-id {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.result-body {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  flex-wrap: wrap;
}

.result-reason {
  color: var(--color-warning);
}
</style>
