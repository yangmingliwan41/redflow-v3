import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { query } from '../config/database.js'
import { hashPassword, comparePassword } from '../utils/password.js'
import { isValidEmail, validatePassword, validateUsername } from '../utils/validation.js'

const router = express.Router()

/**
 * POST /api/auth/register
 * 用户注册
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段'
      })
    }

    // 验证用户名
    const usernameValidation = validateUsername(username)
    if (!usernameValidation.valid) {
      return res.status(400).json({
        success: false,
        message: usernameValidation.message
      })
    }

    // 验证邮箱
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: '邮箱格式不正确'
      })
    }

    // 验证密码
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      })
    }

    // 检查用户名是否已存在
    const existingUserByUsername = await query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    )
    if (existingUserByUsername.length > 0) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      })
    }

    // 检查邮箱是否已存在
    const existingUserByEmail = await query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    )
    if (existingUserByEmail.length > 0) {
      return res.status(400).json({
        success: false,
        message: '邮箱已被注册'
      })
    }

    // 加密密码
    const passwordHash = await hashPassword(password)

    // 创建用户
    const userId = uuidv4()
    await query(
      'INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [userId, username, email, passwordHash, 'USER']
    )

    // 创建Session
    req.session.userId = userId
    req.session.username = username
    req.session.email = email
    req.session.role = 'USER'

    res.json({
      success: true,
      user: {
        id: userId,
        username,
        email
      }
    })
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({
      success: false,
      message: '注册失败，请稍后重试'
    })
  }
})

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // 验证输入
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '请填写邮箱和密码'
      })
    }

    // 验证邮箱格式
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: '邮箱格式不正确'
      })
    }

    // 查找用户
    const users = await query(
      'SELECT id, username, email, password_hash, role FROM users WHERE email = ?',
      [email]
    )

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      })
    }

    const user = users[0]

    // 验证密码
    const isPasswordValid = await comparePassword(password, user.password_hash)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      })
    }

    // 创建Session
    req.session.userId = user.id
    req.session.username = user.username
    req.session.email = user.email
    req.session.role = user.role

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试'
    })
  }
})

/**
 * POST /api/auth/logout
 * 用户登出
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('登出错误:', err)
      return res.status(500).json({
        success: false,
        message: '登出失败'
      })
    }
    res.json({
      success: true
    })
  })
})

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
router.get('/me', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: '未登录'
      })
    }

    const users = await query(
      'SELECT id, username, email, role, avatar FROM users WHERE id = ?',
      [req.session.userId]
    )

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    const user = users[0]
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    })
  } catch (error) {
    console.error('获取用户信息错误:', error)
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    })
  }
})

export default router

