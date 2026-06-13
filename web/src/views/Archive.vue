<template>
  <div>
    <el-card class="mb-16">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="搜索">
          <el-input v-model="searchForm.keyword" placeholder="活动名称或路线" clearable @keyup.enter="loadList" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList"><el-icon><Search /></el-icon>&nbsp;查询</el-button>
          <el-button @click="resetSearch"><el-icon><Refresh /></el-icon>&nbsp;重置</el-button>
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
        <el-table-column label="参与人数" width="130">
          <template #default="{ row }">
            <span style="font-weight: 600; color: #409EFF;">{{ row.current_participants }}</span>
            <span style="color: #909399;"> / {{ row.max_participants }}</span>
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
            <el-tag size="small" type="info">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="showSummary(row)">查看详情</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="list.length === 0" description="暂无已归档的活动" style="padding: 60px 0;" />
    </el-card>

    <el-dialog v-model="detailVisible" title="活动归档详情" width="700px">
      <div v-if="detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="活动名称" :span="2">{{ detail.title }}</el-descriptions-item>
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
          <el-descriptions-item label="报名人数" :span="2">
            <span style="font-size: 18px; font-weight: 600; color: #409EFF;">{{ detail.current_participants }}</span>
            <span style="color: #909399;"> / {{ detail.max_participants }} 人</span>
          </el-descriptions-item>
          <el-descriptions-item label="活动说明" :span="2">{{ detail.description || '无' }}</el-descriptions-item>
        </el-descriptions>

        <div style="margin-top: 24px;">
          <h4 style="margin-bottom: 12px; color: #303133;">参与人员记录</h4>
          <el-table :data="detail.registrations || []" size="small" stripe>
            <el-table-column label="序号" type="index" width="60" />
            <el-table-column prop="member_name" label="姓名" width="120" />
            <el-table-column prop="member_phone" label="手机号" width="140" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="row.status === '已报名' ? 'success' : 'info'">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="签到" width="80">
              <template #default="{ row }">
                <el-icon v-if="row.checked_in" color="#67c23a" :size="18"><CircleCheckFilled /></el-icon>
                <span v-else style="color: #909399;">未签到</span>
              </template>
            </el-table-column>
            <el-table-column prop="check_in_time" label="签到时间" width="160">
              <template #default="{ row }">{{ row.checked_in ? row.check_in_time : '-' }}</template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'

const list = ref([])
const searchForm = reactive({ keyword: '' })
const detailVisible = ref(false)
const detail = ref(null)

async function loadList() {
  const params = { archived: 1, ...searchForm }
  if (!params.keyword) delete params.keyword
  const res = await request.get('/activities', { params })
  list.value = res.data
}

function resetSearch() {
  searchForm.keyword = ''
  loadList()
}

async function showSummary(row) {
  const res = await request.get('/activities/' + row.id)
  detail.value = res.data
  detailVisible.value = true
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`删除后数据将不可恢复，确认删除归档活动「${row.title}」？`, '警告', { type: 'error' })
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
