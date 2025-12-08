import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { query, transaction } from '../config/database.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

/**
 * GET /api/history
 * 获取用户历史记录列表（分页）
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.userId
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const offset = (page - 1) * limit

    // 获取总数
    const countResult = await query(
      'SELECT COUNT(*) as total FROM history_records WHERE user_id = ?',
      [userId]
    )
    const total = countResult[0].total

    // 获取历史记录列表
    const records = await query(
      `SELECT id, topic, project_name, project_description, mode, status, created_at, updated_at
       FROM history_records
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    )

    // 为每条记录获取第一张图片作为封面
    const recordsWithImages = await Promise.all(
      records.map(async (record) => {
        const images = await query(
          'SELECT image_url FROM history_images WHERE history_id = ? ORDER BY page_index LIMIT 1',
          [record.id]
        )
        return {
          ...record,
          coverImage: images.length > 0 ? images[0].image_url : null
        }
      })
    )

    res.json({
      success: true,
      data: recordsWithImages,
      total,
      page,
      limit
    })
  } catch (error) {
    console.error('获取历史记录列表错误:', error)
    res.status(500).json({
      success: false,
      message: '获取历史记录失败'
    })
  }
})

/**
 * GET /api/history/:id
 * 获取单条历史记录详情（包括所有图片）
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.userId
    const recordId = req.params.id

    // 获取历史记录
    const records = await query(
      'SELECT * FROM history_records WHERE id = ? AND user_id = ?',
      [recordId, userId]
    )

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: '历史记录不存在'
      })
    }

    const record = records[0]

    // 获取所有图片
    const images = await query(
      'SELECT * FROM history_images WHERE history_id = ? ORDER BY page_index',
      [recordId]
    )

    // 解析JSON字段
    const outline = record.outline ? JSON.parse(record.outline) : null
    const pages = record.pages ? JSON.parse(record.pages) : null

    // 构建返回数据
    const result = {
      id: record.id,
      userId: record.user_id,
      topic: record.topic,
      projectName: record.project_name,
      projectDescription: record.project_description,
      mode: record.mode,
      status: record.status,
      outline,
      pages: pages || [],
      images: images.map(img => ({
        id: img.id,
        pageIndex: img.page_index,
        imageUrl: img.image_url,
        imagePrompt: img.image_prompt
      })),
      createdAt: record.created_at.getTime(),
      updatedAt: record.updated_at.getTime()
    }

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取历史记录详情错误:', error)
    res.status(500).json({
      success: false,
      message: '获取历史记录详情失败'
    })
  }
})

/**
 * POST /api/history
 * 创建历史记录
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.userId
    const {
      topic,
      projectName,
      projectDescription,
      mode,
      outline,
      pages,
      images
    } = req.body

    // 验证必填字段
    if (!topic || !projectName || !mode) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段：topic, projectName, mode'
      })
    }

    // 验证模式
    if (!['TEXT_TO_IMAGE', 'IMAGE_TO_IMAGE'].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: '无效的模式'
      })
    }

    const recordId = uuidv4()

    // 使用事务创建历史记录和图片
    await transaction(async (connection) => {
      // 插入历史记录
      await connection.execute(
        `INSERT INTO history_records 
         (id, user_id, topic, project_name, project_description, mode, outline, pages, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recordId,
          userId,
          topic,
          projectName,
          projectDescription || null,
          mode,
          outline ? JSON.stringify(outline) : null,
          pages ? JSON.stringify(pages) : null,
          'completed'
        ]
      )

      // 插入图片记录
      if (images && Array.isArray(images) && images.length > 0) {
        for (const image of images) {
          const imageId = uuidv4()
          await connection.execute(
            `INSERT INTO history_images 
             (id, history_id, page_index, image_url, image_prompt)
             VALUES (?, ?, ?, ?, ?)`,
            [
              imageId,
              recordId,
              image.pageIndex || image.page_index || 0,
              image.imageUrl || image.image_url || '',
              image.imagePrompt || image.image_prompt || null
            ]
          )
        }
      }
    })

    res.json({
      success: true,
      data: {
        id: recordId
      }
    })
  } catch (error) {
    console.error('创建历史记录错误:', error)
    res.status(500).json({
      success: false,
      message: '创建历史记录失败'
    })
  }
})

/**
 * PUT /api/history/:id
 * 更新历史记录
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.userId
    const recordId = req.params.id
    const {
      topic,
      projectName,
      projectDescription,
      outline,
      pages,
      images
    } = req.body

    // 验证记录是否存在且属于当前用户
    const existingRecords = await query(
      'SELECT id FROM history_records WHERE id = ? AND user_id = ?',
      [recordId, userId]
    )

    if (existingRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: '历史记录不存在'
      })
    }

    // 构建更新字段
    const updateFields = []
    const updateValues = []

    if (topic !== undefined) {
      updateFields.push('topic = ?')
      updateValues.push(topic)
    }
    if (projectName !== undefined) {
      updateFields.push('project_name = ?')
      updateValues.push(projectName)
    }
    if (projectDescription !== undefined) {
      updateFields.push('project_description = ?')
      updateValues.push(projectDescription)
    }
    if (outline !== undefined) {
      updateFields.push('outline = ?')
      updateValues.push(JSON.stringify(outline))
    }
    if (pages !== undefined) {
      updateFields.push('pages = ?')
      updateValues.push(JSON.stringify(pages))
    }

    if (updateFields.length > 0) {
      updateValues.push(recordId, userId)
      await query(
        `UPDATE history_records 
         SET ${updateFields.join(', ')} 
         WHERE id = ? AND user_id = ?`,
        updateValues
      )
    }

    // 更新图片（如果提供）
    if (images && Array.isArray(images)) {
      await transaction(async (connection) => {
        // 删除旧图片
        await connection.execute(
          'DELETE FROM history_images WHERE history_id = ?',
          [recordId]
        )

        // 插入新图片
        for (const image of images) {
          const imageId = uuidv4()
          await connection.execute(
            `INSERT INTO history_images 
             (id, history_id, page_index, image_url, image_prompt)
             VALUES (?, ?, ?, ?, ?)`,
            [
              imageId,
              recordId,
              image.pageIndex || image.page_index || 0,
              image.imageUrl || image.image_url || '',
              image.imagePrompt || image.image_prompt || null
            ]
          )
        }
      })
    }

    res.json({
      success: true,
      message: '更新成功'
    })
  } catch (error) {
    console.error('更新历史记录错误:', error)
    res.status(500).json({
      success: false,
      message: '更新历史记录失败'
    })
  }
})

/**
 * DELETE /api/history/:id
 * 删除历史记录
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.userId
    const recordId = req.params.id

    // 验证记录是否存在且属于当前用户
    const existingRecords = await query(
      'SELECT id FROM history_records WHERE id = ? AND user_id = ?',
      [recordId, userId]
    )

    if (existingRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: '历史记录不存在'
      })
    }

    // 删除历史记录（级联删除会同时删除关联的图片）
    await query(
      'DELETE FROM history_records WHERE id = ? AND user_id = ?',
      [recordId, userId]
    )

    res.json({
      success: true,
      message: '删除成功'
    })
  } catch (error) {
    console.error('删除历史记录错误:', error)
    res.status(500).json({
      success: false,
      message: '删除历史记录失败'
    })
  }
})

export default router

