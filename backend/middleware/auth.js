/**
 * 认证中间件
 * 验证用户Session，将用户信息附加到req.user
 */
export const requireAuth = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: '未登录，请先登录'
      })
    }
    
    // 从Session获取用户ID
    req.userId = req.session.userId
    req.user = {
      id: req.session.userId,
      username: req.session.username,
      email: req.session.email,
      role: req.session.role || 'USER'
    }
    
    next()
  } catch (error) {
    console.error('认证中间件错误:', error)
    return res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
}

/**
 * 可选认证中间件
 * 如果已登录，附加用户信息；如果未登录，继续执行
 */
export const optionalAuth = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      req.userId = req.session.userId
      req.user = {
        id: req.session.userId,
        username: req.session.username,
        email: req.session.email,
        role: req.session.role || 'USER'
      }
    }
    next()
  } catch (error) {
    // 可选认证失败不影响请求继续
    next()
  }
}

