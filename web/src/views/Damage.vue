<template>
  <div>
    <el-card class="mb-16">
      <el-form :inline="true" class="search-form">
        <el-form-item>
          <el-button type="primary" @click="loadList"><el-icon><Refresh /></el-icon>&nbsp;刷新</el-button>
          <el-button type="success" @click="openDialog()"><el-icon><Plus /></el-icon>&nbsp;新增登记</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="list" stripe>
        <el-table-column prop="id" label="编号" width="70" />
        <el-table-column prop="equipment_name" label="器材名称" width="140" />
        <el-table-column label="类别" width="90">
          <template #default="{ row }">
            <el-tag size="small">{{ row.equipment_category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reporter_name" label="上报人" width="110">
          <template #default="{ row }">{{ row.reporter_name || '管理员' }}</template>
        </el-table-column>
        <el-table-column prop="report_time" label="上报时间" width="160" />
        <el-table-column label="严重程度" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getSeverityType(row.severity)">{{ row.severity }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="损耗描述" min-width="180" show-overflow-tooltip />
        <el-table-column label="维修费用" width="100">
          <template #default="{ row }">
            <span style="color: #f56c6c;" v-if="row.repair_cost > 0">¥{{ row.repair_cost }}</span>
            <span v-else style="color: #909399;">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="handler" label="处理人" width="100">
          <template #default="{ row }">{{ row.handler || '-' }}</template>
        </el-table-column>
        <el-table-column label="处理状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getHandleStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openHandleDialog(row)" v-if="row.status !== '已完成'">处理</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="新增损耗登记" width="540px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="器材" prop="equipment_id">
          <el-select v-model="form.equipment_id" filterable placeholder="搜索器材" style="width: 100%;">
            <el-option v-for="e in equipments" :key="e.id" :label="e.name + '(' + e.category + ') ' + (e.brand || '')" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联租赁单">
          <el-select v-model="form.rental_id" clearable filterable placeholder="可选，关联租赁单号" style="width: 100%;">
            <el-option v-for="r in rentals" :key="r.id" :label="'#' + r.id + ' ' + r.equipment_name + ' - ' + r.member_name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="责任人/会员">
          <el-select v-model="form.member_id" clearable filterable placeholder="可选，关联会员" style="width: 100%;">
            <el-option v-for="m in members" :key="m.id" :label="m.name + ' (' + m.phone + ')'" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="严重程度" prop="severity">
              <el-radio-group v-model="form.severity">
                <el-radio-button value="轻微">轻微</el-radio-button>
                <el-radio-button value="中度">中度</el-radio-button>
                <el-radio-button value="严重">严重</el-radio-button>
                <el-radio-button value="报废">报废</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="维修费用(元)">
              <el-input-number v-model="form.repair_cost" :min="0" :precision="2" controls-position="right" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="损耗描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请详细描述损耗情况" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">提交登记</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="handleDialogVisible" title="处理损耗登记" width="480px">
      <el-form :model="handleForm" label-width="100px">
        <el-form-item label="处理状态">
          <el-radio-group v-model="handleForm.status">
            <el-radio-button value="处理中">处理中</el-radio-button>
            <el-radio-button value="已完成">已完成</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="处理人">
          <el-input v-model="handleForm.handler" placeholder="处理人姓名" />
        </el-form-item>
        <el-form-item label="处理备注">
          <el-input v-model="handleForm.remark" type="textarea" :rows="3" placeholder="处理过程、结果说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitHandle">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

const list = ref([])
const equipments = ref([])
const rentals = ref([])
const members = ref([])
const dialogVisible = ref(false)
const handleDialogVisible = ref(false)
const formRef = ref()
const currentId = ref(null)

const defaultForm = () => ({
  equipment_id: null, rental_id: null, member_id: null,
  severity: '轻微', description: '', repair_cost: 0, remark: ''
})
const form = reactive(defaultForm())
const handleForm = reactive({ status: '处理中', handler: '', remark: '' })

const rules = {
  equipment_id: [{ required: true, message: '请选择器材', trigger: 'change' }],
  severity: [{ required: true, message: '请选择严重程度', trigger: 'change' }],
  description: [{ required: true, message: '请输入损耗描述', trigger: 'blur' }]
}

function getSeverityType(s) {
  const map = { '轻微': 'success', '中度': 'warning', '严重': 'danger', '报废': 'danger' }
  return map[s] || ''
}

function getHandleStatusType(s) {
  const map = { '待处理': 'warning', '处理中': 'primary', '已完成': 'success' }
  return map[s] || ''
}

async function loadList() {
  const res = await request.get('/damage-records')
  list.value = res.data
}

async function loadEquipments() {
  const res = await request.get('/equipment')
  equipments.value = res.data
}

async function loadRentals() {
  const res = await request.get('/rentals')
  rentals.value = res.data
}

async function loadMembers() {
  const res = await request.get('/members')
  members.value = res.data
}

function openDialog() {
  Object.assign(form, defaultForm())
  dialogVisible.value = true
}

async function submitForm() {
  await formRef.value.validate()
  await request.post('/damage-records', { ...form })
  ElMessage.success('登记成功')
  dialogVisible.value = false
  loadList()
  loadEquipments()
}

function openHandleDialog(row) {
  currentId.value = row.id
  handleForm.status = row.status === '待处理' ? '处理中' : row.status
  handleForm.handler = row.handler || ''
  handleForm.remark = row.remark || ''
  handleDialogVisible.value = true
}

async function submitHandle() {
  await request.put('/damage-records/' + currentId.value, { ...handleForm })
  ElMessage.success('处理完成')
  handleDialogVisible.value = false
  loadList()
  loadEquipments()
}

onMounted(() => {
  loadList()
  loadEquipments()
  loadRentals()
  loadMembers()
})
</script>

<style scoped>
.mb-16 { margin-bottom: 16px; }
.search-form { margin-bottom: -18px; }
</style>
