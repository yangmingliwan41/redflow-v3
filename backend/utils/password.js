import bcrypt from 'bcrypt'

const SALT_ROUNDS = 10

/**
 * 加密密码
 * @param {string} password - 明文密码
 * @returns {Promise<string>} 加密后的密码哈希
 */
export const hashPassword = async (password) => {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS)
    return hash
  } catch (error) {
    console.error('密码加密错误:', error)
    throw new Error('密码加密失败')
  }
}

/**
 * 验证密码
 * @param {string} password - 明文密码
 * @param {string} hash - 密码哈希
 * @returns {Promise<boolean>} 是否匹配
 */
export const comparePassword = async (password, hash) => {
  try {
    const match = await bcrypt.compare(password, hash)
    return match
  } catch (error) {
    console.error('密码验证错误:', error)
    return false
  }
}

