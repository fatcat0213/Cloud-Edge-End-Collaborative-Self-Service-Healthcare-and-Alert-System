<template>
  <div>
    <div class="panel" style="max-width:500px">
      <div class="panel-header">排队实时查询</div>
      <el-form label-width="100px" style="margin-top:20px">
        <el-form-item label="科室">
          <el-select v-model="deptCode" placeholder="选择科室" style="width:100%">
            <el-option label="神经内科 NEU" value="NEU" />
            <el-option label="心血管科 CARD" value="CARD" />
            <el-option label="骨科 ORTH" value="ORTH" />
            <el-option label="内科 INT" value="INT" />
            <el-option label="急诊科 EMRG" value="EMRG" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="query" :loading="loading">查询</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="panel result-panel" v-if="result" style="margin-top:16px;max-width:500px">
      <div class="panel-header">{{ result.deptCode }} 排队情况</div>
      <el-row :gutter="16" style="margin-top:20px">
        <el-col :span="12">
          <div class="stat-card">
            <div class="stat-num" :style="{ color: result.depth > 50 ? '#f85149' : '#58a6ff' }">{{ result.depth }}</div>
            <div class="stat-label">当前排队人数</div>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="stat-card">
            <div class="stat-num" :style="{ color: result.avgWaitMs > 30000 ? '#e3b341' : '#3fb950' }">{{ (result.avgWaitMs / 60000).toFixed(1) }} min</div>
            <div class="stat-label">预计等待时间</div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getQueue } from '../api'

const deptCode = ref('NEU')
const loading = ref(false)
const result = ref(null)

async function query() {
  if (!deptCode.value) return ElMessage.warning('请选择科室')
  loading.value = true
  try {
    const res = await getQueue(deptCode.value)
    result.value = res.data
  } catch (e) {
    ElMessage.error('查询失败：' + (e.message))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.panel { background: #161b22; border: 1px solid #21262d; border-radius: 10px; padding: 24px; }
.panel-header { font-size: 15px; font-weight: 600; color: #e6edf3; border-bottom: 1px solid #21262d; padding-bottom: 12px; }
.stat-card { background: #1c2128; border-radius: 8px; padding: 20px; text-align: center; }
.stat-num { font-size: 36px; font-weight: 700; }
.stat-label { font-size: 13px; color: #8b949e; margin-top: 6px; }
</style>
