<template>
  <div class="auth-view">
    <div class="auth-container">
      <Card class="auth-card" shadow="lg">
        <template #header>
          <div class="auth-header">
            <h1 class="auth-title">红流云创</h1>
            <p class="auth-subtitle">AI驱动的图文创作助手</p>
          </div>
        </template>

        <div class="auth-tabs">
          <button
            :class="['auth-tab', { 'auth-tab--active': activeTab === 'login' }]"
            @click="activeTab = 'login'"
          >
            登录
          </button>
          <button
            :class="['auth-tab', { 'auth-tab--active': activeTab === 'register' }]"
            @click="activeTab = 'register'"
          >
            注册
          </button>
        </div>

        <!-- 登录表单 -->
        <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="auth-form">
          <div class="form-group">
            <Input
              v-model="loginForm.email"
              type="email"
              label="邮箱"
              placeholder="请输入邮箱"
              required
              :error="loginError.email"
            />
          </div>
          <div class="form-group">
            <Input
              v-model="loginForm.password"
              type="password"
              label="密码"
              placeholder="请输入密码"
              required
              :error="loginError.password"
            />
          </div>
          <div v-if="authStore.error" class="error-message">
            {{ authStore.error }}
          </div>
          <Button
            type="submit"
            variant="primary"
            size="large"
            block
            :loading="authStore.loading"
            class="auth-submit"
          >
            登录
          </Button>
        </form>

        <!-- 注册表单 -->
        <form v-if="activeTab === 'register'" @submit.prevent="handleRegister" class="auth-form">
          <div class="form-group">
            <Input
              v-model="registerForm.username"
              type="text"
              label="用户名"
              placeholder="请输入用户名（3-50位）"
              required
              :error="registerError.username"
            />
          </div>
          <div class="form-group">
            <Input
              v-model="registerForm.email"
              type="email"
              label="邮箱"
              placeholder="请输入邮箱"
              required
              :error="registerError.email"
            />
          </div>
          <div class="form-group">
            <Input
              v-model="registerForm.password"
              type="password"
              label="密码"
              placeholder="请输入密码（至少6位）"
              required
              :error="registerError.password"
            />
          </div>
          <div class="form-group">
            <Input
              v-model="registerForm.confirmPassword"
              type="password"
              label="确认密码"
              placeholder="请再次输入密码"
              required
              :error="registerError.confirmPassword"
            />
          </div>
          <div v-if="authStore.error" class="error-message">
            {{ authStore.error }}
          </div>
          <Button
            type="submit"
            variant="primary"
            size="large"
            block
            :loading="authStore.loading"
            class="auth-submit"
          >
            注册
          </Button>
        </form>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Card from '../components/ui/Card.vue'
import Input from '../components/ui/Input.vue'
import Button from '../components/ui/Button.vue'

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref<'login' | 'register'>('login')

const loginForm = ref({
  email: '',
  password: ''
})

const registerForm = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const loginError = ref({
  email: '',
  password: ''
})

const registerError = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const validateLogin = () => {
  let valid = true
  loginError.value = { email: '', password: '' }

  if (!loginForm.value.email) {
    loginError.value.email = '请输入邮箱'
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginForm.value.email)) {
    loginError.value.email = '邮箱格式不正确'
    valid = false
  }

  if (!loginForm.value.password) {
    loginError.value.password = '请输入密码'
    valid = false
  }

  return valid
}

const validateRegister = () => {
  let valid = true
  registerError.value = { username: '', email: '', password: '', confirmPassword: '' }

  if (!registerForm.value.username) {
    registerError.value.username = '请输入用户名'
    valid = false
  } else if (registerForm.value.username.length < 3) {
    registerError.value.username = '用户名至少3位'
    valid = false
  } else if (registerForm.value.username.length > 50) {
    registerError.value.username = '用户名不能超过50位'
    valid = false
  }

  if (!registerForm.value.email) {
    registerError.value.email = '请输入邮箱'
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.value.email)) {
    registerError.value.email = '邮箱格式不正确'
    valid = false
  }

  if (!registerForm.value.password) {
    registerError.value.password = '请输入密码'
    valid = false
  } else if (registerForm.value.password.length < 6) {
    registerError.value.password = '密码至少6位'
    valid = false
  }

  if (!registerForm.value.confirmPassword) {
    registerError.value.confirmPassword = '请确认密码'
    valid = false
  } else if (registerForm.value.password !== registerForm.value.confirmPassword) {
    registerError.value.confirmPassword = '两次密码不一致'
    valid = false
  }

  return valid
}

const handleLogin = async () => {
  authStore.clearError()
  if (!validateLogin()) {
    return
  }

  const result = await authStore.login(loginForm.value.email, loginForm.value.password)
  if (result.success) {
    router.push('/')
  }
}

const handleRegister = async () => {
  authStore.clearError()
  if (!validateRegister()) {
    return
  }

  const result = await authStore.register(
    registerForm.value.username,
    registerForm.value.email,
    registerForm.value.password
  )
  if (result.success) {
    router.push('/')
  }
}

onMounted(() => {
  // 如果已登录，重定向到首页
  if (authStore.isAuthenticated) {
    router.push('/')
  }
})
</script>

<style scoped>
.auth-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.auth-container {
  width: 100%;
  max-width: 400px;
}

.auth-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.auth-header {
  text-align: center;
  padding: 20px 0;
}

.auth-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin: 0 0 8px 0;
}

.auth-subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.auth-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
}

.auth-tab {
  flex: 1;
  padding: 16px;
  background: none;
  border: none;
  font-size: 16px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
  border-bottom: 2px solid transparent;
}

.auth-tab:hover {
  color: #667eea;
}

.auth-tab--active {
  color: #667eea;
  border-bottom-color: #667eea;
  font-weight: 600;
}

.auth-form {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.error-message {
  padding: 12px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 20px;
}

.auth-submit {
  margin-top: 8px;
}
</style>

