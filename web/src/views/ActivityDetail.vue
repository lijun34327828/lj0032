<template>
  <div v-if="detail">
    <el-button @click="$router.back()" style="margin-bottom: 16px;">
      <el-icon><ArrowLeft /></el-icon>&nbsp;返回列表
    </el-button>

    <el-row :gutter="20">
      <el-col :span="16">
        <el-card class="mb-16">
          <div class="activity-header">
            <div>
              <h2 class="activity-title">{{ detail.title }}</h2>
              <div class="activity-meta">
                <el-tag :type="getStatusType(detail.status)" size="large" style="margin-right: 12px;">{{ detail.status }}</el-tag>
                <span style="color: #909399;">发布于 {{ detail.created_at }}</span>
              </div>
            </div>
            <div>
              <el-progress
                type="dashboard"
                :percentage="registrationPercentage"
                :width="110"
                :stroke-width="10"
                color="#409eff"
              >
                <template #default="scope">
                  <span class="percentage-value">{{ detail.current_participants }}/{{ detail.max_participants }}</span>
                </template>
              </el-progress>
            </div>
          </div>
          <el-descriptions :column="2" border style="margin-top: 16px;">
            <el-descriptions-item label="骑行路线">{{ detail.route }}</el-descriptions-item>
            <el-descriptions-item label="里程">{{ detail.distance }} km</el-descriptions-item>
            <el-descriptions-item label="难度">
              <el-tag :type="detail.difficulty === '简单' ? 'success' : detail.difficulty === '困难' ? 'danger' : 'warning'">{{ detail.difficulty }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="活动费用">
              <span style="color: #f56c6c; font-weight: 600;">¥{{ detail.fee }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="集合时间" :span="1">{{ detail.gather_time }}</el-descriptions-item>
            <el-descriptions-item label="集合地点" :span="1">{{ detail.gather_place }}</el-descriptions-item>
            <el-descriptions-item label="活动说明" :span="2">{{ detail.description || '无' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card>
          <template #header>
            <div class="card-header">
              <span style="font-weight: 600;">报名人员 ({{ detail.current_participants }} 人)</span>
              <div>
                <el-button type="primary" size="small" @click="openRegisterDialog">
                  <el-icon><Plus /></el-icon>&nbsp;新增报名
                </el-button>
                <el-button type="success" size="small" @click="openCheckInDialog" style="margin-left: 8px;">
                  <el-icon><LocationFilled /></el-icon>&nbsp;现场签到
                </el-button>
              </div>
            </div>
          </template>
          <el-table :data="detail.registrations" stripe>
            <el-table-column label="序号" type="index" width="60" />
            <el-table-column prop="member_name" label="姓名" width="120" />
            <el-table-column prop="member_phone" label="手机号" width="140" />
            <el-table-column prop="register_time" label="报名时间" width="160" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="row.status === '已报名' ? 'success' : 'info'">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="签到状态" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="row.checked_in ? 'success' : 'info'">
                  {{ row.checked_in ? '已签到' : '未签到' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="check_in_time" label="签到时间" width="160">
              <template #default="{ row }">{{ row.checked_in ? row.check_in_time : '-' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button
                  type="success" link size="small"
                  @click="doCheckIn(row)"
                  v-if="row.status === '已报名' && !row.checked_in"
                >签到</el-button>
                <el-button
                  type="danger" link size="small"
                  @click="doCancel(row)"
                  v-if="row.status === '已报名'"
                >退报</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="mb-16">
          <template #header><span style="font-weight: 600;">签到统计</span></template>
          <div class="checkin-stats">
            <div class="stat-item success">
              <div class="num">{{ checkedCount }}</div>
              <div class="lbl">已签到</div>
            </div>
            <div class="stat-item info">
              <div class="num">{{ unCheckedCount }}</div>
              <div class="lbl">未签到</div>
            </div>
          </div>
        </el-card>

        <el-card>
          <template #header><span style="font-weight: 600;">签到记录</span></template>
          <el-table :data="checkIns" size="small" v-loading="loadingCheckIns">
            <el-table-column prop="member_name" label="姓名" width="100" />
            <el-table-column prop="check_in_time" label="时间" min-width="140" show-overflow-tooltip />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="registerDialogVisible" title="新增报名" width="420px">
      <el-form :model="registerForm" :rules="registerRules" ref="registerRef" label-width="90px">
        <el-form-item label="选择会员" prop="member_id">
          <el-select v-model="registerForm.member_id" filterable placeholder="搜索姓名/手机号" style="width: 100%;">
            <el-option v-for="m in members" :key="m.id" :label="m.name + ' (' + m.phone + ')'" :value="m.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="registerDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRegister">确定报名</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="checkInDialogVisible" title="现场签到" width="420px">
      <el-form :model="checkInForm" :rules="checkInRules" ref="checkInRef" label-width="90px">
        <el-form-item label="选择会员" prop="member_id">
          <el-select v-model="checkInForm.member_id" filterable placeholder="搜索已报名人员" style="width: 100%;">
            <el-option
              v-for="r in registeredList"
              :key="r.member_id"
              :label="r.member_name + ' (' + r.member_phone + ')'"
              :value="r.member_id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="checkInDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCheckIn">确认签到</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'

const route = useRoute()
const detail = ref(null)
const members = ref([])
const checkIns = ref([])
const loadingCheckIns = ref(false)
const registerDialogVisible = ref(false)
const checkInDialogVisible = ref(false)
const registerForm = reactive({ member_id: null })
const checkInForm = reactive({ member_id: null })
const registerRef = ref()
const checkInRef = ref()

const registerRules = { member_id: [{ required: true, message: '请选择会员', trigger: 'change' }] }
const checkInRules = { member_id: [{ required: true, message: '请选择会员', trigger: 'change' }] }

const checkedCount = computed(() => (detail.value?.registrations || []).filter(r => r.checked_in).length)
const unCheckedCount = computed(() => (detail.value?.registrations || []).filter(r => r.status === '已报名' && !r.checked_in).length)
const registeredList = computed(() => (detail.value?.registrations || []).filter(r => r.status === '已报名' && !r.checked_in))
const registrationPercentage = computed(() => {
  const d = detail.value
  if (!d || !d.max_participants || d.max_participants <= 0) return 0
  const cur = Number(d.current_participants) || 0
  const max = Number(d.max_participants) || 1
  return Math.min(100, Math.round((cur / max) * 100))
})
const activeRegistrations = computed(() => (detail.value?.registrations || []).filter(r => r.status === '已报名'))

function getStatusType(status) {
  const map = { '报名中': 'success', '已满员': 'warning', '已结束': 'info', '已归档': 'danger' }
  return map[status] || ''
}

async function loadDetail() {
  const res = await request.get('/activities/' + route.params.id)
  detail.value = res.data
  loadCheckIns()
}

async function loadMembers() {
  const res = await request.get('/members', { params: { status: '正常' } })
  members.value = res.data
}

async function loadCheckIns() {
  loadingCheckIns.value = true
  try {
    const res = await request.get(`/activities/${route.params.id}/check-ins`)
    checkIns.value = res.data
  } finally {
    loadingCheckIns.value = false
  }
}

function openRegisterDialog() {
  registerForm.member_id = null
  registerDialogVisible.value = true
}

async function submitRegister() {
  await registerRef.value.validate()
  await request.post('/registrations', { activity_id: route.params.id, member_id: registerForm.member_id })
  ElMessage.success('报名成功')
  registerDialogVisible.value = false
  loadDetail()
}

function openCheckInDialog() {
  checkInForm.member_id = null
  checkInDialogVisible.value = true
}

async function submitCheckIn() {
  await checkInRef.value.validate()
  await request.post('/check-ins', { activity_id: route.params.id, member_id: checkInForm.member_id })
  ElMessage.success('签到成功')
  checkInDialogVisible.value = false
  loadDetail()
}

async function doCheckIn(row) {
  await request.post('/check-ins', { activity_id: route.params.id, member_id: row.member_id })
  ElMessage.success('签到成功')
  loadDetail()
}

async function doCancel(row) {
  const { value } = await ElMessageBox.prompt('请输入退报原因（可选）', '确认退报', {
    confirmButtonText: '确认退报',
    cancelButtonText: '取消',
    inputPlaceholder: '可不填',
    type: 'warning'
  })
  await request.post(`/registrations/${row.id}/cancel`, { reason: value || '' })
  ElMessage.success('已退报')
  loadDetail()
}

onMounted(() => {
  loadDetail()
  loadMembers()
})
</script>

<style scoped>
.mb-16 { margin-bottom: 16px; }
.activity-header { display: flex; justify-content: space-between; align-items: flex-start; }
.activity-title { font-size: 22px; margin-bottom: 10px; color: #303133; }
.activity-meta { display: flex; align-items: center; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.checkin-stats { display: flex; gap: 16px; }
.stat-item { flex: 1; text-align: center; padding: 16px; border-radius: 8px; }
.stat-item.success { background: #f0f9eb; }
.stat-item.info { background: #f4f4f5; }
.stat-item .num { font-size: 28px; font-weight: bold; }
.stat-item.success .num { color: #67c23a; }
.stat-item.info .num { color: #909399; }
.stat-item .lbl { font-size: 13px; color: #606266; margin-top: 4px; }
.percentage-value { font-size: 16px; font-weight: 600; color: #303133; }
</style>
