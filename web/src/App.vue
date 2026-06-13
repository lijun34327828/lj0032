<template>
  <el-container class="layout-container">
    <el-aside width="220px" class="aside">
      <div class="logo">
        <el-icon :size="28" color="#409EFF"><Bicycle /></el-icon>
        <span class="logo-text">骑行俱乐部</span>
      </div>
      <el-menu
        :default-active="$route.path"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>工作台</span>
        </el-menu-item>
        <el-menu-item index="/activities">
          <el-icon><Calendar /></el-icon>
          <span>活动管理</span>
        </el-menu-item>
        <el-menu-item index="/members">
          <el-icon><User /></el-icon>
          <span>会员档案</span>
        </el-menu-item>
        <el-menu-item index="/equipment">
          <el-icon><Tools /></el-icon>
          <span>器材台账</span>
        </el-menu-item>
        <el-menu-item index="/rentals">
          <el-icon><Tickets /></el-icon>
          <span>租赁管理</span>
        </el-menu-item>
        <el-menu-item index="/damage">
          <el-icon><Warning /></el-icon>
          <span>损耗登记</span>
        </el-menu-item>
        <el-menu-item index="/archive">
          <el-icon><Folder /></el-icon>
          <span>活动归档</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <span class="page-title">{{ $route.meta.title || '系统首页' }}</span>
        <span class="header-right">管理员</span>
      </el-header>
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app { height: 100%; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
.layout-container { height: 100%; }
.aside { background: #304156; height: 100vh; overflow-y: auto; }
.aside::-webkit-scrollbar { width: 4px; }
.aside::-webkit-scrollbar-thumb { background: #5a6e86; border-radius: 2px; }
.logo { height: 60px; display: flex; align-items: center; padding: 0 20px; color: #fff; background: #2b3a4a; }
.logo-text { margin-left: 10px; font-size: 18px; font-weight: bold; color: #fff; }
.header { background: #fff; border-bottom: 1px solid #e6e6e6; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; }
.page-title { font-size: 18px; font-weight: 600; color: #303133; }
.header-right { color: #606266; font-size: 14px; }
.main-content { background: #f5f7fa; padding: 20px; overflow-y: auto; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.el-menu { border-right: none; }
</style>
