import apiClient, { ApiResponse } from './client'
import { GeneratedResult } from '../../types/generation'

export interface HistoryRecord {
  id: string
  topic: string
  projectName: string
  projectDescription?: string
  mode: 'TEXT_TO_IMAGE' | 'IMAGE_TO_IMAGE'
  status: string
  coverImage?: string
  createdAt: number
  updatedAt: number
}

export interface HistoryDetail extends HistoryRecord {
  userId: string
  outline?: any
  pages?: Array<{
    index: number
    title: string
    content: string
    imageUrl?: string
    imagePrompt?: string
  }>
  images?: Array<{
    id: string
    pageIndex: number
    imageUrl: string
    imagePrompt?: string
  }>
}

export interface HistoryListResponse {
  data: HistoryRecord[]
  total: number
  page: number
  limit: number
}

/**
 * 获取历史记录列表
 */
export const getHistoryList = async (
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<HistoryListResponse>> => {
  const response = await apiClient.get<ApiResponse<HistoryListResponse>>('/history', {
    params: { page, limit }
  })
  return response.data
}

/**
 * 获取历史记录详情
 */
export const getHistoryDetail = async (id: string): Promise<ApiResponse<{ data: HistoryDetail }>> => {
  const response = await apiClient.get<ApiResponse<{ data: HistoryDetail }>>(`/history/${id}`)
  return response.data
}

/**
 * 创建历史记录
 */
export const createHistory = async (data: {
  topic: string
  projectName: string
  projectDescription?: string
  mode: 'TEXT_TO_IMAGE' | 'IMAGE_TO_IMAGE'
  outline?: any
  pages?: any[]
  images?: Array<{
    pageIndex: number
    imageUrl: string
    imagePrompt?: string
  }>
}): Promise<ApiResponse<{ id: string }>> => {
  const response = await apiClient.post<ApiResponse<{ id: string }>>('/history', data)
  return response.data
}

/**
 * 更新历史记录
 */
export const updateHistory = async (
  id: string,
  data: Partial<{
    topic: string
    projectName: string
    projectDescription: string
    outline: any
    pages: any[]
    images: Array<{
      pageIndex: number
      imageUrl: string
      imagePrompt?: string
    }>
  }>
): Promise<ApiResponse> => {
  const response = await apiClient.put<ApiResponse>(`/history/${id}`, data)
  return response.data
}

/**
 * 删除历史记录
 */
export const deleteHistory = async (id: string): Promise<ApiResponse> => {
  const response = await apiClient.delete<ApiResponse>(`/history/${id}`)
  return response.data
}

/**
 * 将GeneratedResult转换为API格式
 */
export const convertToApiFormat = (result: GeneratedResult): {
  topic: string
  projectName: string
  projectDescription?: string
  mode: 'TEXT_TO_IMAGE' | 'IMAGE_TO_IMAGE'
  outline?: any
  pages?: any[]
  images?: Array<{
    pageIndex: number
    imageUrl: string
    imagePrompt?: string
  }>
} => {
  const images = result.pages?.map((page, index) => ({
    pageIndex: page.index ?? index,
    imageUrl: page.imageUrl || '',
    imagePrompt: page.imagePrompt
  })).filter(img => img.imageUrl) || []

  return {
    topic: result.topic || '',
    projectName: result.projectName || '未命名项目',
    projectDescription: result.projectDescription,
    mode: result.mode || 'TEXT_TO_IMAGE',
    outline: result.outline,
    pages: result.pages,
    images
  }
}

