import apiClient, { ApiResponse } from './client'

export interface User {
  id: string
  username: string
  email: string
  role?: string
  avatar?: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

/**
 * 用户注册
 */
export const register = async (data: RegisterData): Promise<ApiResponse<{ user: User }>> => {
  const response = await apiClient.post<ApiResponse<{ user: User }>>('/auth/register', data)
  return response.data
}

/**
 * 用户登录
 */
export const login = async (data: LoginData): Promise<ApiResponse<{ user: User }>> => {
  const response = await apiClient.post<ApiResponse<{ user: User }>>('/auth/login', data)
  return response.data
}

/**
 * 用户登出
 */
export const logout = async (): Promise<ApiResponse> => {
  const response = await apiClient.post<ApiResponse>('/auth/logout')
  return response.data
}

/**
 * 获取当前用户信息
 */
export const getCurrentUser = async (): Promise<ApiResponse<{ user: User }>> => {
  const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me')
  return response.data
}

