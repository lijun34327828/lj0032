<template>
  <div>
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <div class="stat-card stat-1">
          <div class="stat-icon"><el-icon :size="32"><User /></el-icon></div>
          <div class="stat-info">
            <div class="stat-num">{{ stats.member_count || 0 }}</div>
            <div class="stat-label">会员总数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card stat-2">
          <div class="stat-icon"><el-icon :size="32"><Calendar /></el-icon></div>
          <div class="stat-info">
            <div class="stat-num">{{ stats.activity_count || 0 }}</div>
            <div class="stat-label">进行中活动</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card stat-3">
          <div class="stat-icon"><el-icon :size="32"><Tools /></el-icon></div>
          <div class="stat-info">
            <div class="stat-num">{{ stats.equipment_count || 0 }}</div>
            <div class="stat-label">器材总数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card stat-4">
          <div class="stat-icon"><el-icon :size="32"><Money /></el-icon></div>
          <div class="stat-info">
            <div class="stat-num">¥{{ (stats.income_total || 0).toFixed(2) }}</div>
            <div class="stat-label">租赁收入</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span style="font-weight: 600;">近期活动</span>
              <el-button type="primary" link @click="$router.push('/activities')">查看全部</el-button>
            </div>
          </template>
          <el-table :data="stats.recent_activities || []" stripe>
            <el-table-column prop="title" label="活动名称" min-width="180" />
            <el-table-column prop="route" label="路线" min-width="160" show-overflow-tooltip />
            <el-table-column label="报名进度" width="160">
              <template #default="{ row }">
                <el-progress
                  :percentage="Math.round((row.current_participants / row.max_participants) * 100)"
                  :stroke-width="14"
                  :color="getProgressColor(row)"
                />
                <div style="text-align: center; font-size: 12px; color: #606266; margin-top: 4px;">
                  {{ row.current_participants }} / {{ row.max_participants }}
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="gather_time" label="集合时间" width="160" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <span style="font-weight: 600;">快捷操作</span>
          </template>
          <div class="quick-actions">
            <el-button type="primary" @click="$router.push('/activities')" style="width: 100%; margin-bottom: 10px;">
              <el-icon><Plus /></el-icon>&nbsp;发布新活动
            </el-button>
            <el-button type="success" @click="$router.push('/members')" style="width: 100%; margin-bottom: 10px;">
              <el-icon><User /></el-icon>&nbsp;登记新会员
            </el-button>
            <el-button type="warning" @click="$router.push('/equipment')" style="width: 100%; margin-bottom: 10px;">
              <el-icon><Tools /></el-icon>&nbsp;器材入库
            </el-button>
            <el-button type="info" @click="$router.push('/rentals')" style="width: 100%;">
              <el-icon><Tickets /></el-icon>&nbsp;新建租赁
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../utils/request'

const stats = ref({})

onMounted(async () => {
  const res = await request.get('/stats')
  stats.value = res.data
})

function getProgressColor(row) {
  const p = row.current_participants / row.max_participants
  if (p >= 1) return '#f56c6c'
  if (p >= 0.8) return '#e6a23c'
  return '#67c23a'
}

function getStatusType(status) {
  const map = { '报名中': 'success', '已满员': 'warning', '已结束': 'info', '已归档': 'danger' }
  return map[status] || ''
}
</script>

<style scoped>
.stats-row { margin-bottom: 20px; }
.stat-card { display: flex; align-items: center; padding: 24px; border-radius: 8px; color: #fff; }
.stat-1 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.stat-2 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.stat-3 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.stat-4 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.stat-icon { width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.stat-info { margin-left: 20px; }
.stat-num { font-size: 28px; font-weight: bold; }
.stat-label { font-size: 14px; opacity: 0.9; margin-top: 4px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.quick-actions { display: flex; flex-direction: column; }
</style>
