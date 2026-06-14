<template>
  <div>
    <el-card class="mb-16">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="类别">
          <el-select v-model="searchForm.category" placeholder="全部" clearable style="width: 140px;">
            <el-option label="单车" value="单车" />
            <el-option label="头盔" value="头盔" />
            <el-option label="手套" value="手套" />
            <el-option label="护膝" value="护膝" />
            <el-option label="骑行服" value="骑行服" />
            <el-option label="码表" value="码表" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="搜索">
          <el-input v-model="searchForm.keyword" placeholder="名称/品牌/型号" clearable @keyup.enter="loadList" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 140px;">
            <el-option label="正常" value="正常" />
            <el-option label="维修中" value="维修中" />
            <el-option label="报废" value="报废" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList"><el-icon><Search /></el-icon>&nbsp;查询</el-button>
          <el-button @click="resetSearch"><el-icon><Refresh /></el-icon>&nbsp;重置</el-button>
          <el-button type="success" @click="openDialog()"><el-icon><Plus /></el-icon>&nbsp;器材入库</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="list" stripe>
        <el-table-column prop="id" label="编号" width="70" />
        <el-table-column prop="name" label="器材名称" width="130" />
        <el-table-column label="类别" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getCategoryType(row.category)">{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="brand" label="品牌" width="120" />
        <el-table-column prop="model" label="型号" width="120" />
        <el-table-column prop="serial_no" label="序列号" width="130" show-overflow-tooltip />
        <el-table-column label="库存" width="120">
          <template #default="{ row }">
            <el-badge :value="row.available_stock" :max="99" :class="row.available_stock === 0 ? 'badge-danger' : 'badge-success'">
              <span class="stock-info">
                <span style="color: #67c23a; font-weight: 600;">{{ row.available_stock }}</span>
                <span style="color: #909399;"> / {{ row.total_stock }}</span>
              </span>
            </el-badge>
          </template>
        </el-table-column>
        <el-table-column label="时租价格" width="110">
          <template #default="{ row }">¥{{ row.hourly_rate }}/h</template>
        </el-table-column>
        <el-table-column label="日租价格" width="110">
          <template #default="{ row }">¥{{ row.daily_rate }}/天</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDialog(row)">编辑</el-button>
            <el-button type="warning" link @click="$router.push('/rentals')" v-if="row.status === '正常' && row.available_stock > 0">租借</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑器材' : '器材入库'" width="640px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="器材名称" prop="name">
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="器材类别" prop="category">
              <el-select v-model="form.category" style="width: 100%;">
                <el-option label="单车" value="单车" />
                <el-option label="头盔" value="头盔" />
                <el-option label="手套" value="手套" />
                <el-option label="护膝" value="护膝" />
                <el-option label="骑行服" value="骑行服" />
                <el-option label="码表" value="码表" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="品牌">
              <el-input v-model="form.brand" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="型号">
              <el-input v-model="form.model" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="序列号">
              <el-input v-model="form.serial_no" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="采购日期">
              <el-date-picker v-model="form.purchase_date" type="date" style="width: 100%;" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="采购金额(元)">
              <el-input-number v-model="form.purchase_price" :min="0" :precision="2" controls-position="right" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="库存数量" prop="total_stock">
              <el-input-number v-model="form.total_stock" :min="1" controls-position="right" style="width: 100%;" @change="onStockChange" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="时租(元)" prop="hourly_rate">
              <el-input-number v-model="form.hourly_rate" :min="0" :precision="2" controls-position="right" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="日租(元)" prop="daily_rate">
              <el-input-number v-model="form.daily_rate" :min="0" :precision="2" controls-position="right" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="使用状态" v-if="form.id">
          <el-radio-group v-model="form.status">
            <el-radio value="正常">正常</el-radio>
            <el-radio value="维修中">维修中</el-radio>
            <el-radio value="报废">报废</el-radio>
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
const searchForm = reactive({ category: '', keyword: '', status: '' })
const dialogVisible = ref(false)
const formRef = ref()

const defaultForm = () => ({
  id: null, name: '', category: '单车', brand: '', model: '', serial_no: '',
  purchase_date: '', purchase_price: 0, total_stock: 1, available_stock: 1,
  status: '正常', hourly_rate: 0, daily_rate: 0, remark: ''
})
const form = reactive(defaultForm())

const rules = {
  name: [{ required: true, message: '请输入器材名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择器材类别', trigger: 'change' }],
  total_stock: [{ required: true, message: '请输入库存数量', trigger: 'blur' }],
  hourly_rate: [{ required: true, message: '请输入时租价格', trigger: 'blur' }],
  daily_rate: [{ required: true, message: '请输入日租价格', trigger: 'blur' }]
}

function getCategoryType(cat) {
  const map = { '单车': 'primary', '头盔': 'success', '手套': '', '护膝': 'warning', '骑行服': 'danger', '码表': 'info', '其他': 'info' }
  return map[cat] || ''
}

function getStatusType(status) {
  const map = { '正常': 'success', '维修中': 'warning', '报废': 'danger' }
  return map[status] || ''
}

async function loadList() {
  const params = { ...searchForm }
  if (!params.category) delete params.category
  if (!params.keyword) delete params.keyword
  if (!params.status) delete params.status
  const res = await request.get('/equipment', { params })
  list.value = res.data
}

function resetSearch() {
  searchForm.category = ''
  searchForm.keyword = ''
  searchForm.status = ''
  loadList()
}

function onStockChange(val) {
  if (!form.id || form.available_stock > val) {
    form.available_stock = val
  }
}

function openDialog(row) {
  Object.assign(form, row ? { ...row } : defaultForm())
  if (!row) form.available_stock = form.total_stock
  dialogVisible.value = true
}

async function submitForm() {
  await formRef.value.validate()
  if (form.id) {
    await request.put('/equipment/' + form.id, { ...form })
    ElMessage.success('修改成功')
  } else {
    await request.post('/equipment', { ...form })
    ElMessage.success('入库成功')
  }
  dialogVisible.value = false
  loadList()
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`删除器材将同时删除相关租赁和损耗记录，确认删除？`, '警告', { type: 'error' })
  await request.delete('/equipment/' + row.id)
  ElMessage.success('已删除')
  loadList()
}

onMounted(loadList)
</script>

<style scoped>
.mb-16 { margin-bottom: 16px; }
.search-form { margin-bottom: -18px; }
.stock-info { padding: 0 12px; font-size: 14px; }
.badge-success :deep(.el-badge__content) { background-color: #67c23a; }
.badge-danger :deep(.el-badge__content) { background-color: #f56c6c; }
</style>
