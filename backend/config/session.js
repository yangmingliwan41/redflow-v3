import session from 'express-session'
import { query } from './database.js'

// MySQL Session存储实现
class MySQLStore {
  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000) // 每分钟清理一次过期session
  }

  async get(sessionId, callback) {
    try {
      const results = await query(
        'SELECT data FROM sessions WHERE session_id = ? AND expires_at > NOW()',
        [sessionId]
      )
      
      if (results.length > 0) {
        const data = JSON.parse(results[0].data)
        callback(null, data)
      } else {
        callback(null, null)
      }
    } catch (error) {
      callback(error)
    }
  }

  async set(sessionId, sessionData, callback) {
    try {
      const expiresAt = new Date(Date.now() + (sessionData.cookie?.maxAge || 86400000))
      const data = JSON.stringify(sessionData)
      
      await query(
        `INSERT INTO sessions (session_id, user_id, data, expires_at) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE data = ?, expires_at = ?`,
        [
          sessionId,
          sessionData.userId || null,
          data,
          expiresAt,
          data,
          expiresAt
        ]
      )
      
      callback(null)
    } catch (error) {
      callback(error)
    }
  }

  async destroy(sessionId, callback) {
    try {
      await query('DELETE FROM sessions WHERE session_id = ?', [sessionId])
      callback(null)
    } catch (error) {
      callback(error)
    }
  }

  async cleanup() {
    try {
      await query('DELETE FROM sessions WHERE expires_at < NOW()')
    } catch (error) {
      console.error('Session清理错误:', error)
    }
  }

  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

// 创建Session中间件
export const createSessionMiddleware = () => {
  const store = new MySQLStore()
  
  return session({
    store: {
      get: store.get.bind(store),
      set: store.set.bind(store),
      destroy: store.destroy.bind(store)
    },
    secret: process.env.SESSION_SECRET || 'your_secret_key_here',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      sameSite: 'lax'
    },
    name: 'redflow.sid'
  })
}

export default createSessionMiddleware

