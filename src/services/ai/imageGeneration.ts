/**
 * 图片生成服务
 */

import { ProductAnalysis, GenerationSettings, TokenUsage } from '../../types'
import { logger } from '../../composables/useLogger'
import { callGoogleGenAIAPI } from './google'
import { fileToGenerativePart } from '../../utils'
import { generateId } from '../../utils'
import { isMockMode, mockGenerateStyledImage, mockGeneratePageImage } from './mock'
import { STORAGE_KEYS, API_CONFIG } from '../../config/constants'
import { useApi } from '../../composables/useApi'

const { getApiKey: getApiKeyFromStorage } = useApi()

/**
 * 生成风格化图片（图生图模式）
 */
export async function generateStyledImage(
  originalFile: File,
  analysis: ProductAnalysis,
  style: string,
  settings?: GenerationSettings
): Promise<{ imageUrl: string | null; usage: TokenUsage }> {
  if (isMockMode()) {
    logger.debug('🧪 [模拟模式] 生成风格化图片')
    return await mockGenerateStyledImage(originalFile, analysis, style, settings)
  }

  const emptyUsage: TokenUsage = { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 }
  if (style === 'none') return { imageUrl: null, usage: emptyUsage }

  // 根据风格生成对应的 prompt
  let stylePrompt = ''
  switch (style) {
    case 'ins_minimal':
      stylePrompt = 'Minimalist, clean white or neutral background, soft lighting, high-end editorial look, instagram aesthetic.'
      break
    case 'cream_ins':
      stylePrompt = 'Soft, warm cream tones, gentle lighting, cozy and inviting atmosphere, instagram-worthy aesthetic.'
      break
    case 'japanese_wood':
      stylePrompt = 'Japanese minimalist style, natural wood textures, clean lines, zen atmosphere, warm natural lighting.'
      break
    case 'warm_home':
      stylePrompt = 'Cozy home atmosphere, warm lighting, comfortable furniture, soft textures, warm color palette, homey and inviting feeling.'
      break
    case 'furniture_size':
      stylePrompt = 'Professional furniture photography, clear size reference, clean background, studio lighting, product-focused composition.'
      break
    case 'dopamine':
      stylePrompt = 'Vibrant, colorful, energetic, high contrast, playful, eye-catching, joyful aesthetic.'
      break
    case 'luxury':
      stylePrompt = 'Luxurious, premium, sophisticated, elegant, high-end materials, refined lighting, exclusive feeling.'
      break
    case 'poster':
      stylePrompt = 'Marketing poster style, bold design, eye-catching layout, commercial photography, professional advertising look.'
      break
    case 'tech_future':
      stylePrompt = 'Futuristic, tech-inspired, modern, sleek, cool tones, innovative, cutting-edge aesthetic.'
      break
    case 'nature_fresh':
      stylePrompt = 'Natural, fresh, organic, green elements, natural lighting, earthy tones, fresh and clean feeling.'
      break
    default:
      stylePrompt = 'Professional product photography, clean background, good lighting.'
  }

  const { mimeType, data } = await fileToGenerativePart(originalFile)
  const additionalContext = settings?.additionalContext || ''

  let imagePrompt = ''
  if (settings?.customPrompts?.enable && settings.customPrompts.imageGenerationTemplate) {
    // 使用自定义模板
    imagePrompt = settings.customPrompts.imageGenerationTemplate
      .replace(/\{\{stylePrompt\}\}/g, stylePrompt)
      .replace(/\{\{name\}\}/g, analysis.name)
      .replace(/\{\{colors\}\}/g, analysis.colors.join(', '))
      .replace(/\{\{materials\}\}/g, analysis.materials.join(', '))
      .replace(/\{\{features\}\}/g, analysis.features.join(', '))
      .replace(/\{\{additionalContext\}\}/g, additionalContext)
  } else {
    // 使用默认模板
    imagePrompt = `【CRITICAL一致性约束 - 必须严格遵守】
1. 产品主体100%保持一致：
   - 颜色：必须完全匹配参考图中的${analysis.colors.join(', ')}色，不得有任何色差或变色
   - 形状：产品的外形、轮廓、尺寸比例必须与参考图完全一致，不得变形、拉伸或扭曲
   - 材质：${analysis.materials.join(', ')}的质感、纹理、反光特性必须与参考图一致
   - 细节：产品的所有细节特征（${analysis.features.join(', ')}）必须完整保留，不得缺失或改变
   
2. 允许修改的内容（仅限以下）：
   - 背景：可以更换为符合${stylePrompt}风格的背景
   - 布光：可以调整光线角度和强度，但必须保持产品的真实质感
   - 构图：可以微调产品位置以适应3:4竖版格式，但产品本身不得变形

3. 严格禁止的修改：
   - 禁止改变产品的任何物理属性（颜色、形状、材质、纹理、尺寸比例）
   - 禁止添加或删除产品的任何部分或细节
   - 禁止添加水印、文字、logo或任何标记

【风格要求】${stylePrompt}

【格式要求】小红书3:4竖版格式（1024x1365像素），产品主体居中，顶部和底部留出文案空间。

${additionalContext}`
  }

  const requestId = generateId('styled')
  logger.debug(`[${requestId}] 开始生成风格化图片`, {
    style,
    hasAnalysis: !!analysis
  })

  try {
    const result = await callGoogleGenAIAPI(imagePrompt, [{ mimeType, data }], {
      model: getApiKeyFromStorage(STORAGE_KEYS.GOOGLE_MODEL) || API_CONFIG.DEFAULT_GOOGLE_MODEL,
      temperature: 1.0,
      responseFormat: 'image'
    })

    if (!result.imageData) {
      logger.error(`[${requestId}] ❌ 图片生成失败: 未找到图片数据`)
      throw new Error('No image generated')
    }

    logger.debug(`[${requestId}] ✅ 风格化图片生成成功`)
    return {
      imageUrl: result.imageData,
      usage: result.usage
    }
  } catch (error) {
    logger.error(`[${requestId}] Image generation failed:`, error)
    return { imageUrl: null, usage: emptyUsage }
  }
}

