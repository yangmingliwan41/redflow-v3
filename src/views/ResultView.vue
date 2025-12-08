<template>
  <div class="container">
    <div class="page-header">
      <div>
        <h1 class="page-title">创作完成</h1>
        <p class="page-subtitle">恭喜！你的小红书图文已生成完毕，共 {{ store.images.length }} 张</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-download-all" @click="downloadAllContent" title="一键下载文字和图片">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          一键下载
        </button>
        <button class="btn" @click="startOver" style="background: white; border: 1px solid var(--border-color);">
          再来一篇
        </button>
      </div>
    </div>

    <!-- 项目信息编辑卡片 -->
    <div class="card project-info-card">
      <div class="project-header">
        <h3>项目信息</h3>
        <button v-if="!isEditing" class="edit-btn" @click="startEdit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          编辑
        </button>
      </div>
      
      <div v-if="!isEditing" class="project-display">
        <div class="project-name-display">{{ store.projectName || store.topic || '未命名项目' }}</div>
        <div v-if="store.projectDescription" class="project-desc-display">{{ store.projectDescription }}</div>
        <div v-else class="project-desc-placeholder">暂无简介</div>
      </div>
      
      <div v-else class="project-edit">
        <div class="form-group">
          <label>项目名称</label>
          <input 
            v-model="editProjectName" 
            type="text" 
            placeholder="输入项目名称"
            class="form-input"
            maxlength="50"
          />
        </div>
        <div class="form-group">
          <label>项目简介</label>
          <textarea 
            v-model="editProjectDescription" 
            placeholder="输入项目简介（可选）"
            class="form-textarea"
            rows="3"
            maxlength="200"
          ></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" @click="cancelEdit">取消</button>
          <button class="btn btn-primary" @click="saveProjectInfo">保存</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="grid-cols-4">
        <div v-for="image in store.images" :key="image.index" class="image-card group">
          <!-- Image Area -->
          <div 
            v-if="image.url" 
            style="position: relative; aspect-ratio: 3/4; overflow: hidden; cursor: pointer;" 
            @click="viewImage(image.url)"
          >
            <img
              :src="image.url"
              :alt="`第 ${image.index + 1} 页`"
              style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s;"
              @error="handleImageError(image)"
              @load="handleImageLoad(image)"
            />
            <!-- Regenerating Overlay -->
            <div v-if="regeneratingIndex === image.index" style="position: absolute; inset: 0; background: rgba(255,255,255,0.8); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10;">
               <div class="spinner" style="width: 24px; height: 24px; border-width: 2px; border-color: var(--primary); border-top-color: transparent;"></div>
               <span style="font-size: 12px; color: var(--primary); margin-top: 8px; font-weight: 600;">重绘中...</span>
            </div>
            
            <!-- Hover Overlay -->
            <div v-else style="position: absolute; inset: 0; background: rgba(0,0,0,0.3); opacity: 0; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;" class="hover-overlay">
              预览大图
            </div>
          </div>
          
          <!-- Action Bar -->
          <div style="padding: 12px; border-top: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; color: var(--text-sub);">Page {{ image.index + 1 }}</span>
            <div style="display: flex; gap: 8px;">
              <button 
                style="border: none; background: none; color: var(--text-sub); cursor: pointer; display: flex; align-items: center;"
                title="重新生成此图"
                @click="handleRegenerate(image)"
                :disabled="regeneratingIndex === image.index"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 4v6h-6"></path>
                  <path d="M1 20v-6h6"></path>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
              </button>
              <button 
                style="border: none; background: none; color: var(--primary); cursor: pointer; font-size: 12px;"
                @click="downloadOne(image)"
              >
                下载
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTextGeneratorStore } from '../stores/textGenerator'
import { generatePageImage } from '../services/ai'
import { getCurrentUser, saveHistoryItem } from '../services/storage'
import { ProcessingMode } from '../types'
import { v4 as uuidv4 } from 'uuid'

const router = useRouter()
const store = useTextGeneratorStore()
const regeneratingIndex = ref<number | null>(null)
const isEditing = ref(false)
const editProjectName = ref('')
const editProjectDescription = ref('')

// 项目信息编辑
const startEdit = () => {
  editProjectName.value = store.projectName || store.topic || ''
  editProjectDescription.value = store.projectDescription || ''
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
}

