<template>
  <PageContainer size="xl">
    <PageHeader
      title="生成结果"
    >
      <template #extra>
        <p class="page-subtitle">
          <span v-if="isGenerating">已完成 {{ completedCount }} / {{ store.progress.total }} 页</span>
          <span v-else-if="hasFailedImages">{{ failedCount }} 张图片生成失败，可点击重试</span>
          <span v-else>全部 {{ store.progress.total }} 张图片生成完成</span>
        </p>
      </template>
      <template #actions>
        <Button
          v-if="hasFailedImages && !isGenerating"
          variant="primary"
          :loading="isRetrying"
          @click="retryAllFailed"
        >
          {{ isRetrying ? '补全中...' : '一键补全失败图片' }}
        </Button>
        <Button
          v-if="!isGenerating && store.progress.status === 'done' && store.recordId"
          variant="primary"
          @click="handleRegenerateAll"
        >
          重新生成全部图片
        </Button>
        <Button variant="secondary" @click="router.push('/text-outline')">
          返回大纲
        </Button>
      </template>
    </PageHeader>

    <Card>
      <Progress
        label="生成进度"
        :percentage="progressPercent"
        show-percentage
      />

      <div v-if="error" class="error-msg">
        {{ error }}
      </div>

      <div class="grid-cols-4" style="margin-top: 40px;">
        <div v-for="image in store.images" :key="image.index" class="image-card">
          <!-- 图片展示区域 -->
          <div v-if="image.url && image.status === 'done'" class="image-preview">
            <img :src="image.url" :alt="`第 ${image.index + 1} 页`" />
            <!-- 重新生成按钮（悬停显示） -->
            <div class="image-overlay">
              <button
                class="overlay-btn"
                @click="regenerateImage(image.index)"
                :disabled="isRetrying"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 4v6h-6"></path>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                重新生成
              </button>
            </div>
          </div>

          <!-- 生成中状态 -->
          <div v-else-if="image.status === 'generating'" class="image-placeholder">
            <div class="spinner"></div>
            <div class="status-text">生成中...</div>
          </div>

          <!-- 失败状态 -->
          <div v-else-if="image.status === 'error'" class="image-placeholder error-placeholder">
            <div class="error-icon">!</div>
            <div class="status-text">生成失败</div>
            <button
              class="retry-btn"
              @click="retrySingleImage(image.index)"
              :disabled="isRetrying"
            >
              点击重试
            </button>
          </div>

          <!-- 等待中状态 -->
          <div v-else class="image-placeholder">
            <div class="status-text">等待中</div>
          </div>

          <!-- 底部信息栏 -->
          <div class="image-footer">
            <span class="page-label">Page {{ image.index + 1 }}</span>
            <span class="status-badge" :class="image.status">
              {{ getStatusText(image.status) }}
            </span>
          </div>
        </div>
      </div>
    </Card>

    <!-- 完成提示模态框 -->
    <CompletionModal
      :visible="showCompletionModal"
      :initial-project-name="store.projectName || store.topic"
      :initial-project-description="store.projectDescription"
      @confirm="handleCompletionConfirm"
      @cancel="handleCompletionCancel"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTextGeneratorStore } from '../stores/textGenerator'
import { generatePageImage } from '../services/ai'
import { getCurrentUser, saveHistoryItem, registerUser, loginUser } from '../services/storage'
import { ProcessingMode, ProcessingStatus } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { PageContainer, PageHeader } from '../components/layout'
import { Button, Card, Progress } from '../components/ui'
import CompletionModal from '../components/CompletionModal.vue'

const router = useRouter()
const store = useTextGeneratorStore()

const error = ref('')
const isRetrying = ref(false)
const showCompletionModal = ref(false)

const isGenerating = computed(() => store.progress.status === 'generating')

const progressPercent = computed(() => {
  if (store.progress.total === 0) return 0
  return (store.progress.current / store.progress.total) * 100
})

// 已完成的图片数量（用于顶部“已完成 x / y 页”展示）
const completedCount = computed(() => store.images.filter(img => img.status === 'done').length)

const hasFailedImages = computed(() => store.images.some(img => img.status === 'error'))

const failedCount = computed(() => store.images.filter(img => img.status === 'error').length)

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    generating: '生成中',
    done: '已完成',
    error: '失败'
  }
  return texts[status] || '等待中'
}

