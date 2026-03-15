<template>
  <div class="form-page">
    <div class="panel">
      <div class="panel-header">挂号登记</div>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" style="max-width:480px;margin-top:20px">
        <el-form-item label="患者ID" prop="patientId">
          <el-input v-model="form.patientId" placeholder="如 P001" />
        </el-form-item>
        <el-form-item label="科室代码" prop="deptCode">
          <el-select v-model="form.deptCode" placeholder="选择科室" style="width:100%">
            <el-option label="神经内科 NEU" value="NEU" />
            <el-option label="心血管科 CARD" value="CARD" />
            <el-option label="骨科 ORTH" value="ORTH" />
            <el-option label="内科 INT" value="INT" />
            <el-option label="急诊科 EMRG" value="EMRG" />
          </el-select>
        </el-form-item>
        <el-form-item label="医生ID" prop="doctorId">
          <el-input v-model="form.doctorId" placeholder="如 D101" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submit" :loading="loading">提交挂号</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="panel result-panel" v-if="result">
      <div class="panel-header">挂号结果</div>
      <el-descriptions :column="1" border style="margin-top:16px">
        <el-descriptions-item label="挂号单号">
          <span style="color:#58a6ff;font-weight:600">{{ result.registrationId }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="患者ID">{{ result.patientId }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag type="warning" effect="dark">{{ result.status }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { register } from '../api'

const formRef = ref()
const loading = ref(false)
const result = ref(null)
const form = reactive({ patientId: '', deptCode: '', doctorId: '' })
const rules = {
  patientId: [{ required: true, message: '请输入患者ID' }],
  deptCode: [{ required: true, message: '请选择科室' }],
  doctorId: [{ required: true, message: '请输入医生ID' }],
}

async function submit() {
  await formRef.value.validate()
  loading.value = true
  try {
    const res = await register({ ...form })
    result.value = res.data
    ElMessage.success('挂号成功')
  } catch (e) {
    ElMessage.error('挂号失败：' + (e.response?.data?.message || e.message))
  } finally {
    loading.value = false
  }
}

function reset() {
  formRef.value.resetFields()
  result.value = null
}
</script>

<style scoped>
.form-page { display: flex; flex-direction: column; gap: 16px; }
.panel { background: #161b22; border: 1px solid #21262d; border-radius: 10px; padding: 24px; }
.panel-header { font-size: 15px; font-weight: 600; color: #e6edf3; border-bottom: 1px solid #21262d; padding-bottom: 12px; margin-bottom: 4px; }
</style>
