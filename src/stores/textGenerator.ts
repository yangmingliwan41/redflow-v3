import { defineStore } from 'pinia'

export interface Page {
  index: number
  type: 'cover' | 'content' | 'summary'
  content: string
  imageUrl?: string
  imagePrompt?: string // 配图建议，可编辑
}

export interface GeneratedImage {
  index: number
  url: string
  status: 'generating' | 'done' | 'error' | 'retrying'
  error?: string
}

export interface TextGeneratorState {
  // 当前阶段
  stage: 'input' | 'outline' | 'generating' | 'result'

  // 用户输入
  topic: string

  // 项目信息
  projectName: string
  projectDescription: string

  // 大纲数据
  outline: {
    raw: string
    pages: Page[]
  }

  // 生成进度
  progress: {
    current: number
    total: number
    status: 'idle' | 'generating' | 'done' | 'error'
  }

  // 生成结果
  images: GeneratedImage[]

  // 任务ID
  taskId: string | null

  // 历史记录ID
  recordId: string | null
}

const STORAGE_KEY = 'text-generator-state'

// 从 localStorage 加载状态
function loadState(): Partial<TextGeneratorState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('加载状态失败:', e)
  }
  return {}
}

// 保存状态到 localStorage
function saveState(state: TextGeneratorState) {
  try {
    // 为避免 localStorage 空间爆掉，这里只存图片的索引和状态，不存 base64 / URL 本体
    const slimImages = state.images.map(img => ({
      index: img.index,
      status: img.status,
      error: img.error
    }))

    const toSave = {
      stage: state.stage,
      topic: state.topic,
      projectName: state.projectName,
      projectDescription: state.projectDescription,
      outline: state.outline,
      progress: state.progress,
      images: slimImages,
      taskId: state.taskId,
      recordId: state.recordId
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (e) {
    console.error('保存状态失败:', e)
  }
}

export const useTextGeneratorStore = defineStore('textGenerator', {
  state: (): TextGeneratorState => {
    const saved = loadState()
    return {
      stage: saved.stage || 'input',
      topic: saved.topic || '',
      projectName: saved.projectName || '',
      projectDescription: saved.projectDescription || '',
      outline: saved.outline || {
        raw: '',
        pages: []
      },
      progress: saved.progress || {
        current: 0,
        total: 0,
        status: 'idle'
      },
      images: saved.images || [],
      taskId: saved.taskId || null,
      recordId: saved.recordId || null
    }
  },

  actions: {
    // 设置主题
    setTopic(topic: string) {
      this.topic = topic
      // 自动生成项目名称（如果没有设置）
      if (!this.projectName) {
        this.projectName = topic.length > 20 ? topic.substring(0, 20) + '...' : topic
      }
      this.saveToStorage()
    },

    // 设置项目名称
    setProjectName(name: string) {
      this.projectName = name
      this.saveToStorage()
    },

    // 设置项目简介
    setProjectDescription(description: string) {
      this.projectDescription = description
      this.saveToStorage()
    },

    // 设置大纲
    setOutline(raw: string, pages: Page[]) {
      this.outline.raw = raw
      this.outline.pages = pages
      this.stage = 'outline'
      this.saveToStorage()
    },

    // 更新页面
    updatePage(index: number, content: string, imagePrompt?: string) {
      const page = this.outline.pages.find(p => p.index === index)
      if (page) {
        page.content = content
        if (imagePrompt !== undefined) {
          page.imagePrompt = imagePrompt
        }
        this.syncRawFromPages()
        this.saveToStorage()
      }
    },

    // 根据 pages 重新生成 raw 文本
    syncRawFromPages() {
      this.outline.raw = this.outline.pages
        .map((page, idx) => {
          const typeLabel = page.type === 'cover' ? '封面' : '内容'
          return `<page>\ntype: ${page.type}\ncontent: ${page.content}\n</page>`
        })
        .join('\n\n')
    },

    // 删除页面
    deletePage(index: number) {
      this.outline.pages = this.outline.pages.filter(p => p.index !== index)
      // 重新索引
      this.outline.pages.forEach((page, idx) => {
        page.index = idx
      })
      this.syncRawFromPages()
      this.saveToStorage()
    },

    // 添加页面
    addPage(type: 'cover' | 'content', content: string = '') {
      const newPage: Page = {
        index: this.outline.pages.length,
        type,
        content
      }
      this.outline.pages.push(newPage)
      this.syncRawFromPages()
      this.saveToStorage()
    },

    // 移动页面 (拖拽排序)
    movePage(fromIndex: number, toIndex: number) {
      const pages = [...this.outline.pages]
      const [movedPage] = pages.splice(fromIndex, 1)
      pages.splice(toIndex, 0, movedPage)

      // 重新索引
      pages.forEach((page, idx) => {
        page.index = idx
      })

      this.outline.pages = pages
      this.syncRawFromPages()
      this.saveToStorage()
    },

    // 开始生成
    startGeneration() {
      this.stage = 'generating'
      this.progress.current = 0
      this.progress.total = this.outline.pages.length
      this.progress.status = 'generating'
      this.images = this.outline.pages.map(page => ({
        index: page.index,
        url: '',
        status: 'generating'
      }))
      this.saveToStorage()
    },

    // 更新进度
    updateProgress(index: number, status: 'generating' | 'done' | 'error', url?: string, error?: string) {
      const image = this.images.find(img => img.index === index)
      if (image) {
        const oldStatus = image.status
        image.status = status
        if (url) image.url = url
        if (error) image.error = error
        
        // 只有在状态真正改变时才保存
        if (oldStatus !== status) {
          if (status === 'done') {
            this.progress.current++
          }
          // 使用防抖保存，避免频繁写入
          this.debouncedSave()
        }
      }
    },

    updateImage(index: number, newUrl: string) {
      const image = this.images.find(img => img.index === index)
      if (image) {
        image.url = newUrl
        image.status = 'done'
        delete image.error
      }
      // 同时更新 page 的 imageUrl
      const page = this.outline.pages.find(p => p.index === index)
      if (page) {
        page.imageUrl = newUrl
      }
      this.saveToStorage()
    },

    // 完成生成
    finishGeneration(taskId: string) {
      this.taskId = taskId
      this.stage = 'result'
      this.progress.status = 'done'
      this.saveToStorage()
    },

    // 设置单个图片为重试中状态
    setImageRetrying(index: number) {
      const image = this.images.find(img => img.index === index)
      if (image) {
        image.status = 'retrying'
      }
      this.saveToStorage()
    },

    // 获取失败的图片列表
    getFailedImages() {
      return this.images.filter(img => img.status === 'error')
    },

    // 获取失败图片对应的页面
    getFailedPages() {
      const failedIndices = this.images
        .filter(img => img.status === 'error')
        .map(img => img.index)
      return this.outline.pages.filter(page => failedIndices.includes(page.index))
    },

    // 检查是否有失败的图片
    hasFailedImages() {
      return this.images.some(img => img.status === 'error')
    },

    // 重置
    reset() {
      this.stage = 'input'
      this.topic = ''
      this.projectName = ''
      this.projectDescription = ''
      this.outline = {
        raw: '',
        pages: []
      }
      this.progress = {
        current: 0,
        total: 0,
        status: 'idle'
      }
      this.images = []
      this.taskId = null
      this.recordId = null
      localStorage.removeItem(STORAGE_KEY)
    },

    // 保存当前状态
    saveToStorage() {
      saveState(this)
    },

    // 防抖保存函数
    debouncedSave() {
      if ((this as any)._saveTimer) {
        clearTimeout((this as any)._saveTimer)
      }
      ;(this as any)._saveTimer = setTimeout(() => {
        this.saveToStorage()
        ;(this as any)._saveTimer = null
      }, 500) // 500ms 防抖
    }
  }
})

