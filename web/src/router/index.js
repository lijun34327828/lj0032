import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '工作台' } },
  { path: '/activities', component: () => import('../views/Activities.vue'), meta: { title: '活动管理' } },
  { path: '/activities/:id', component: () => import('../views/ActivityDetail.vue'), meta: { title: '活动详情' } },
  { path: '/members', component: () => import('../views/Members.vue'), meta: { title: '会员档案' } },
  { path: '/equipment', component: () => import('../views/Equipment.vue'), meta: { title: '器材台账' } },
  { path: '/rentals', component: () => import('../views/Rentals.vue'), meta: { title: '租赁管理' } },
  { path: '/damage', component: () => import('../views/Damage.vue'), meta: { title: '损耗登记' } },
  { path: '/archive', component: () => import('../views/Archive.vue'), meta: { title: '活动归档' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = (to.meta.title ? to.meta.title + ' - ' : '') + '骑行俱乐部管理系统'
  next()
})

export default router
