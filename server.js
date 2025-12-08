import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import compression from 'compression'
import cors from 'cors'
import dotenv from 'dotenv'
import { createSessionMiddleware } from './backend/config/session.js'
import authRoutes from './backend/routes/auth.js'
import historyRoutes from './backend/routes/history.js'

// 加载环境变量
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// 启用Gzip压缩
app.use(compression())

// CORS配置
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5174',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
app.use(cors(corsOptions))

// 解析请求体
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Session中间件
app.use(createSessionMiddleware())

// 安全头
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  next()
})

// API路由
app.use('/api/auth', authRoutes)
app.use('/api/history', historyRoutes)

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' })
})

// 静态文件服务（用于前端）
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1y',
  etag: true,
  lastModified: true
}))

// SPA路由支持 - 所有非API路由都返回index.html
app.get('*', (req, res, next) => {
  // 如果是API路由，跳过
  if (req.path.startsWith('/api/')) {
    return next()
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err)
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  })
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
  console.log(`📦 Serving static files from ${path.join(__dirname, 'dist')}`)
  console.log(`🔗 API endpoints available at http://localhost:${PORT}/api`)
})
