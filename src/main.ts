import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import './assets/css/base.css'
import './assets/css/variables.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// 初始化用户认证状态
const authStore = useAuthStore()
authStore.init().then(() => {
  app.mount('#app')
})





