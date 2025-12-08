import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'redflow_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'redflow_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
})

// 测试数据库连接
pool.getConnection()
  .then(connection => {
    console.log('✅ 数据库连接成功')
    connection.release()
  })
  .catch(err => {
    console.error('❌ 数据库连接失败:', err.message)
    console.error('请检查数据库配置和连接信息')
  })

// 查询方法
export const query = async (sql, params = []) => {
  try {
    const [results] = await pool.execute(sql, params)
    return results
  } catch (error) {
    console.error('数据库查询错误:', error)
    throw error
  }
}

// 事务方法
export const transaction = async (callback) => {
  const connection = await pool.getConnection()
  await connection.beginTransaction()
  
  try {
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export default pool

