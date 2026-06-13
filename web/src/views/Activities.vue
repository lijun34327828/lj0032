<template>
  <div>
    <el-card class="mb-16">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="活动名称">
          <el-input v-model="searchForm.keyword" placeholder="搜索活动名称或路线" clearable @keyup.enter="loadList" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 140px;">
            <el-option label="报名中" value="报名中" />
            <el-option label="已满员" value="已满员" />
            <el-option label="已结束" value="已结束" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList"><el-icon><Search /></el-icon>&nbsp;查询</el-button>
          <el-button @click="resetSearch"><el-icon><Refresh /></el-icon>&nbsp;重置</el-button>
          <el-button type="success" @click="openDialog()"><el-icon><Plus /></el-icon>&nbsp;发布活动</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="list" stripe>
        <el-table-column prop="id" label="编号" width="70" />
        <el-table-column prop="title" label="活动名称" min-width="160" />
        <el-table-column prop="route" label="骑行路线" min-width="180" show-overflow-tooltip />
        <el-table-column prop="distance" label="里程(km)" width="100" />
        <el-table-column label="难度" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.difficulty === '简单' ? 'success' : row.difficulty === '困难' ? 'danger' : 'warning'">{{ row.difficulty }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="报名进度" width="150">
          <template #default="{ row }">
            <el-progress
              :percentage="Math.round((row.current_participants / row.max_participants) * 100)"
              :stroke-width="12"
            />
            <div style="text-align: center; font-size: 12px; color: #606266;">
              {{ row.current_participants }} / {{ row.max_participants }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="gather_time" label="集合时间" width="160" />
        <el-table-column prop="gather_place" label="集合地点" min-width="140" show-overflow-tooltip />
        <el-table-column label="费用" width="90">
          <template #default="{ row }">
            <span style="color: #f56c6c; font-weight: 600;">¥{{ row.fee }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push('/activities/' + row.id)">详情</el-button>
            <el-button type="success" link @click="openDialog(row)">编辑</el-button>
            <el-button type="warning" link @click="handleArchive(row)" v-if="row.status !== '已归档'">归档</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑活动' : '发布新活动'" width="640px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="活动名称" prop="title">
          <el-input v-model="form.title" placeholder="请输入活动名称" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="骑行路线" prop="route">
              <el-input v-model="form.route" placeholder="起点-终点" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="里程(km)">
              <el-input-number v-model="form.distance" :min="0" :step="5" controls-position="right" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="难度">
              <el-select v-model="form.difficulty" style="width: 100%;">
                <el-option label="简单" value="简单" />
                <el-option label="中等" value="中等" />
                <el-option label="困难" value="困难" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="人数上限" prop="max_participants">
              <el-input-number v-model="form.max_participants" :min="1" :max="500" controls-position="right" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="集合时间" prop="gather_time">
              <el-date-picker v-model="form.gather_time" type="datetime" placeholder="选择集合时间" style="width: 100%;" value-format="YYYY-MM-DD HH:mm:ss" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="活动费用(元)">
              <el-input-number v-model="form.fee" :min="0" :precision="2" controls-position="right" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="集合地点" prop="gather_place">
          <el-input v-model="form.gather_place" placeholder="详细集合地点" />
        </el-form-item>
        <el-form-item label="活动说明">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="活动注意事项、装备要求等" />
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
  id: null, title: '', route: '', distance: 0, difficulty: '中等',
  max_participants: 20, gather_time: '', gather_place: '', fee: 0, description: '', status: '报名中'
})
const form = reactive(defaultForm())

const rules = {
  title: [{ required: true, message: '请输入活动名称', trigger: 'blur' }],
  route: [{ required: true, message: '请输入骑行路线', trigger: 'blur' }],
  max_participants: [{ required: true, message: '请设置人数上限', trigger: 'blur' }],
  gather_time: [{ required: true, message: '请选择集合时间', trigger: 'change' }],
  gather_place: [{ required: true, message: '请输入集合地点', trigger: 'blur' }]
}

function getStatusType(status) {
  const map = { '报名中': 'success', '已满员': 'warning', '已结束': 'info', '已归档': 'danger' }
  return map[status] || ''
}

async function loadList() {
  const params = { archived: 0, ...searchForm }
  if (!params.keyword) delete params.keyword
  if (!params.status) delete params.status
  const res = await request.get('/activities', { params })
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
    await request.put('/activities/' + form.id, { ...form })
    ElMessage.success('修改成功')
  } else {
    await request.post('/activities', { ...form })
    ElMessage.success('发布成功')
  }
  dialogVisible.value = false
  loadList()
}

async function handleArchive(row) {
  await ElMessageBox.confirm(`确认归档活动「${row.title}」？`, '提示', { type: 'warning' })
  await request.post(`/activities/${row.id}/archive`)
  ElMessage.success('已归档')
  loadList()
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`删除活动将同时删除相关报名记录，确认删除？`, '警告', { type: 'error' })
  await request.delete('/activities/' + row.id)
  ElMessage.success('已删除')
  loadList()
}

onMounted(loadList)
</script>

<style scoped>
.mb-16 { margin-bottom: 16px; }
.search-form { margin-bottom: -18px; }
</style>
