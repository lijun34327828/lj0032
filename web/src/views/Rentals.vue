<template>
  <div>
    <el-card class="mb-16">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 140px;">
            <el-option label="已预约" value="已预约" />
            <el-option label="使用中" value="使用中" />
            <el-option label="已归还" value="已归还" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList"><el-icon><Search /></el-icon>&nbsp;查询</el-button>
          <el-button @click="resetSearch"><el-icon><Refresh /></el-icon>&nbsp;重置</el-button>
          <el-button type="success" @click="openDialog()"><el-icon><Plus /></el-icon>&nbsp;新建租赁</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="list" stripe>
        <el-table-column prop="id" label="单号" width="80" />
        <el-table-column prop="equipment_name" label="器材" width="140" />
        <el-table-column label="类别" width="90">
          <template #default="{ row }">
            <el-tag size="small">{{ row.equipment_category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="member_name" label="租借人" width="110" />
        <el-table-column prop="member_phone" label="手机号" width="130" />
        <el-table-column prop="start_time" label="借出时间" width="150" />
        <el-table-column prop="end_time" label="预计归还" width="150" />
        <el-table-column prop="actual_return_time" label="实际归还" width="150">
          <template #default="{ row }">{{ row.actual_return_time || '-' }}</template>
        </el-table-column>
        <el-table-column label="数量" width="70" align="center">
          <template #default="{ row }">{{ row.quantity }}</template>
        </el-table-column>
        <el-table-column label="租赁费用" width="100">
          <template #default="{ row }">
            <span style="color: #67c23a; font-weight: 600;">¥{{ row.total_fee }}</span>
          </template>
        </el-table-column>
        <el-table-column label="逾期费用" width="100">
          <template #default="{ row }">
            <span v-if="row.status === '使用中' && row.overdue_fee_calc > 0" style="color: #f56c6c; font-weight: 600;">
              ¥{{ row.overdue_fee_calc }}
            </span>
            <span v-else-if="row.overdue_fee > 0" style="color: #f56c6c; font-weight: 600;">¥{{ row.overdue_fee }}</span>
            <span v-else style="color: #909399;">¥0.00</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="success" link @click="doPickup(row)" v-if="row.status === '已预约'">取件</el-button>
            <el-button type="primary" link @click="doReturn(row)" v-if="row.status === '使用中'">归还</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="新建租赁" width="560px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="选择器材" prop="equipment_id">
          <el-select v-model="form.equipment_id" filterable placeholder="搜索器材" style="width: 100%;" @change="onEquipChange">
            <el-option
              v-for="e in equipments"
              :key="e.id"
              :label="e.name + '(' + e.category + ') 库存:' + e.available_stock + ' 时租:¥' + e.hourly_rate + ' 日租:¥' + e.daily_rate"
              :value="e.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="租借会员" prop="member_id">
          <el-select v-model="form.member_id" filterable placeholder="搜索姓名/手机号" style="width: 100%;">
            <el-option v-for="m in members" :key="m.id" :label="m.name + ' (' + m.phone + ')'" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联活动">
          <el-select v-model="form.activity_id" clearable filterable placeholder="可选，关联到活动" style="width: 100%;">
            <el-option v-for="a in activities" :key="a.id" :label="a.title + ' (' + a.gather_time + ')'" :value="a.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="借出时间" prop="start_time">
              <el-date-picker v-model="form.start_time" type="datetime" placeholder="选择" style="width: 100%;" value-format="YYYY-MM-DD HH:mm:ss" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="归还时间" prop="end_time">
              <el-date-picker v-model="form.end_time" type="datetime" placeholder="选择" style="width: 100%;" value-format="YYYY-MM-DD HH:mm:ss" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="数量" prop="quantity">
              <el-input-number v-model="form.quantity" :min="1" controls-position="right" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="计费方式" prop="unit_type">
              <el-radio-group v-model="form.unit_type">
                <el-radio-button value="hour">按时</el-radio-button>
                <el-radio-button value="day">按天</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="预计费用">
              <span style="color: #67c23a; font-size: 16px; font-weight: bold;">¥{{ estimatedFee.toFixed(2) }}</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确认创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'

const list = ref([])
const equipments = ref([])
const members = ref([])
const activities = ref([])
const searchForm = reactive({ status: '' })
const dialogVisible = ref(false)
const formRef = ref()

const defaultForm = () => ({
  equipment_id: null, member_id: null, activity_id: null,
  start_time: '', end_time: '', quantity: 1, unit_type: 'hour', remark: ''
})
const form = reactive(defaultForm())
const currentEquip = ref(null)

const rules = {
  equipment_id: [{ required: true, message: '请选择器材', trigger: 'change' }],
  member_id: [{ required: true, message: '请选择会员', trigger: 'change' }],
  start_time: [{ required: true, message: '请选择借出时间', trigger: 'change' }],
  end_time: [{ required: true, message: '请选择归还时间', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  unit_type: [{ required: true, message: '请选择计费方式', trigger: 'change' }]
}

const estimatedFee = computed(() => {
  if (!currentEquip.value || !form.start_time || !form.end_time) return 0
  const start = new Date(form.start_time)
  const end = new Date(form.end_time)
  if (end <= start) return 0
  const diffMs = end - start
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
  const diffDays = Math.ceil(diffHours / 24)
  const unitPrice = form.unit_type === 'day' ? currentEquip.value.daily_rate : currentEquip.value.hourly_rate
  const amount = form.unit_type === 'day' ? unitPrice * diffDays : unitPrice * diffHours
  return amount * form.quantity
})

function getStatusType(status) {
  const map = { '已预约': 'warning', '使用中': 'primary', '已归还': 'success' }
  return map[status] || ''
}

async function loadList() {
  const params = { ...searchForm }
  if (!params.status) delete params.status
  const res = await request.get('/rentals', { params })
  list.value = res.data
}

function resetSearch() {
  searchForm.status = ''
  loadList()
}

async function loadEquipments() {
  const res = await request.get('/equipment', { params: { status: '正常' } })
  equipments.value = res.data
}

async function loadMembers() {
  const res = await request.get('/members', { params: { status: '正常' } })
  members.value = res.data
}

async function loadActivities() {
  const res = await request.get('/activities', { params: { archived: 0 } })
  activities.value = res.data
}

function onEquipChange(id) {
  currentEquip.value = equipments.value.find(e => e.id === id) || null
  if (currentEquip.value && form.quantity > currentEquip.value.available_stock) {
    form.quantity = Math.max(1, currentEquip.value.available_stock)
  }
}

watch([() => form.equipment_id, () => form.start_time, () => form.end_time, () => form.quantity, () => form.unit_type], () => {})

function openDialog() {
  Object.assign(form, defaultForm())
  const now = new Date()
  form.start_time = now.toISOString().slice(0, 16).replace('T', ' ') + ':00'
  now.setHours(now.getHours() + 4)
  form.end_time = now.toISOString().slice(0, 16).replace('T', ' ') + ':00'
  currentEquip.value = null
  dialogVisible.value = true
}

async function submitForm() {
  await formRef.value.validate()
  const res = await request.post('/rentals', { ...form })
  ElMessage.success(`创建成功，预计费用 ¥${res.data.total_fee}`)
  dialogVisible.value = false
  loadList()
  loadEquipments()
}

async function doPickup(row) {
  await ElMessageBox.confirm(`确认会员「${row.member_name}」取走 ${row.quantity} 件「${row.equipment_name}」？`, '取件确认', { type: 'warning' })
  await request.post(`/rentals/${row.id}/pickup`)
  ElMessage.success('取件成功，已变更为使用中')
  loadList()
  loadEquipments()
}

async function doReturn(row) {
  const overdueFee = row.overdue_fee_calc || 0
  const msg = overdueFee > 0
    ? `该租赁已逾期，预计产生逾期费 ¥${overdueFee}，确认归还？`
    : '确认归还器材？'
  const res = await ElMessageBox.confirm(msg, '归还确认', { type: 'warning' })
  const result = await request.post(`/rentals/${row.id}/return`)
  const totalOverdue = result.data.overdue_fee || 0
  ElMessage.success(totalOverdue > 0 ? `归还成功，逾期费 ¥${totalOverdue}` : '归还成功')
  loadList()
  loadEquipments()
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确认删除该租赁记录？`, '警告', { type: 'error' })
  await request.delete('/rentals/' + row.id)
  ElMessage.success('已删除')
  loadList()
  loadEquipments()
}

onMounted(() => {
  loadList()
  loadEquipments()
  loadMembers()
  loadActivities()
})
</script>

<style scoped>
.mb-16 { margin-bottom: 16px; }
.search-form { margin-bottom: -18px; }
</style>
