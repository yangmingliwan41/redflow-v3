import axios, { AxiosInstance, AxiosError } from 'axios'

// API基础URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

/**
 * 创建Axios实例
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true, // 允许携带Cookie（Session）
  headers: {
    'Content-Type': 'application/json'
  }
})

/**
 * 请求拦截器
 */
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加token等
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * 响应拦截器
 */
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError) => {
    // 处理401未授权错误
    if (error.response?.status === 401) {
      // 清除本地状态
      if (typeof window !== 'undefined') {
        // 触发登出事件，让应用处理
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      }
    }
    
    // 统一错误处理
    const message = (error.response?.data as any)?.message || error.message || '请求失败'
    return Promise.reject(new Error(message))
  }
)

export default apiClient

/**
 * API响应类型
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  total?: number
  page?: number
  limit?: number
}

