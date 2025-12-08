/**
 * 历史记录存储服务
 */

import { GeneratedResult, ProcessingMode } from '../../types'
import { compressImage } from '../../utils'
import { STORAGE_KEYS, HISTORY_CONFIG } from '../../config/constants'
import { logger } from '../../composables/useLogger'

/**
 * 保存历史记录项
 */
export async function saveHistoryItem(
  userId: string,
  result: GeneratedResult
): Promise<void> {
  try {
    logger.debug('=== saveHistoryItem 开始:', { userId, resultId: result.id, mode: result.mode })
    const key = `${STORAGE_KEYS.HISTORY_PREFIX}${userId}`
    const historyStr = localStorage.getItem(key)
    let history: GeneratedResult[] = historyStr ? JSON.parse(historyStr) : []
    logger.debug('当前历史记录数量:', history.length)

    let storedOriginalImage = result.originalImageUrl
    let storedGeneratedImage = result.generatedImageUrl

    // 只有在 IMAGE_TO_IMAGE 模式下才压缩图片
    if (result.mode === ProcessingMode.IMAGE_TO_IMAGE) {
      if (result.originalImageFile || result.originalImageUrl) {
        try {
          storedOriginalImage = await compressImage(result.originalImageFile || result.originalImageUrl)
        } catch (e) {
          logger.warn('Original image compression failed', e)
        }
      }

      if (result.generatedImageUrl) {
        try {
          storedGeneratedImage = await compressImage(result.generatedImageUrl)
        } catch (e) {
          logger.warn('Generated image compression failed', e)
        }
      }
    } else if (result.mode === ProcessingMode.TEXT_TO_IMAGE && result.pages) {
      // TEXT_TO_IMAGE 模式下，页面图片直接使用，不进行二次压缩
      result.pages = result.pages.map(page => ({
        ...page,
        imageUrl: page.imageUrl
      }))
    }

    const itemToSave: GeneratedResult = {
      ...result,
      userId,
      originalImageFile: undefined, // 不保存File对象
      originalImageUrl: storedOriginalImage,
      generatedImageUrl: storedGeneratedImage,
      createdAt: Date.now(),
    }

    const existingIndex = history.findIndex(h => h.id === result.id)
    if (existingIndex >= 0) {
      logger.debug('更新已有历史记录:', existingIndex)
      history[existingIndex] = itemToSave
    } else {
      logger.debug('添加新历史记录')
      history.unshift(itemToSave)
    }

    const trySetItem = (items: GeneratedResult[]) => {
      try {
        logger.debug('保存历史记录到localStorage，数量:', items.length, 'key:', key)
        localStorage.setItem(key, JSON.stringify(items))
        logger.info('✅ 历史记录保存成功！')
      } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
          if (items.length > 1) {
            logger.warn('Storage quota exceeded. Removing oldest item.')
            const reducedItems = items.slice(0, items.length - 1)
            trySetItem(reducedItems)
          } else {
            logger.error('Storage full, cannot save even one item.')
          }
        } else {
          throw e
        }
      }
    }

    trySetItem(history.slice(0, HISTORY_CONFIG.MAX_ITEMS))
  } catch (error) {
    logger.error('❌ Failed to save history:', error)
    throw error
  }
}

/**
 * 获取用户历史记录
 */
export function getUserHistory(userId: string): GeneratedResult[] {
  const key = `${STORAGE_KEYS.HISTORY_PREFIX}${userId}`
  const historyStr = localStorage.getItem(key)
  try {
    logger.debug('=== getUserHistory 开始加载:', { userId, key })
    const history = historyStr ? JSON.parse(historyStr) : []
    logger.debug('=== getUserHistory 成功加载:', { userId, count: history.length })
    if (import.meta.env.DEV) {
      logger.debug('原始localStorage数据:', historyStr?.substring(0, 500) + '...')
      if (history.length > 0) {
        logger.debug('第一条历史记录预览:', history[0])
      }
    }
    return history
  } catch (e) {
    logger.error('❌ 解析历史记录失败，可能数据损坏:', e)
    localStorage.removeItem(key) // 清除损坏的数据
    return []
  }
}

/**
 * 获取所有用户的历史记录（管理员功能）
 */
export function getAllUsersHistory(): GeneratedResult[] {
  const allHistory: GeneratedResult[] = []
  const usersStr = localStorage.getItem(STORAGE_KEYS.USERS)
  const users = usersStr ? JSON.parse(usersStr) : []
  
  for (const user of users) {
    const userHistory = getUserHistory(user.id)
    allHistory.push(...userHistory)
  }
  
  // 按创建时间排序
  return allHistory.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

/**
 * 删除历史记录
 */
export function deleteHistoryItem(userId: string, itemId: string): boolean {
  try {
    const key = `${STORAGE_KEYS.HISTORY_PREFIX}${userId}`
    const historyStr = localStorage.getItem(key)
    if (!historyStr) return false
    
    const history: GeneratedResult[] = JSON.parse(historyStr)
    const filtered = history.filter(item => item.id !== itemId)
    
    if (filtered.length === history.length) {
      return false // 没有找到要删除的项
    }
    
    localStorage.setItem(key, JSON.stringify(filtered))
    logger.debug('历史记录已删除:', itemId)
    return true
  } catch (e) {
    logger.error('删除历史记录失败:', e)
    return false
  }
}

