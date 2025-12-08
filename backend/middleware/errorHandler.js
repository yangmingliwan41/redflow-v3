/**
 * 统一错误处理中间件
 */
export const errorHandler = (err, req, res, next) => {
  console.error('错误:', err)

  // 数据库错误
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      success: false,
      message: '数据已存在'
    })
  }

  // 数据库连接错误
  if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    return res.status(500).json({
      success: false,
      message: '数据库连接失败'
    })
  }

  // 默认错误
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器错误'
  })
}

/**
 * 404处理中间件
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  })
}

