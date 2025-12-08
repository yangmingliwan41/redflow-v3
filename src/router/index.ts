import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import HomeView from '../views/HomeView.vue'
import HistoryView from '../views/HistoryView.vue'
import SettingsView from '../views/SettingsView.vue'
import OutlineView from '../views/OutlineView.vue'
import GenerateView from '../views/GenerateView.vue'
import ResultView from '../views/ResultView.vue'
import AuthView from '../views/AuthView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/auth',
      name: 'auth',
      component: AuthView,
      meta: { requiresGuest: true }
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true }
    },
    {
      path: '/text-outline',
      name: 'text-outline',
      component: OutlineView,
      meta: { requiresAuth: true }
    },
    {
      path: '/text-generate',
      name: 'text-generate',
      component: GenerateView,
      meta: { requiresAuth: true }
    },
    {
      path: '/text-result',
      name: 'text-result',
      component: ResultView,
      meta: { requiresAuth: true }
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryView,
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: { requiresAuth: true }
    }
  ]
})

// 导航守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 如果用户信息未初始化，先初始化
  if (!authStore.user && !authStore.loading) {
    await authStore.init()
  }

  // 检查是否需要认证
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // 未登录，重定向到登录页
    next({ name: 'auth', query: { redirect: to.fullPath } })
    return
  }

  // 检查是否需要访客（已登录用户不能访问登录页）
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    // 已登录，重定向到首页
    next({ name: 'home' })
    return
  }

  next()
})

export default router