// 重试单张图片
async function retrySingleImage(index: number) {
  const page = store.outline.pages.find(p => p.index === index)
  if (!page) return

  store.setImageRetrying(index)

  try {
    const result = await generatePageImage(
      page.content,
      page.index,
      store.outline.pages.length,
      store.outline.raw,
      store.topic,
      page.type,
      undefined,
      (page as any).imagePrompt || undefined
    )
    store.updateImage(index, result.imageUrl)
  } catch (e: any) {
    store.updateProgress(index, 'error', undefined, e.message || String(e))
  }
}

// 重新生成图片
function regenerateImage(index: number) {
  retrySingleImage(index)
}

// 重新生成全部图片（从历史记录返回时使用）
const handleRegenerateAll = () => {
  if (!confirm('确定要重新生成全部图片吗？这将重新调用API并可能产生费用。')) {
    return
  }
  
  // 重置所有图片状态
  store.images.forEach(img => {
    store.updateProgress(img.index, 'generating')
  })
  
  // 重置进度状态
  store.progress.status = 'generating'
  store.progress.current = 0
  
  // 清除recordId，允许重新保存
  store.recordId = null
  
  // 开始生成任务
  if (!generationTask && !isGeneratingTask) {
    generationTask = startGenerationTask()
  }
}

// 批量重试所有失败的图片
async function retryAllFailed() {
  const failedPages = store.getFailedPages()
  if (failedPages.length === 0) return

  isRetrying.value = true

  // 设置所有失败的图片为重试状态
  failedPages.forEach(page => {
    store.setImageRetrying(page.index)
  })

  try {
    // 并发生成所有失败的图片
    await Promise.all(
      failedPages.map(async (page) => {
        try {
          const result = await generatePageImage(
            page.content,
            page.index,
            store.outline.pages.length,
            store.outline.raw,
            store.topic
          )
          store.updateImage(page.index, result.imageUrl)
        } catch (e: any) {
          store.updateProgress(page.index, 'error', undefined, e.message || String(e))
        }
      })
    )
  } catch (e) {
    error.value = '重试失败: ' + String(e)
  } finally {
    isRetrying.value = false
  }
}

// 生成任务是否正在运行
let isGeneratingTask = false
let generationTask: Promise<void> | null = null

// 启动生成任务（可以在组件外部调用，避免路由切换时中断）
const startGenerationTask = async () => {
  if (isGeneratingTask) {
    console.log('⚠️ 生成任务已在运行中，跳过重复启动')
    return
  }
  
  if (store.outline.pages.length === 0) {
    console.warn('没有页面数据，无法生成')
    return
  }

  const taskStartTime = Date.now()
  const taskId = `task_${taskStartTime}_${Math.random().toString(36).substr(2, 9)}`
  console.log(`=== [${taskId}] 开始生成任务 ===`, {
    pagesCount: store.outline.pages.length,
    timestamp: new Date().toISOString()
  })

  isGeneratingTask = true
  store.startGeneration()

  // 获取自定义prompt（从localStorage）
  const customImagePrompt = localStorage.getItem('CUSTOM_IMAGE_PROMPT') || undefined
  
  try {
    // 并发生成所有需要生成的页面，提高整体速度
    const tasks = store.outline.pages.map(async (page) => {
      // 再次检查：如果该页已经成功生成过，则完全跳过，避免重复计费
      const existingImage = store.images.find(img => img.index === page.index)
      if (existingImage && existingImage.status === 'done' && existingImage.url) {
        console.log(`[${taskId}] 跳过已生成的页面 ${page.index + 1}`)
        return
      }

      // 先标记为生成中，防止重复调用
      store.updateProgress(page.index, 'generating')
      
      try {
        console.log(`[${taskId}] 开始生成页面 ${page.index + 1} 的图片...`)
        const result = await generatePageImage(
          page.content,
          page.index,
          store.outline.pages.length,
          store.outline.raw,
          store.topic,
          page.type,
          customImagePrompt || undefined,
          (page as any).imagePrompt || undefined // 传递用户编辑的配图建议
        )
        console.log(`[${taskId}] ✅ 页面 ${page.index + 1} 图片生成成功`)
        store.updateProgress(page.index, 'done', result.imageUrl)
      } catch (e: any) {
        console.error(`[${taskId}] ❌ 页面 ${page.index + 1} 图片生成失败:`, e)
        store.updateProgress(page.index, 'error', undefined, e.message || String(e))
      }
    })

    await Promise.all(tasks)
    
    const taskDuration = Date.now() - taskStartTime
    console.log(`=== [${taskId}] 生成任务完成，耗时: ${taskDuration}ms ===`)
  } finally {
    isGeneratingTask = false
    console.log(`[${taskId}] 生成任务状态已重置`)
  }
}

