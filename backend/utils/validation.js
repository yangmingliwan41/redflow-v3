/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否有效
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 验证密码强度
 * @param {string} password - 密码
 * @returns {object} { valid: boolean, message: string }
 */
export const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return {
      valid: false,
      message: '密码长度至少为6位'
    }
  }
  
  if (password.length > 50) {
    return {
      valid: false,
      message: '密码长度不能超过50位'
    }
  }
  
  return {
    valid: true,
    message: '密码格式正确'
  }
}

/**
 * 验证用户名格式
 * @param {string} username - 用户名
 * @returns {object} { valid: boolean, message: string }
 */
export const validateUsername = (username) => {
  if (!username || username.trim().length === 0) {
    return {
      valid: false,
      message: '用户名不能为空'
    }
  }
  
  if (username.length < 3) {
    return {
      valid: false,
      message: '用户名长度至少为3位'
    }
  }
  
  if (username.length > 50) {
    return {
      valid: false,
      message: '用户名长度不能超过50位'
    }
  }
  
  // 只允许字母、数字、下划线、中文字符
  const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/
  if (!usernameRegex.test(username)) {
    return {
      valid: false,
      message: '用户名只能包含字母、数字、下划线和中文'
    }
  }
  
  return {
    valid: true,
    message: '用户名格式正确'
  }
}

