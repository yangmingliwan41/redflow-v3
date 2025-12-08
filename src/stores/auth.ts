import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '../services/api/auth'
import type { User } from '../services/api/auth'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const isAuthenticated = computed(() => user.value !== null)

  /**
   * 初始化：从服务器获取当前用户信息
   */
  const init = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await authApi.getCurrentUser()
      if (response.success && response.data?.user) {
        user.value = response.data.user
      } else {
        user.value = null
      }
    } catch (err) {
      console.error('获取用户信息失败:', err)
      user.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * 用户注册
   */
  const register = async (username: string, email: string, password: string) => {
    try {
      loading.value = true
      error.value = null
      const response = await authApi.register({ username, email, password })
      if (response.success && response.data?.user) {
        user.value = response.data.user
        return { success: true }
      } else {
        error.value = response.message || '注册失败'
        return { success: false, message: error.value }
      }
    } catch (err: any) {
      error.value = err.message || '注册失败'
      return { success: false, message: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * 用户登录
   */
  const login = async (email: string, password: string) => {
    try {
      loading.value = true
      error.value = null
      const response = await authApi.login({ email, password })
      if (response.success && response.data?.user) {
        user.value = response.data.user
        return { success: true }
      } else {
        error.value = response.message || '登录失败'
        return { success: false, message: error.value }
      }
    } catch (err: any) {
      error.value = err.message || '登录失败'
      return { success: false, message: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * 用户登出
   */
  const logout = async () => {
    try {
      loading.value = true
      await authApi.logout()
      user.value = null
      error.value = null
    } catch (err) {
      console.error('登出失败:', err)
      // 即使API失败，也清除本地状态
      user.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * 清除错误
   */
  const clearError = () => {
    error.value = null
  }

  // 监听未授权事件
  if (typeof window !== 'undefined') {
    window.addEventListener('auth:unauthorized', () => {
      user.value = null
    })
  }

  return {
    // 状态
    user,
    loading,
    error,
    // 计算属性
    isAuthenticated,
    // 方法
    init,
    register,
    login,
    logout,
    clearError
  }
})

