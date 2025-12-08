import { v4 as uuidv4 } from 'uuid'
import { User, UserRole, GeneratedResult } from '../types'
import * as historyApi from './api/history'
import { useAuthStore } from '../stores/auth'

const USERS_KEY = 'redflow_users'
const CURRENT_USER_KEY = 'redflow_current_user'
const HISTORY_KEY_PREFIX = 'redflow_history_'

const compressImage = (source: string | File, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const processImage = (src: string) => {
      const img = new Image()
      img.onload = () => {
        let w = img.width
        let h = img.height
        
        if (w > maxWidth) {
          h = (h * maxWidth) / w
          w = maxWidth
        }
        
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context unavailable'))
          return
        }
        
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => reject(new Error('Image load failed during compression'))
      img.src = src
    }

    if (source instanceof File) {
      const reader = new FileReader()
      reader.onload = (e) => processImage(e.target?.result as string)
      reader.onerror = reject
      reader.readAsDataURL(source)
    } else {
      processImage(source)
    }
  })
}

// 用户管理（保留localStorage用于兼容，但主要使用API）
export const registerUser = (username: string, email: string): User => {
  const usersStr = localStorage.getItem(USERS_KEY)
  const users: User[] = usersStr ? JSON.parse(usersStr) : []
  
  const existingUser = users.find(u => u.email === email)
  if (existingUser) {
    return existingUser
  }
  
  const newUser: User = {
    id: uuidv4(),
    username,
    email,
    role: UserRole.USER
  }
  
  users.push(newUser)
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  return newUser
}

export const loginUser = (email: string): User | null => {
  const usersStr = localStorage.getItem(USERS_KEY)
  const users: User[] = usersStr ? JSON.parse(usersStr) : []
  
  const user = users.find(u => u.email === email)
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
    return user
  }
  
  return null
}

export const getCurrentUser = (): User | null => {
  const currentUserStr = localStorage.getItem(CURRENT_USER_KEY)
  if (currentUserStr) {
    return JSON.parse(currentUserStr)
  }
  return null
}

export const logoutUser = () => {
  localStorage.removeItem(CURRENT_USER_KEY)
}

export const updateUserTokenUsage = (userId: string, additionalTokens: number) => {
  const usersStr = localStorage.getItem(USERS_KEY)
  if (usersStr) {
    const users: User[] = JSON.parse(usersStr)
    const userIndex = users.findIndex(u => u.id === userId)
    if (userIndex >= 0) {
      users[userIndex].totalTokenUsage = (users[userIndex].totalTokenUsage || 0) + additionalTokens
      localStorage.setItem(USERS_KEY, JSON.stringify(users))
      
      const currentUser = getCurrentUser()
      if (currentUser && currentUser.id === userId) {
        currentUser.totalTokenUsage = users[userIndex].totalTokenUsage
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser))
      }
    }
  }
}

/**
 * 保存历史记录到服务器
 */
export const saveHistoryItem = async (userId: string, result: GeneratedResult) => {
  try {
    console.log('=== saveHistoryItem 开始（使用API） ===')
    console.log('用户ID:', userId)
    console.log('记录ID:', result.id)
    console.log('模式:', result.mode)
    
    if (!userId) {
      console.error('❌ 用户ID为空，无法保存历史记录')
      return
    }

    // 转换为API格式
    const apiData = historyApi.convertToApiFormat(result)
    
    // 调用API创建历史记录
    const response = await historyApi.createHistory({
      ...apiData,
      topic: result.topic || '',
      projectName: result.projectName || '未命名项目',
      projectDescription: result.projectDescription
    })

    if (response.success && response.data?.id) {
      console.log('✅ 历史记录保存成功！记录ID:', response.data.id)
      return response.data.id
    } else {
      console.error('❌ 历史记录保存失败:', response.message)
      throw new Error(response.message || '保存失败')
    }
  } catch (error) {
    console.error('保存历史记录错误:', error)
    throw error
  }
}

/**
 * 从服务器获取用户历史记录
 */
export const getUserHistory = async (userId: string): Promise<GeneratedResult[]> => {
  try {
    console.log(`=== 从API加载用户 ${userId} 的历史记录 ===`)
    
    // 调用API获取历史记录列表
    const response = await historyApi.getHistoryList(1, 100) // 获取前100条
    
    if (response.success && response.data) {
      const records = response.data.data || []
      console.log(`✅ 加载历史记录成功，共 ${records.length} 条`)
      
      // 转换为GeneratedResult格式
      return records.map(record => ({
        id: record.id,
        userId: userId,
        topic: record.topic,
        projectName: record.projectName,
        projectDescription: record.projectDescription,
        mode: record.mode as 'TEXT_TO_IMAGE' | 'IMAGE_TO_IMAGE',
        status: 'COMPLETED' as const,
        createdAt: record.createdAt,
        originalImageUrl: record.coverImage || '',
        generatedImageUrl: record.coverImage || ''
      }))
    } else {
      console.warn('获取历史记录失败:', response.message)
      return []
    }
  } catch (error) {
    console.error('加载历史记录错误:', error)
    return []
  }
}

/**
 * 获取历史记录详情（包括完整数据）
 */
export const getHistoryDetail = async (id: string): Promise<GeneratedResult | null> => {
  try {
    const response = await historyApi.getHistoryDetail(id)
    
    if (response.success && response.data?.data) {
      const detail = response.data.data
      
      return {
        id: detail.id,
        userId: detail.userId,
        topic: detail.topic,
        projectName: detail.projectName,
        projectDescription: detail.projectDescription,
        mode: detail.mode,
        status: 'COMPLETED' as const,
        outline: detail.outline,
        pages: detail.pages?.map((page: any, index: number) => ({
          index: page.index ?? index,
          title: page.title || '',
          content: page.content || '',
          imageUrl: detail.images?.find((img: any) => img.pageIndex === (page.index ?? index))?.imageUrl,
          imagePrompt: detail.images?.find((img: any) => img.pageIndex === (page.index ?? index))?.imagePrompt
        })),
        createdAt: detail.createdAt,
        originalImageUrl: detail.images?.[0]?.imageUrl || '',
        generatedImageUrl: detail.images?.[0]?.imageUrl || ''
      }
    }
    
    return null
  } catch (error) {
    console.error('获取历史记录详情错误:', error)
    return null
  }
}