const saveProjectInfo = async () => {
  if (!editProjectName.value.trim()) {
    alert('项目名称不能为空')
    return
  }
  
  store.setProjectName(editProjectName.value.trim())
  store.setProjectDescription(editProjectDescription.value.trim())
  isEditing.value = false
  
  // 更新历史记录
  const user = getCurrentUser()
  if (user && store.recordId) {
    const historyItem = {
      id: store.recordId,
      topic: store.topic,
      projectName: store.projectName,
      projectDescription: store.projectDescription,
      outline: store.outline.raw,
      pages: store.outline.pages.map((page, idx) => ({
        index: page.index,
        title: page.type === 'cover' ? '封面' : `第${idx}页`,
        content: page.content,
        imageUrl: store.images.find(img => img.index === page.index)?.url
      })),
      originalImageUrl: store.images[0]?.url || '',
      status: 'COMPLETED' as const,
      createdAt: Date.now(),
      userId: user.id,
      mode: 'TEXT_TO_IMAGE' as const
    }
    
    await saveHistoryItem(user.id, historyItem)
  }
}

// 确保保存到历史记录
onMounted(async () => {
  // 无论是否有recordId，都尝试保存/更新历史记录，确保数据完整性
  const user = getCurrentUser()
  
  if (!user) {
    console.warn('⚠️ ResultView: 未找到用户，无法保存历史记录')
    // 尝试创建默认用户
    try {
      const { registerUser, loginUser } = await import('../services/storage')
      const defaultUser = registerUser('default_user', 'default@example.com')
      console.log('已创建默认用户:', defaultUser.id)
      loginUser(defaultUser.email)
      // 递归调用，使用新创建的用户
      await saveHistoryToResultView(defaultUser.id)
    } catch (e) {
      console.error('创建默认用户失败:', e)
    }
    return
  }
  
  if (store.images.length > 0) {
    await saveHistoryToResultView(user.id)
  } else {
    console.warn('⚠️ ResultView: 没有图片数据，跳过历史记录保存')
  }
})

// 提取保存历史记录的逻辑
const saveHistoryToResultView = async (userId: string) => {
  try {
    // 自动生成项目名称（如果还没有）
    if (!store.projectName) {
      store.setProjectName(store.topic.length > 20 ? store.topic.substring(0, 20) + '...' : store.topic)
    }
    
    // 确保所有图片都已生成（只保存成功生成的图片）
    const completedImages = store.images.filter(img => img.status === 'done' && img.url)
    
    if (completedImages.length === 0) {
      console.warn('⚠️ ResultView: 没有成功生成的图片，跳过历史记录保存')
      return
    }
    
    // 使用已有的recordId，如果没有则创建新的
    const recordId = store.recordId || uuidv4()
    
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
      originalImageUrl: completedImages[0]?.url || '',
      generatedImageUrl: completedImages[0]?.url || '', // 确保包含生成的图片
      status: 'COMPLETED' as const,
      createdAt: Date.now(),
      userId: userId,
      mode: ProcessingMode.TEXT_TO_IMAGE // 使用枚举值
    }
    
    console.log('=== ResultView: 保存历史记录 ===', historyItem)
    await saveHistoryItem(userId, historyItem)
    console.log('=== ResultView: 历史记录保存完成 ===')
    
    // 更新store中的recordId
    store.recordId = recordId
    
    // 验证保存
    const { getUserHistory } = await import('../services/storage')
    const savedHistory = getUserHistory(userId)
    console.log('验证：当前用户的历史记录数量:', savedHistory.length)
    if (savedHistory.length > 0) {
      const latestRecord = savedHistory.find(h => h.id === recordId)
      if (latestRecord) {
        console.log('✅ 历史记录验证成功！记录ID:', recordId)
      } else {
        console.warn('⚠️ 历史记录验证：未找到对应记录，但保存操作已完成')
      }
    }
  } catch (error) {
    console.error('❌ ResultView: 保存历史记录时出错:', error)
  }
}

const viewImage = (url: string) => {
  window.open(url, '_blank')
}

const handleImageError = (image: any) => {
  console.error(`图片加载失败 (第 ${image.index + 1} 页):`, image.url)
  console.error('图片URL类型:', image.url?.startsWith('data:') ? 'Base64' : 'URL')
  console.error('图片URL长度:', image.url?.length)
}

const handleImageLoad = (image: any) => {
  console.log(`✅ 图片加载成功 (第 ${image.index + 1} 页)`)
}

const startOver = () => {
  store.reset()
  router.push('/')
}