/**
 * 生成页面图片（文本生成图文模式）
 */
export async function generatePageImage(
  pageContent: string,
  pageIndex: number,
  totalPages: number,
  fullOutline: string,
  topic: string,
  pageType: 'cover' | 'content' | 'summary' = 'content',
  customPrompt?: string,
  imagePrompt?: string
): Promise<{ imageUrl: string; usage: TokenUsage }> {
  if (isMockMode()) {
    logger.debug(`🧪 [模拟模式] 生成第 ${pageIndex + 1} 页图片`)
    return await mockGeneratePageImage(pageContent, pageIndex)
  }

  // 如果当前页内容为空，使用兜底内容，避免空 prompt 导致模型拒绝或报错
  let safePageContent = pageContent
  if (!safePageContent || !safePageContent.trim()) {
    if (imagePrompt && imagePrompt.trim()) {
      safePageContent = `配图建议：${imagePrompt.trim()}`
    } else {
      safePageContent = `本页为${pageType === 'cover' ? '封面' : pageType === 'summary' ? '总结' : '内容'}页，主题：${topic}。请根据整体大纲生成一张适配的小红书风格图片。`
    }
  }

  // 使用自定义 prompt 或默认内置模板
  let prompt = customPrompt || ''
  
  if (!prompt) {
    // 默认使用预设的图文生成 Prompt 模板
    prompt = `请生成一张小红书风格的图文内容图片。
【合规特别注意的】注意不要带有任何小红书的logo，不要有右下角的用户id以及logo
【合规特别注意的】用户给到的参考图片里如果有水印和logo（尤其是注意右下角，左上角），请一定要去掉

页面内容：
${safePageContent}

页面类型：${pageType}

${pageType !== 'cover' ? '如果当前页面类型不是封面页的话，你要参考最后一张图片作为封面的样式\n\n后续生成风格要严格参考封面的风格，要保持风格统一。' : ''}

设计要求：

1. 整体风格
- 小红书爆款图文风格
- 清新、精致、有设计感
- 适合年轻人审美
- 配色和谐，视觉吸引力强

2. 文字排版
- 文字清晰可读，字号适中
- 重要信息突出显示
- 排版美观，留白合理
- 支持 emoji 和符号
- 如果是封面，标题要大而醒目

3. 视觉元素
- 背景简洁但不单调
- 可以有装饰性元素（如图标、插画）
- 配色温暖或清新
- 保持专业感

4. 页面类型特殊要求

${pageType === 'cover' ? `[封面] 类型：
- 标题占据主要位置，字号最大
- 副标题居中或在标题下方
- 整体设计要有吸引力和冲击力
- 背景可以更丰富，有视觉焦点` : `[内容] 类型：
- 信息层次分明
- 列表项清晰展示
- 重点内容用颜色或粗体强调
- 可以有小图标辅助说明`}

5. 技术规格
- 竖版 3:4 比例（小红书标准）
- 高清画质
- 适合手机屏幕查看
- 所有文字内容必须完整呈现
- 【特别注意】无论是给到的图片还是参考文字，请仔细思考，让其符合正确的竖屏观看的排版，不能左右旋转或者是倒置。

6. 整体风格一致性
为确保所有页面风格统一，请参考完整的内容大纲和用户原始需求来确定：
- 整体色调和配色方案
- 设计风格（清新/科技/温暖/专业等）
- 视觉元素的一致性
- 排版布局的统一风格

用户原始需求：
${topic}

完整内容大纲参考：
---
${fullOutline}
---`
  } else {
    // 替换自定义prompt中的变量
    prompt = prompt
      .replace(/\{\{page_content\}\}/g, pageContent)
      .replace(/\{\{page_type\}\}/g, pageType)
      .replace(/\{\{page_index\}\}/g, String(pageIndex + 1))
      .replace(/\{\{total_pages\}\}/g, String(totalPages))
      .replace(/\{\{topic\}\}/g, topic)
      .replace(/\{\{full_outline\}\}/g, fullOutline)
  }
  
  // 如果有用户编辑的配图建议，优先使用
  let imageSuggestionText = ''
  if (imagePrompt && imagePrompt.trim()) {
    imageSuggestionText = `\n\n用户配图建议：${imagePrompt.trim()}`
  } else {
    // 如果没有用户配图建议，尝试从内容中提取（优先使用安全内容）
    const match = safePageContent.match(/(?:配图建议|图片建议|建议配图)[：:\s]+\s*(.+?)(?=\n\n|\n$|$)/is)
    if (match && match[1]) {
      imageSuggestionText = `\n\n配图建议：${match[1].trim()}`
    }
  }
  
  prompt += imageSuggestionText

  // 调试模式：如果启用了调试模式，在控制台输出原始prompt
  const isDebugMode = localStorage.getItem(STORAGE_KEYS.PROMPT_DEBUG_MODE) === 'true'
  if (isDebugMode) {
    logger.debug(`[图片生成 Prompt 调试] 第 ${pageIndex + 1} 页 (${pageType}):`, prompt)
  }

  const requestId = generateId(`page_${pageIndex}`)
  logger.debug(`[${requestId}] 开始生成第 ${pageIndex + 1} 页图片`, {
    pageType,
    hasCustomPrompt: !!customPrompt,
    hasImagePrompt: !!imagePrompt
  })

  try {
    const result = await callGoogleGenAIAPI(prompt, [], {
      model: getApiKeyFromStorage(STORAGE_KEYS.GOOGLE_MODEL) || API_CONFIG.DEFAULT_GOOGLE_MODEL,
      temperature: 1.0,
      responseFormat: 'image'
    })

    if (!result.imageData) {
      logger.error(`[${requestId}] ❌ 第 ${pageIndex + 1} 页图片生成失败: 未找到图片数据`)
      throw new Error('No image generated')
    }

    // 确保 imageData 是有效的字符串
    const imageUrl = typeof result.imageData === 'string' ? result.imageData : String(result.imageData)
    
    logger.debug(`[${requestId}] ✅ 第 ${pageIndex + 1} 页图片生成成功`)

    return {
      imageUrl: imageUrl,
      usage: result.usage
    }
  } catch (error) {
    logger.error(`[${requestId}] Page image generation failed:`, error)
    throw error
  }
}

