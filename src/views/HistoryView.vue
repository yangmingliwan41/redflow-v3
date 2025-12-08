<template>
  <PageContainer size="xl">
    <PageHeader
      title="历史记录"
      subtitle="查看和管理你的创作历史"
    />

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="history.length === 0" class="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      <h3>暂无历史记录</h3>
      <p>开始创作后，你的作品会显示在这里</p>
    </div>

    <div v-else class="history-grid">
      <div
        v-for="item in history"
        :key="item.id"
        class="history-card"
        @click="openDetail(item)"
      >
        <div v-if="item.originalImageUrl || (item.pages && item.pages[0]?.imageUrl)" class="card-image">
          <img :src="item.originalImageUrl || item.pages?.[0]?.imageUrl" alt="Preview" />
          <!-- 类型标签 -->
          <div class="card-type-badge">
            <span v-if="item.topic">📝 文本生成</span>
            <span v-else>🖼️ 图生图</span>
          </div>
        </div>
        <div class="card-content">
          <h4>{{ item.projectName || item.analysis?.name || item.topic || '未命名作品' }}</h4>
          <p class="card-meta">
            {{ new Date(item.createdAt || 0).toLocaleDateString() }}
            <span v-if="item.pages" class="page-count"> · {{ item.pages.length }} 页</span>
          </p>
          <div v-if="item.marketingCopy" class="card-preview">
            {{ item.marketingCopy.substring(0, 100) }}...
          </div>
          <div v-else-if="item.topic" class="card-preview">
            {{ item.topic }}
          </div>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <HistoryDetailModal
      :visible="detailModalVisible"
      :item="selectedItem"
      @close="closeDetailModal"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getUserHistory, getHistoryDetail } from '../services/storage'
import { GeneratedResult } from '../types'
import HistoryDetailModal from '../components/HistoryDetailModal.vue'
import { PageContainer, PageHeader } from '../components/layout'

const route = useRoute()
const authStore = useAuthStore()
const loading = ref(false)
const history = ref<GeneratedResult[]>([])
const detailModalVisible = ref(false)
const selectedItem = ref<GeneratedResult | null>(null)

const loadHistory = async () => {
  console.log('=== 开始加载历史记录（使用API） ===')
  loading.value = true
  
  try {
    if (!authStore.isAuthenticated || !authStore.user) {
      console.warn('用户未登录，无法加载历史记录')
      history.value = []
      return
    }

    console.log('当前用户:', authStore.user.id, authStore.user.username)
    const userHistory = await getUserHistory(authStore.user.id)
    console.log('加载历史记录:', {
      userId: authStore.user.id,
      count: userHistory.length,
      items: userHistory.map(h => ({
        id: h.id,
        mode: h.mode,
        topic: h.topic,
        projectName: h.projectName,
        createdAt: h.createdAt
      }))
    })
    
    history.value = userHistory
    console.log('=== 历史记录加载完成，显示数量:', history.value.length, '===')
  } catch (error) {
    console.error('加载历史记录失败:', error)
    history.value = []
  } finally {
    loading.value = false
  }
}

const openDetail = async (item: GeneratedResult) => {
  try {
    // 如果item没有完整数据，从API获取详情
    if (!item.pages || item.pages.length === 0) {
      const detail = await getHistoryDetail(item.id)
      if (detail) {
        selectedItem.value = detail
      } else {
        selectedItem.value = item
      }
    } else {
      selectedItem.value = item
    }
    detailModalVisible.value = true
  } catch (error) {
    console.error('获取历史记录详情失败:', error)
    selectedItem.value = item
    detailModalVisible.value = true
  }
}

const closeDetailModal = () => {
  detailModalVisible.value = false
  selectedItem.value = null
}

// 监听路由变化，重新加载历史记录
watch(() => route.path, (newPath) => {
  if (newPath === '/history') {
    loadHistory()
  }
})

onMounted(() => {
  loadHistory()
})
</script>

<style scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-state svg {
  margin: 0 auto 24px;
  color: #ddd;
}

.empty-state h3 {
  font-size: 18px;
  margin: 0 0 8px 0;
  color: #666;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.history-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.history-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.card-image {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: #f5f5f5;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-type-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.card-content {
  padding: 16px;
}

.card-content h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  font-size: 12px;
  color: #999;
  margin: 0 0 12px 0;
}

.page-count {
  margin-left: 4px;
}

.card-preview {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
</style>