const downloadOne = (image: any) => {
  if (image.url) {
    const link = document.createElement('a')
    link.href = image.url
    link.download = `redflow_page_${image.index + 1}.png`
    link.click()
  }
}

// 一键下载文字和图片
const downloadAllContent = () => {
  try {
    // 1. 先下载文字内容
    downloadTextContent()
    
    // 2. 延迟下载图片，避免浏览器阻止多个下载
    setTimeout(() => {
      downloadAllImages()
    }, 500)
    
    console.log('✅ 开始下载文字和图片')
  } catch (error) {
    console.error('❌ 下载失败:', error)
    alert('下载失败: ' + (error as Error).message)
  }
}

// 下载完整文字内容（从outline.pages提取，纯文本格式）
const downloadTextContent = () => {
  try {
    // 从outline.pages中提取完整文字内容
    let textContent = ''
    
    // 添加项目信息（可选）
    if (store.projectName || store.topic) {
      textContent += `${store.projectName || store.topic}\n\n`
    }
    
    if (store.projectDescription) {
      textContent += `${store.projectDescription}\n\n`
      textContent += `${'='.repeat(50)}\n\n`
    }
    
    // 添加每页内容
    store.outline.pages.forEach((page, idx) => {
      const pageTitle = page.type === 'cover' ? '封面' : `第${idx}页`
      textContent += `【${pageTitle}】\n\n`
      
      if (page.content) {
        textContent += `${page.content}\n\n`
      }
      
      // 不包含配图建议，只包含文字内容
      textContent += `${'-'.repeat(50)}\n\n`
    })
    
    // 创建下载链接（纯文本格式）
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${store.projectName || store.topic || 'redflow'}_文字内容.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    console.log('✅ 文字内容下载成功')
  } catch (error) {
    console.error('❌ 下载文字内容失败:', error)
    alert('下载文字内容失败: ' + (error as Error).message)
  }
}

// 下载所有图片
const downloadAllImages = () => {
  const imagesToDownload = store.images.filter(img => img.url && img.status === 'done')
  
  if (imagesToDownload.length === 0) {
    console.warn('没有可下载的图片')
    return
  }
  
  imagesToDownload.forEach((image, index) => {
    setTimeout(() => {
      const link = document.createElement('a')
      link.href = image.url
      link.download = `${store.projectName || 'redflow'}_第${image.index + 1}页.png`
      link.click()
    }, index * 300)
  })
  
  console.log(`✅ 开始下载 ${imagesToDownload.length} 张图片`)
}


const handleRegenerate = async (image: any) => {
  if (regeneratingIndex.value !== null) return

  regeneratingIndex.value = image.index
  try {
    const page = store.outline.pages.find(p => p.index === image.index)
    if (!page) {
      alert('无法找到对应页面的内容')
      return
    }

    // 获取自定义prompt
    const customImagePrompt = localStorage.getItem('CUSTOM_IMAGE_PROMPT') || undefined
    
    const result = await generatePageImage(
      page.content,
      page.index,
      store.outline.pages.length,
      store.outline.raw,
      store.topic,
      page.type,
      customImagePrompt || undefined,
      (page as any).imagePrompt || undefined
    )
    store.updateImage(image.index, result.imageUrl)
  } catch (e: any) {
    alert('重绘失败: ' + e.message)
  } finally {
    regeneratingIndex.value = null
  }
}
</script>

<style scoped>
.page-header {
  max-width: 1400px;
  margin: 0 auto 30px auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-download-all {
  background: var(--primary);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-download-all:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
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

.image-card:hover .hover-overlay {
  opacity: 1;
}

.image-card:hover img {
  transform: scale(1.05);
}

.spinner {
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.project-info-card {
  margin-bottom: 24px;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.project-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.edit-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--primary-light);
  color: var(--primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: var(--primary);
  color: white;
}

.project-display {
  padding: 16px;
  background: var(--bg-body);
  border-radius: var(--radius-md);
}

.project-name-display {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 8px;
}

.project-desc-display {
  font-size: 14px;
  color: var(--text-sub);
  line-height: 1.6;
}

.project-desc-placeholder {
  font-size: 13px;
  color: var(--text-secondary);
  font-style: italic;
}

.project-edit {
  padding: 16px;
  background: var(--bg-body);
  border-radius: var(--radius-md);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-main);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-fade);
}

.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-fade);
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn-secondary {
  background: white;
  color: var(--text-main);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-body);
}
</style>