// 使用 watch 监听生成完成状态并保存历史记录
// 添加防抖标记，避免重复执行
let isSavingHistory = false
let lastCheckTime = 0

// 监听图片状态变化，当所有图片都生成完成时，保存历史记录并跳转
watch(
  () => store.images.map(img => img.status),
  async (statuses) => {
    // 防抖：至少间隔 1 秒才检查一次
    const now = Date.now()
    if (now - lastCheckTime < 1000) {
      return
    }
    lastCheckTime = now

    // 检查是否所有图片都已完成（done状态且有URL）
    const allSucceeded = store.images.length > 0 && 
                        store.images.length === store.outline.pages.length &&
                        store.images.every(img => img.status === 'done' && img.url)
    
    // 检查是否正在生成中或已完成（避免在未开始生成时就触发，但允许在完成后触发）
    const isValidState = store.progress.status === 'generating' || 
                         (store.progress.status === 'done' && !store.recordId) // 如果已完成但未保存记录，也允许保存
    
    console.log('watch 触发检查:', {
      allSucceeded,
      isValidState,
      imagesCount: store.images.length,
      pagesCount: store.outline.pages.length,
      statuses: statuses.join(','),
      progressStatus: store.progress.status,
      hasRecordId: !!store.recordId,
      isSavingHistory
    })
    
    // 如果所有图片都生成成功，且当前状态有效，且未在保存中，且还没有保存过记录
    if (allSucceeded && isValidState && !isSavingHistory && !store.recordId && !showCompletionModal.value) {
      console.log('=== 检测到全部生成成功，显示完成提示模态框 ===')
      isSavingHistory = true // 设置标记，防止重复执行
      
      // 标记生成完成（这会改变 progress.status 为 'done'）
      const taskId = 'task_' + Date.now()
      store.finishGeneration(taskId)
      
      // 显示完成提示模态框
      showCompletionModal.value = true
      
      // 延迟重置标记
      setTimeout(() => {
        isSavingHistory = false
        console.log('isSavingHistory 标记已重置')
      }, 2000)
    }
  },
  { deep: true, immediate: false } // 深度监听，不立即执行
)

// 处理完成提示模态框确认
const handleCompletionConfirm = async (data: { projectName: string; projectDescription: string }) => {
  try {
    // 更新项目信息
    store.setProjectName(data.projectName)
    store.setProjectDescription(data.projectDescription)
    
    // 保存历史记录
    let currentUser = getCurrentUser()
    let userIdToUse: string
    
    if (!currentUser) {
      console.error('❌ 未找到用户，无法保存历史记录')
      // 自动创建默认用户
      try {
        const defaultUser = registerUser('default_user', 'default@example.com')
        console.log('已创建默认用户:', defaultUser.id)
        loginUser(defaultUser.email)
        currentUser = defaultUser
        userIdToUse = defaultUser.id
        await saveHistoryToUser(defaultUser.id)
      } catch (e: any) {
        console.error('创建默认用户失败:', e)
        // 如果用户已存在，尝试登录
        if (e.message && e.message.includes('Email already exists')) {
          try {
            const existingUser = loginUser('default@example.com')
            console.log('使用已存在的默认用户:', existingUser.id)
            currentUser = existingUser
            userIdToUse = existingUser.id
            await saveHistoryToUser(existingUser.id)
          } catch (loginError) {
            console.error('登录默认用户失败:', loginError)
            alert('保存失败：无法创建或登录用户')
            return
          }
        } else {
          alert('保存失败：无法创建用户')
          return
        }
      }
    } else {
      userIdToUse = currentUser.id
      await saveHistoryToUser(currentUser.id)
    }
    
    // 验证保存是否成功（使用正确的用户ID）
    const { getUserHistory } = await import('../services/storage')
    const savedHistory = await getUserHistory(userIdToUse)
    console.log('=== 验证保存结果 ===')
    console.log('使用的用户ID:', userIdToUse)
    console.log('历史记录数量:', savedHistory.length)
    console.log('查找的recordId:', store.recordId)
    
    if (savedHistory.length > 0) {
      console.log('历史记录中的ID列表:', savedHistory.map(h => ({ id: h.id, projectName: h.projectName })))
    }
    
    const savedRecord = savedHistory.find(h => h.id === store.recordId)
    
    if (savedRecord) {
      console.log('✅ 历史记录保存并验证成功！记录ID:', store.recordId)
      console.log('保存的记录:', {
        id: savedRecord.id,
        projectName: savedRecord.projectName,
        topic: savedRecord.topic,
        pagesCount: savedRecord.pages?.length || 0
      })
    } else {
      console.error('❌ 历史记录保存后验证失败！')
      console.error('查找的recordId:', store.recordId)
      console.error('历史记录中的ID列表:', savedHistory.map(h => h.id))
      console.error('可能的原因：用户ID不一致或保存失败')
      
      // 尝试检查所有可能的用户ID
      const allUsersStr = localStorage.getItem('redflow_users')
      if (allUsersStr) {
        const allUsers = JSON.parse(allUsersStr)
        console.log('所有用户列表:', allUsers.map((u: any) => ({ id: u.id, email: u.email })))
        for (const u of allUsers) {
          const userHistory = await getUserHistory(u.id)
          const found = userHistory.find(h => h.id === store.recordId)
          if (found) {
            console.log(`✅ 在用户 ${u.id} 的历史记录中找到记录！`)
            console.log('建议：确保使用正确的用户ID保存和读取')
          }
        }
      }
    }
    
    // 关闭模态框并跳转到结果页
    showCompletionModal.value = false
    setTimeout(() => {
      router.push('/text-result')
    }, 300)
  } catch (error) {
    console.error('保存历史记录时出错:', error)
    alert('保存失败：' + (error as Error).message)
  }
}

