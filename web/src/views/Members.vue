<template>
  <div>
    <el-card class="mb-16">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="搜索">
          <el-input v-model="searchForm.keyword" placeholder="姓名/手机号" clearable @keyup.enter="loadList" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 140px;">
            <el-option label="正常" value="正常" />
            <el-option label="停用" value="停用" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList"><el-icon><Search /></el-icon>&nbsp;查询</el-button>
          <el-button @click="resetSearch"><el-icon><Refresh /></el-icon>&nbsp;重置</el-button>
          <el-button type="success" @click="openDialog()"><el-icon><Plus /></el-icon>&nbsp;新增会员</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="list" stripe>
        <el-table-column prop="id" label="编号" width="70" />
        <el-table-column label="姓名" width="120">
          <template #default="{ row }">
            <div style="display: flex; align-items: center;">
              <el-avatar size="small" :style="{ background: avatarColor(row.name) }" style="margin-right: 8px;">
                {{ row.name.charAt(0) }}
              </el-avatar>
              {{ row.name }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column label="性别" width="80">
          <template #default="{ row }">{{ row.gender || '-' }}</template>
        </el-table-column>
        <el-table-column prop="birth_date" label="出生日期" width="120">
          <template #default="{ row }">{{ row.birth_date || '-' }}</template>
        </el-table-column>
        <el-table-column prop="join_date" label="入会日期" width="120" />
        <el-table-column label="会员等级" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getLevelType(row.level)">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === '正常' ? 'success' : 'info'">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDialog(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑会员' : '新增会员'" width="520px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" maxlength="11" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="性别">
              <el-radio-group v-model="form.gender">
                <el-radio value="男">男</el-radio>
                <el-radio value="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出生日期">
              <el-date-picker v-model="form.birth_date" type="date" style="width: 100%;" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="入会日期" prop="join_date">
              <el-date-picker v-model="form.join_date" type="date" style="width: 100%;" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="会员等级">
              <el-select v-model="form.level" style="width: 100%;">
                <el-option label="普通" value="普通" />
                <el-option label="银卡" value="银卡" />
                <el-option label="金卡" value="金卡" />
                <el-option label="钻石" value="钻石" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="账号状态" v-if="form.id">
          <el-radio-group v-model="form.status">
            <el-radio value="正常">正常</el-radio>
            <el-radio value="停用">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'

const list = ref([])
const searchForm = reactive({ keyword: '', status: '' })
const dialogVisible = ref(false)
const formRef = ref()

const defaultForm = () => ({
  id: null, name: '', phone: '', gender: '', birth_date: '',
  join_date: new Date().toISOString().slice(0, 10),
  level: '普通', status: '正常', remark: ''
})
const form = reactive(defaultForm())

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }, { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
  join_date: [{ required: true, message: '请选择入会日期', trigger: 'change' }]
}

function avatarColor(name) {
  const colors = ['#667eea', '#f5576c', '#4facfe', '#43e97b', '#f093fb', '#fa709a', '#fee140', '#30cfd0']
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return colors[sum % colors.length]
}

function getLevelType(level) {
  const map = { '普通': 'info', '银卡': '', '金卡': 'warning', '钻石': 'danger' }
  return map[level] || ''
}

async function loadList() {
  const params = { ...searchForm }
  if (!params.keyword) delete params.keyword
  if (!params.status) delete params.status
  const res = await request.get('/members', { params })
  list.value = res.data
}

function resetSearch() {
  searchForm.keyword = ''
  searchForm.status = ''
  loadList()
}

function openDialog(row) {
  Object.assign(form, row ? { ...row } : defaultForm())
  dialogVisible.value = true
}

async function submitForm() {
  await formRef.value.validate()
  if (form.id) {
    await request.put('/members/' + form.id, { ...form })
    ElMessage.success('修改成功')
  } else {
    await request.post('/members', { ...form })
    ElMessage.success('新增成功')
  }
  dialogVisible.value = false
  loadList()
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确认删除会员「${row.name}」？`, '警告', { type: 'error' })
  await request.delete('/members/' + row.id)
  ElMessage.success('已删除')
  loadList()
}

onMounted(loadList)
</script>

<style scoped>
.mb-16 { margin-bottom: 16px; }
.search-form { margin-bottom: -18px; }
</style>