// 处理完成提示模态框取消
const handleCompletionCancel = () => {
  showCompletionModal.value = false
  // 取消后仍然跳转到结果页，但不保存历史记录
  setTimeout(() => {
    router.push('/text-result')
  }, 300)
}

// 提取保存历史记录的逻辑
const saveHistoryToUser = async (userId: string) => {
  try {
    // 自动生成项目名称（如果还没有）
    if (!store.projectName) {
      store.setProjectName(store.topic.length > 20 ? store.topic.substring(0, 20) + '...' : store.topic)
    }
    
    // 确保所有图片都已生成（只保存成功生成的图片）
    const completedImages = store.images.filter(img => img.status === 'done' && img.url)
    
    if (completedImages.length === 0) {
      console.warn('⚠️ 没有成功生成的图片，跳过历史记录保存')
      return
    }
    
    // 确保有recordId（如果没有则创建并保存到store）
    const recordId = store.recordId || uuidv4()
    if (!store.recordId) {
      store.recordId = recordId
    }
    
    // 构建历史记录项
    const historyItem = {
      id: recordId,
      topic: store.topic,
      projectName: store.projectName,
      projectDescription: store.projectDescription,
      outline: store.outline.raw,
      pages: store.outline.pages.map((page, idx) => ({
        index: page.index,
        title: page.type === 'cover' ? '封面' : `第${idx}页`,
        content: page.content,
        imageUrl: store.images.find(img => img.index === page.index && img.status === 'done')?.url, // 只保存成功生成的图片
        imagePrompt: (page as any).imagePrompt || undefined
      })),
      originalImageUrl: completedImages[0]?.url || '', // 使用第一张成功生成的图片作为封面
      generatedImageUrl: completedImages[0]?.url || '', // 使用第一张成功生成的图片作为生成图
      status: ProcessingStatus.COMPLETED,
      createdAt: Date.now(),
      userId: userId,
      mode: ProcessingMode.TEXT_TO_IMAGE as ProcessingMode.TEXT_TO_IMAGE // 使用具体枚举值，匹配 GeneratedResult 类型
    }
    
    console.log('=== GenerateView: 准备保存历史记录 ===')
    console.log('历史记录项ID:', historyItem.id)
    console.log('用户ID:', userId)
    console.log('项目名称:', historyItem.projectName)
    console.log('页面数量:', historyItem.pages.length)
    console.log('图片数量:', completedImages.length)
    
    await saveHistoryItem(userId, historyItem)
    
    console.log('=== GenerateView: 历史记录保存完成 ===')
    
    // 验证保存
    const { getUserHistory: verifyGetUserHistory } = await import('../services/storage')
    const verifyHistory = await verifyGetUserHistory(userId)
    console.log('验证：当前用户的历史记录数量:', verifyHistory.length)
    const verifyRecord = verifyHistory.find(h => h.id === recordId)
    if (verifyRecord) {
      console.log('✅ 历史记录验证成功！记录ID:', recordId)
    } else {
      console.error('❌ 历史记录验证失败：保存后未找到记录')
      console.error('查找的recordId:', recordId)
      console.error('历史记录中的ID列表:', verifyHistory.map(h => h.id))
    }
  } catch (error) {
    console.error('❌ 保存历史记录时出错:', error)
  }
}

// 防止重复挂载的标记
let hasMounted = false

onMounted(async () => {
  if (hasMounted) {
    console.warn('⚠️ GenerateView 组件重复挂载，跳过')
    return
  }
  
  if (store.outline.pages.length === 0) {
    router.push('/')
    return
  }

  hasMounted = true
  console.log('=== GenerateView 组件挂载 ===', {
    pagesCount: store.outline.pages.length,
    currentStatus: store.progress.status,
    imagesCount: store.images.length,
    timestamp: new Date().toISOString()
  })

  // 检查是否有卡住的生成状态（所有图片都是generating但没有实际在生成）
  const allStuck = store.images.length > 0 && 
    store.images.every(img => img.status === 'generating' && !img.url) &&
    !isGeneratingTask
  
  if (allStuck) {
    console.warn('⚠️ 检测到所有图片都处于卡住的生成状态，重置状态并重新开始生成')
    // 重置所有卡住的状态
    store.images.forEach(img => {
      if (img.status === 'generating' && !img.url) {
        store.updateProgress(img.index, 'error', undefined, '状态已重置')
      }
    })
    // 重置进度状态
    store.progress.status = 'idle'
  }

  // 检查是否是从历史记录返回的（已有recordId且状态是done，且所有图片都已完成且有URL）
  const isFromHistory = store.recordId && 
                         store.progress.status === 'done' && 
                         store.images.length > 0 && 
                         store.images.every(img => img.status === 'done' && img.url)
  
  if (isFromHistory) {
    console.log('=== 检测到从历史记录返回，不自动开始生成 ===')
    console.log('recordId:', store.recordId)
    console.log('状态:', store.progress.status)
    console.log('图片数量:', store.images.length)
    // 不自动开始生成，等待用户点击"重新生成"按钮
    return
  }

  // 如果已经在生成中，继续生成
  if (store.progress.status === 'generating' && !allStuck) {
    console.log('检测到未完成的生成任务，继续生成...')
    // 检查是否有正在生成的任务
    if (!generationTask && !isGeneratingTask) {
      generationTask = startGenerationTask()
    } else {
      console.log('已有生成任务在运行，等待完成...')
    }
  } else if (store.progress.status === 'idle' || store.images.length === 0) {
    // 新任务：从大纲进入（状态是idle或没有图片），需要初始化并开始生成
    console.log('=== 检测到新任务（从大纲进入），准备开始生成 ===')
    console.log('recordId:', store.recordId)
    console.log('状态:', store.progress.status)
    console.log('图片数量:', store.images.length)
    
    // 初始化生成状态
    store.startGeneration()
    
    // 确保没有正在运行的任务
    if (!generationTask && !isGeneratingTask) {
      generationTask = startGenerationTask()
    } else {
      console.warn('⚠️ 检测到已有任务在运行，跳过新任务启动')
    }
  } else {
    console.log('当前状态:', store.progress.status, '，不自动开始生成')
    console.log('recordId:', store.recordId)
    console.log('图片数量:', store.images.length)
  }
})
</script>

<style scoped>
.page-header {
  max-width: 1400px;
  margin: 0 auto 30px auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 8px;
}

.page-subtitle {
  font-size: 16px;
  color: var(--text-sub);
}

.btn {
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.progress-container {
  width: 100%;
  height: 8px;
  background: var(--bg-body);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--primary);
  transition: width 0.3s;
}

.error-msg {
  margin-top: 16px;
  padding: 12px;
  background: #fff5f5;
  color: #ff4d4f;
  border-radius: var(--radius-md);
}

.grid-cols-4 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
}

.image-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.image-preview {
  aspect-ratio: 3/4;
  overflow: hidden;
  position: relative;
  flex: 1;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.image-preview:hover .image-overlay {
  opacity: 1;
}

.overlay-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
  transition: all 0.2s;
}

.overlay-btn:hover {
  background: var(--primary);
  color: white;
}

.overlay-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.image-placeholder {
  aspect-ratio: 3/4;
  background: #f9f9f9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex: 1;
  min-height: 240px;
}

.error-placeholder {
  background: #fff5f5;
}

.error-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #ff4d4f;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
}

.status-text {
  font-size: 13px;
  color: var(--text-sub);
}

.retry-btn {
  margin-top: 8px;
  padding: 6px 16px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.retry-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.retry-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.image-footer {
  padding: 12px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-label {
  font-size: 12px;
  color: var(--text-sub);
}

.status-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-badge.done {
  background: #E6F7ED;
  color: #52C41A;
}

.status-badge.generating,
.status-badge.retrying {
  background: #E6F4FF;
  color: #1890FF;
}

.status-badge.error {
  background: #FFF1F0;
  color: #FF4D4F;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--primary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

