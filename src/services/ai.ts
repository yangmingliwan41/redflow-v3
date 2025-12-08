import { ProductAnalysis, GenerationSettings, TokenUsage } from '../types'
import { isMockMode, mockAnalyzeProductImage, mockGenerateMarketingCopy, mockGenerateStyledImage, mockGenerateOutline, mockGeneratePageImage } from './ai-mock'

// Helper to clean string and ensure only ASCII characters
// 注意：API Key 通常只包含字母、数字、连字符等 ASCII 字符
const cleanAsciiString = (str: string): string => {
  if (!str) return ''
  let cleaned = str.trim()
  
  // 移除 Bearer 前缀（如果存在）
  const lower = cleaned.toLowerCase()
  if (lower.startsWith('bearer ')) {
    cleaned = cleaned.slice(7).trim()
  }
  
  // 移除非 ASCII 字符
  return cleaned
    .split('')
    .filter(char => {
      const code = char.charCodeAt(0)
      return code >= 32 && code <= 126 // ASCII 可打印字符
    })
    .join('')
    .trim()
}

// Get API Key from localStorage
const getApiKey = (key: string): string | null => {
  if (typeof window === 'undefined') return null
  const value = localStorage.getItem(key)
  if (!value) return null
  
  // 清理 API Key
  return cleanAsciiString(value)
}

// Convert File to base64 for API
const fileToGenerativePart = async (file: File): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // 移除 data:image/...;base64, 前缀
      const base64 = result.split(',')[1] || result
      resolve({
        mimeType: file.type || 'image/jpeg',
        data: base64
      })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// DeepSeek API 调用
const callDeepSeekAPI = async (prompt: string, systemPrompt?: string): Promise<{ text: string; usage: TokenUsage }> => {
  const apiKey = getApiKey('DEEPSEEK_API_KEY')
  if (!apiKey) {
    throw new Error('DeepSeek API Key not found. Please set DEEPSEEK_API_KEY in localStorage.')
  }

  const endpoint = getApiKey('DEEPSEEK_API_ENDPOINT') || 'https://api.deepseek.com/chat/completions'
  const model = getApiKey('DEEPSEEK_MODEL') || 'deepseek-chat'

  const messages: any[] = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })

  // 使用 Headers 对象确保编码正确
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  headers.set('Authorization', `Bearer ${apiKey}`)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        stream: false
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`DeepSeek API error: ${response.status} ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''
    const usage = data.usage || {}

    return {
      text,
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        candidatesTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0
      }
    }
  } catch (error: any) {
    if (error.message && error.message.includes('ISO-8859-1')) {
      throw new Error(
        'API Key 包含无效字符。请检查 API Key 是否正确，确保没有复制到额外的空格或特殊字符。\n' +
        '建议：重新复制 API Key 并粘贴到设置页面。'
      )
    }
    throw error
  }
}

// Google GenAI API (OpenAI兼容模式)
const callGoogleGenAIAPI = async (
  prompt: string,
  images?: Array<{ mimeType: string; data: string }>,
  options?: {
    model?: string
    temperature?: number
    responseFormat?: 'text' | 'image'
  }
): Promise<{ text?: string; imageData?: string; usage: TokenUsage }> => {
  const apiKey = getApiKey('GOOGLE_API_KEY')
  if (!apiKey) {
    throw new Error('Google API Key not found. Please set GOOGLE_API_KEY in localStorage.')
  }

  const endpoint = getApiKey('GOOGLE_API_ENDPOINT') || 'https://api.laozhang.ai/v1/chat/completions'
  const model = options?.model || getApiKey('GOOGLE_MODEL') || 'gemini-3-pro-image-preview'

  // 构建消息内容
  const content: any[] = []
  
  // 如果有图片，先添加图片
  if (images && images.length > 0) {
    for (const img of images) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${img.mimeType};base64,${img.data}`
        }
      })
    }
  }
  
  // 添加文本
  content.push({
    type: 'text',
    text: prompt
  })

  const messages = [
    {
      role: 'user',
      content: content
    }
  ]

  // 使用 Headers 对象确保编码正确
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  
  // 确保 API Key 是纯 ASCII 字符串
  const cleanApiKey = cleanAsciiString(String(apiKey))
  if (!cleanApiKey) {
    throw new Error('API Key 为空或包含无效字符')
  }
  
  // 检查清理是否改变了 API Key
  const originalKeyStr = String(apiKey)
  if (originalKeyStr !== cleanApiKey) {
    console.warn('API Key 在清理过程中被修改:', {
      originalLength: originalKeyStr.length,
      cleanedLength: cleanApiKey.length,
      originalPrefix: originalKeyStr.substring(0, 20),
      cleanedPrefix: cleanApiKey.substring(0, 20),
      changed: originalKeyStr !== cleanApiKey
    })
  }
  
  // 调试信息
  console.log('API 请求调试信息:', {
    endpoint,
    model,
    apiKeyLength: cleanApiKey.length,
    apiKeyPrefix: cleanApiKey.substring(0, 15) + '...',
    apiKeySuffix: '...' + cleanApiKey.substring(cleanApiKey.length - 10),
    hasImages: images && images.length > 0,
    messagesCount: messages.length,
    firstMessageContentType: messages[0]?.content?.[0]?.type || 'text'
  })
  
  headers.set('Authorization', `Bearer ${cleanApiKey}`)

  try {
    const requestBody = {
      model,
      messages,
      stream: false,
      temperature: options?.temperature || 1.0
    }
    
    // 添加请求日志
    console.log('=== 发送 API 请求 ===', {
      endpoint,
      model,
      hasImages: images && images.length > 0,
      promptLength: prompt.length,
      timestamp: new Date().toISOString()
    })
    
    const startTime = Date.now()
    
    // 图片分析请求可能需要更长时间，设置更长的超时
    const timeoutMs = images && images.length > 0 ? 180000 : 60000 // 有图片时180秒，无图片时60秒
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    const duration = Date.now() - startTime
    
    console.log('=== API 响应 ===', {
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || errorData.message || response.statusText
      
      // 401 错误时提供更详细的调试信息
      if (response.status === 401) {
        console.error('401 认证失败详情:', {
          endpoint,
          model,
          apiKeyLength: cleanApiKey.length,
          apiKeyPrefix: cleanApiKey.substring(0, 15) + '...',
          errorMessage,
          fullError: errorData
        })
        
        // 检查 API Key 是否被意外修改
        const originalKey = getApiKey('GOOGLE_API_KEY')
        if (originalKey && originalKey !== cleanApiKey) {
          console.warn('API Key 在清理过程中被修改:', {
            originalLength: originalKey.length,
            cleanedLength: cleanApiKey.length,
            originalPrefix: originalKey.substring(0, 15),
            cleanedPrefix: cleanApiKey.substring(0, 15)
          })
        }
      }
      
      throw new Error(`Google GenAI API error: ${response.status} ${errorMessage}`)
    }

    const data = await response.json()
    
    // 调试：打印完整响应
    console.log('API 响应数据:', JSON.stringify(data, null, 2))

    // 提取文本或图片
    let text: string | undefined
    let imageData: string | undefined
    
    const message = data.choices?.[0]?.message
    console.log('Message 内容:', message)
    
    if (message?.content) {
      // 检查是否是图片数据
      if (typeof message.content === 'string' && message.content.startsWith('data:image')) {
        imageData = message.content
        console.log('找到图片数据 (string):', imageData.substring(0, 50) + '...')
      } else if (Array.isArray(message.content)) {
        // 多模态内容
        console.log('多模态内容，项目数:', message.content.length)
        for (const item of message.content) {
          console.log('内容项:', item.type, item)
          if (item.type === 'text') {
            text = item.text
          } else if (item.type === 'image_url') {
            imageData = item.image_url?.url
            console.log('找到图片URL:', imageData?.substring(0, 50))
          } else if (item.type === 'image') {
            // 某些API可能直接返回image类型
            imageData = item.image || item.url || item.data
            console.log('找到图片数据 (image类型):', imageData?.substring(0, 50))
          }
        }
      } else {
        text = message.content
      }
    }
    
    // 如果还没有找到图片，检查其他可能的字段（兼容多种返回格式）
    if (!imageData && options?.responseFormat === 'image') {
      console.log('尝试从其他字段提取图片数据...')
      
      // 检查是否有直接的图片数据字段
      if (data.image) {
        imageData = data.image
        console.log('从 data.image 找到图片')
      } else if (data.data?.[0]?.b64_json) {
        // OpenAI Images API 格式
        imageData = `data:image/png;base64,${data.data[0].b64_json}`
        console.log('从 data.data[0].b64_json 找到图片')
      } else if (data.data?.[0]?.url) {
        imageData = data.data[0].url
        console.log('从 data.data[0].url 找到图片')
      }
      
      // 检查 choices[0].message.content 是否为 Markdown 图片链接: ![xxx](url)
      if (!imageData && text) {
        const markdownImageMatch = text.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/)
        if (markdownImageMatch) {
          imageData = markdownImageMatch[1]
          console.log('从 Markdown 图片链接找到:', imageData.substring(0, 50))
        }
      }
      
      // 检查 choices[0].message.content 是否为 data URL
      if (!imageData && text && text.startsWith('data:image')) {
        imageData = text
        console.log('从 text (data URL) 找到图片')
      }
      
      // 检查 choices[0].message.content 是否为纯 URL
      if (!imageData && text && (text.startsWith('http://') || text.startsWith('https://'))) {
        imageData = text.trim()
        console.log('从 text (纯URL) 找到图片')
      }
    }
    
    // 如果 imageData 是 URL，确保它是完整的 URL
    if (imageData && !imageData.startsWith('data:') && !imageData.startsWith('http://') && !imageData.startsWith('https://')) {
      // 如果不是 data URL 也不是 http URL，可能是相对路径，尝试添加协议
      if (imageData.startsWith('//')) {
        imageData = 'https:' + imageData
        console.log('修复相对URL，添加协议')
      } else if (imageData.startsWith('/')) {
        // 如果是绝对路径，需要添加域名（这里可能需要根据实际情况调整）
        console.warn('图片路径是相对路径，可能需要完整URL:', imageData)
      }
    }
    
    // 检查 text 中是否包含 base64 图片数据（可能被包装在其他文本中）
    if (!imageData && text) {
      const base64Match = text.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/)
      if (base64Match) {
        imageData = base64Match[0]
        console.log('✅ 从 text 中提取 base64 图片数据')
      }
    }
    
    // 检查整个响应中是否包含 base64 数据（最后的手段）
    if (!imageData && options?.responseFormat === 'image') {
      try {
        const responseStr = JSON.stringify(data)
        const base64Match = responseStr.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{100,}/)
        if (base64Match) {
          imageData = base64Match[0]
          console.log('✅ 从完整响应中提取 base64 图片数据')
        }
      } catch (e) {
        console.warn('无法序列化响应以搜索图片数据:', e)
      }
    }
    
    console.log('最终提取结果:', { 
      hasText: !!text, 
      hasImage: !!imageData,
      textPreview: text?.substring(0, 100),
      imagePreview: imageData?.substring(0, 100),
      imageType: imageData ? (imageData.startsWith('data:') ? 'Base64' : 'URL') : 'none',
      imageLength: imageData?.length || 0
    })
    
    // 确保 imageData 是有效的
    if (imageData) {
      console.log('✅ 成功提取图片数据，类型:', imageData.startsWith('data:') ? 'Base64' : 'URL', '长度:', imageData.length)
    }
    
    // 如果请求的是图片但没有找到，提供更详细的错误信息
    if (options?.responseFormat === 'image' && !imageData) {
      console.error('图片生成失败：未找到图片数据', {
        responseStructure: Object.keys(data),
        messageStructure: message ? Object.keys(message) : null,
        contentType: typeof message?.content,
        contentPreview: typeof message?.content === 'string' ? message.content.substring(0, 200) : message?.content
      })
    }

    // 提取使用量（OpenAI格式）
    const usage = data.usage || {}
    const tokenUsage: TokenUsage = {
      promptTokens: usage.prompt_tokens || 0,
      candidatesTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0
    }

    return {
      text,
      imageData,
      usage: tokenUsage
    }
  } catch (error: any) {
    // 检查是否是超时错误
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      console.error('API 请求超时:', {
        endpoint,
        hasImages: images && images.length > 0,
        timeout: images && images.length > 0 ? '180s' : '60s'
      })
      throw new Error(`API 请求超时（${images && images.length > 0 ? '180秒' : '60秒'}）。图片分析可能需要更长时间，请检查网络连接或稍后重试`)
    }
    
    // 如果是 headers 编码错误，提供更详细的提示
    if (error.message && error.message.includes('ISO-8859-1')) {
      console.error('Headers encoding error:', {
        endpoint,
        apiKeyLength: cleanApiKey.length,
        apiKeyPreview: cleanApiKey.substring(0, 10) + '...'
      })
      throw new Error(
        'API Key 包含无效字符。请检查 API Key 是否正确，确保没有复制到额外的空格或特殊字符。\n' +
        '建议：重新复制 API Key 并粘贴到设置页面。'
      )
    }
    throw error
  }
}

const extractGeminiUsage = (response: any): TokenUsage => {
  const usage = response.usage || {}
  return {
    promptTokens: usage.prompt_tokens || 0,
    candidatesTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0
  }
}

// 产品图片分析（使用Google Gemini - OpenAI兼容模式）
export const analyzeProductImage = async (file: File): Promise<{ analysis: ProductAnalysis; usage: TokenUsage }> => {
  // 检查是否启用模拟模式
  if (isMockMode()) {
    console.log('🧪 [模拟模式] 分析产品图片')
    return await mockAnalyzeProductImage(file)
  }
  const { mimeType, data } = await fileToGenerativePart(file)

  const prompt = `Analyze this product image for a marketing listing. Identify key selling points and recommend tone/style. 

Please respond in JSON format with the following structure:
{
  "name": "product name",
  "category": "product category",
  "features": ["feature1", "feature2", "feature3"],
  "colors": ["color1", "color2"],
  "materials": ["material1", "material2"],
  "recommendation": {
    "tone": "enthusiastic" or "professional" or "emotional" or "minimalist",
    "copyStyle": "storytelling" or "sales_driven" or "minimalist",
    "imageStyle": "ins_minimal" or "cream_ins" or "dopamine" or "luxury" or "poster" or "none" or "tech_future" or "nature_fresh" or "warm_home" or "furniture_size" or "japanese_wood"
  }
}

Return ONLY the JSON object, no other text.`

  // 调试：检查 API Key
  const apiKey = getApiKey('GOOGLE_API_KEY')
  if (import.meta.env.DEV) {
    console.log('analyzeProductImage - API Key 检查:', {
      hasKey: !!apiKey,
      keyLength: apiKey?.length,
      keyPrefix: apiKey ? apiKey.substring(0, 15) + '...' : 'N/A'
    })
  }

  const result = await callGoogleGenAIAPI(prompt, [{ mimeType, data }], {
    model: getApiKey('GOOGLE_MODEL') || 'gemini-3-pro-image-preview',
    temperature: 0.2
  })

  if (!result.text) throw new Error('No analysis generated')
  
  // 尝试提取JSON
  let jsonText = result.text.trim()
  if (jsonText.startsWith('```')) {
    const firstIndex = jsonText.indexOf('```')
    const lastIndex = jsonText.lastIndexOf('```')
    if (firstIndex !== lastIndex && firstIndex >= 0 && lastIndex > firstIndex) {
      jsonText = jsonText.substring(firstIndex + 3, lastIndex).trim()
      if (jsonText.startsWith('json')) {
        jsonText = jsonText.substring(4).trim()
      }
    } else {
      const lines = jsonText.split('\n')
      if (lines.length > 2) {
        jsonText = lines.slice(1, -1).join('\n').trim()
      }
    }
  }
  
  // 提取JSON对象
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Failed to parse analysis JSON')
  
  let jsonString = jsonMatch[0]
  
  // 修复 JSON 中的控制字符问题
  // 将字符串值中的未转义换行符替换为空格
  jsonString = jsonString.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match, content) => {
    const cleaned = content
      .replace(/(?<!\\)\r\n/g, ' ')  // 未转义的 \r\n -> 空格
      .replace(/(?<!\\)\n/g, ' ')    // 未转义的 \n -> 空格
      .replace(/(?<!\\)\r/g, ' ')    // 未转义的 \r -> 空格
      .replace(/\t/g, ' ')           // Tab -> 空格
      .replace(/\s+/g, ' ')          // 多个空格合并为一个
      .trim()
    return `"${cleaned}"`
  })
  
  try {
    const analysis = JSON.parse(jsonString) as ProductAnalysis
    return { analysis, usage: result.usage }
  } catch (e: any) {
    console.error('JSON parse error:', e, 'Raw text:', jsonString.substring(0, 500))
    
    // 尝试更激进的修复
    try {
      const fixedText = jsonString
        .replace(/[\x00-\x1F\x7F]/g, ' ') // 移除所有控制字符
        .replace(/\s+/g, ' ')              // 合并多个空格
        .replace(/,\s*}/g, '}')            // 修复尾随逗号
        .replace(/,\s*]/g, ']')            // 修复数组尾随逗号
      
      const analysis = JSON.parse(fixedText) as ProductAnalysis
      console.warn('使用修复后的 JSON 解析成功')
      return { analysis, usage: result.usage }
    } catch (secondError: any) {
      console.error('二次修复也失败:', secondError)
      throw new Error('Failed to parse analysis response')
    }
  }
}

// 生成营销文案（使用DeepSeek）
export const generateMarketingCopy = async (
  analysis: ProductAnalysis,
  settings: GenerationSettings
): Promise<{ copy: string; usage: TokenUsage }> => {
  // 检查是否启用模拟模式
  if (isMockMode()) {
    console.log('🧪 [模拟模式] 生成营销文案')
    return await mockGenerateMarketingCopy(analysis, settings)
  }

  const provider = settings.textApiProvider || 'deepseek'

  // Helper to describe copy style
  const getStyleDesc = (s: string) => {
    switch(s) {
      case 'storytelling': return 'Narrative driven, telling a story about using the product.'
      case 'sales_driven': return 'Direct, urgent, focusing on benefits and purchasing.'
      case 'minimalist': return 'Clean, concise, few words, high impact.'
      default: return ''
    }
  }

  let prompt = ''
  const styleDesc = getStyleDesc(settings.copyStyle)
  const platformStyle = settings.style === 'xiaohongshu' ? 'Little Red Book (Xiaohongshu) - Use lots of emojis, taglines, engaging title, and hashtags.' : 'General Social Media'
  const additionalContext = settings.additionalContext || 'None'

  if (settings.customPrompts?.enable && settings.customPrompts.marketingCopyTemplate) {
    // 使用自定义模板
    prompt = settings.customPrompts.marketingCopyTemplate
      .replace(/\{\{name\}\}/g, analysis.name)
      .replace(/\{\{category\}\}/g, analysis.category)
      .replace(/\{\{features\}\}/g, analysis.features.join(', '))
      .replace(/\{\{colors\}\}/g, analysis.colors.join(', '))
      .replace(/\{\{materials\}\}/g, analysis.materials.join(', '))
      .replace(/\{\{platformStyle\}\}/g, platformStyle)
      .replace(/\{\{tone\}\}/g, settings.tone)
      .replace(/\{\{copyStyle\}\}/g, settings.copyStyle)
      .replace(/\{\{length\}\}/g, settings.length)
      .replace(/\{\{additionalContext\}\}/g, additionalContext)
  } else {
    // 使用默认模板
    prompt = `Role: Professional Marketing Copywriter.
Task: Write a social media post for the following product.

Product Details:
- Name: ${analysis.name}
- Category: ${analysis.category}
- Features: ${analysis.features.join(', ')}
- Colors: ${analysis.colors.join(', ')}
- Materials: ${analysis.materials.join(', ')}

Additional Instructions: ${additionalContext}

Requirements:
- Platform Style: ${platformStyle}
- Tone: ${settings.tone}
- Copy Style: ${settings.copyStyle} (${styleDesc})
- Length: ${settings.length}
- Language: Chinese (Simplified)

Structure:
1. Catchy Title (with emojis)
2. Main Body (Bullet points for features, emotional connection)
3. Call to Action
4. Relevant Hashtags`
  }

  const systemPrompt = 'You are a professional marketing copywriter specializing in social media content creation.'

  if (provider === 'deepseek') {
    const result = await callDeepSeekAPI(prompt, systemPrompt)
    return { copy: result.text, usage: result.usage }
  } else {
    throw new Error(`Unsupported text provider: ${provider}`)
  }
}

// 生成风格化图片（使用Google GenAI）
export const generateStyledImage = async (
  originalFile: File,
  analysis: ProductAnalysis,
  style: string,
  settings?: GenerationSettings
): Promise<{ imageUrl: string | null; usage: TokenUsage }> => {
  // 检查是否启用模拟模式
  if (isMockMode()) {
    console.log('🧪 [模拟模式] 生成风格化图片')
    return await mockGenerateStyledImage(originalFile, analysis, style, settings)
  }

  const emptyUsage = { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 }
  if (style === 'none') return { imageUrl: null, usage: emptyUsage }

  let stylePrompt = ""
  switch (style) {
    case 'ins_minimal':
      stylePrompt = "Minimalist, clean white or neutral background, soft lighting, high-end editorial look, instagram aesthetic."
      break
    case 'cream_ins':
      stylePrompt = "Soft creamy color palette, warm bright natural lighting (free light), gentle shadows, Korean Instagram aesthetic, clean and airy composition, pastel tones."
      break
    case 'japanese_wood':
      stylePrompt = "Japanese Muji style, natural light wood textures, beige and white color palette, minimalist and clean composition, soft natural lighting, zen atmosphere, indoor plants, simple and functional aesthetic."
      break
    case 'dopamine':
      stylePrompt = "Vibrant colors, high contrast, pop art style, energetic, youthful, dopamine decor style."
      break
    case 'luxury':
      stylePrompt = "Dark or gold accents, cinematic lighting, elegant marble or velvet textures, expensive feel, 4k resolution."
      break
    case 'poster':
      stylePrompt = "Graphic design layout, solid color background with geometric shapes, plenty of negative space for text, studio photography."
      break
    case 'tech_future':
      stylePrompt = "Cyberpunk style, neon lights, futuristic technology vibes, sleek metal textures, glowing blue and purple accents, high-tech gadget photography."
      break
    case 'nature_fresh':
      stylePrompt = "Natural outdoor setting, fresh green plants, natural sunlight, organic textures, fresh and vibrant atmosphere, natural color palette."
      break
    case 'warm_home':
      stylePrompt = "Cozy home atmosphere, warm lighting, comfortable furniture, soft textures, warm color palette, homey and inviting feeling."
      break
    case 'furniture_size':
      stylePrompt = "Professional furniture photography, clear size reference, clean background, studio lighting, product-focused composition."
      break
    default:
      stylePrompt = "Professional product photography, clean background, good lighting."
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

  // 添加请求ID用于追踪重复调用
  const requestId = `styled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  console.log(`[${requestId}] 开始生成风格化图片`, {
    style,
    hasAnalysis: !!analysis,
    timestamp: new Date().toISOString()
  })

  try {
    const result = await callGoogleGenAIAPI(imagePrompt, [{ mimeType, data }], {
      model: getApiKey('GOOGLE_MODEL') || 'gemini-3-pro-image-preview',
      temperature: 1.0,
      responseFormat: 'image'
    })

    console.log(`[${requestId}] API 响应:`, {
      hasImageData: !!result.imageData,
      imageDataType: result.imageData ? (result.imageData.startsWith('data:') ? 'Base64' : 'URL') : 'none'
    })

    if (!result.imageData) {
      console.error(`[${requestId}] ❌ 图片生成失败: 未找到图片数据`)
      throw new Error('No image generated')
    }

    console.log(`[${requestId}] ✅ 风格化图片生成成功`)
    return {
      imageUrl: result.imageData,
      usage: result.usage
    }
  } catch (error) {
    console.error(`[${requestId}] Image generation failed:`, error)
    return { imageUrl: null, usage: emptyUsage }
  }
}

// 生成大纲（文本生成图文模式，使用DeepSeek）
export const generateOutline = async (topic: string): Promise<{ outline: string; pages: Array<{ index: number; type: string; content: string }> }> => {
  // 检查是否启用模拟模式
  if (isMockMode()) {
    console.log('🧪 [模拟模式] 生成大纲')
    return await mockGenerateOutline(topic)
  }
  
  const prompt = `你是一个小红书内容创作专家。用户会给你一个要求以及说明，你需要生成一个适合小红书的图文内容大纲。

用户的要求以及说明：
${topic}

要求：
1. 第一页必须是吸引人的封面/标题页，包含标题和副标题
2. 内容控制在 6-12 页（包括封面），必须至少6页
3. 每页内容简洁有力，适合配图展示
4. 使用小红书风格的语言（亲切、有趣、实用）
5. 可以适当使用 emoji 增加趣味性
6. 内容要有实用价值，能解决用户问题或提供有用信息
7. 最后一页可以是总结或行动呼吁

输出格式（严格遵守）：
- 用 <page> 标签分割每一页（重要：这是强制分隔符）
- 每页第一行是页面类型标记：[封面]、[内容]、[总结]
- 后面是该页的具体内容描述
- 内容要具体、详细，方便后续生成图片
- 每页内容末尾必须包含"配图建议："，描述该页适合的配图场景（这是必需的，不能省略）
- 避免在内容中使用 | 竖线符号（会与 markdown 表格冲突）

## 示例输出：

[封面]
标题：5分钟学会手冲咖啡☕
副标题：新手也能做出咖啡店的味道
背景：温馨的咖啡场景，一个家庭布局的咖啡角

配图建议：温馨的咖啡角场景，摆放整齐的咖啡器具

<page>
[内容]
第一步：准备器具

必备工具：
• 手冲壶（细嘴壶）
• 滤杯和滤纸
• 咖啡豆 15g
• 热水 250ml（92-96℃）
• 磨豆机
• 电子秤

配图建议：整齐摆放的咖啡器具

<page>
[内容]
第二步：研磨咖啡豆

研磨粗细度：中细研磨（像细砂糖）
重量：15克
新鲜度：建议现磨现冲

小贴士💡：
咖啡豆最好是烘焙后2周内的
研磨后要在15分钟内冲泡完成

配图建议：研磨咖啡豆的特写

<page>
...（继续生成更多内容页）

### 最后
现在，请根据用户的主题生成大纲。记住：
1. 严格使用 <page> 标签分割每一页
2. 每页开头标注类型：[封面]、[内容]、[总结]
3. 内容要详细、具体、专业、有价值
4. 适合制作成小红书图文
5. 每页末尾必须包含"配图建议："描述配图场景（这是必需的，不能省略，必须为每页提供具体的配图建议）
6. 避免使用竖线符号 | （会与 markdown 表格冲突）

【特别的！！注意】直接给出大纲内容（不要有任何多余的说明，也就是你直接从[封面]开始，不要有针对用户的回应对话），请输出：`

  const systemPrompt = '你是一个专业的小红书内容创作助手，擅长生成吸引人的图文大纲。'
  const result = await callDeepSeekAPI(prompt, systemPrompt)
  
  // 解析大纲为页面数组
  const pages: Array<{ index: number; type: string; content: string }> = []
  
  // 按 <page> 分割页面；如果没有 <page> 标签，则尝试用 --- 分割
  let pageTexts: string[] = []
  
  if (result.text.includes('<page>') || result.text.includes('</page>')) {
    // 使用 <page> 标签分割
    const pageMatches = result.text.matchAll(/<page>([\s\S]*?)<\/page>/gi)
    for (const match of pageMatches) {
      const content = match[1].trim()
      if (content) {
        pageTexts.push(content)
      }
    }
  } else {
    // 如果没有 <page> 标签，尝试用 --- 分割（向后兼容）
    pageTexts = result.text.split('---').map(t => t.trim()).filter(t => t)
  }
  
  // 如果还是没有分割成功，尝试按 [封面]、[内容] 等标记分割
  if (pageTexts.length === 0) {
    const sections = result.text.split(/(?=\[(?:封面|内容|总结)\])/g)
    pageTexts = sections.map(s => s.trim()).filter(s => s)
  }
  
  let index = 0
  
  for (const pageText of pageTexts) {
    if (!pageText) continue
    
    let pageContent = pageText
    let pageType = 'content'
    
    // 解析页面类型（支持：[封面]、[内容]、[总结] 标记）
    const typeMatch = pageContent.match(/^\[(\S+)\]/)
    if (typeMatch) {
      const typeCn = typeMatch[1]
      const typeMapping: Record<string, string> = {
        '封面': 'cover',
        '内容': 'content',
        '总结': 'summary'
      }
      pageType = typeMapping[typeCn] || 'content'
      // 移除类型标记行
      pageContent = pageContent.replace(/^\[(\S+)\]\s*\n?/, '')
    } else {
      // 兼容旧格式：type: cover
      const typeMatchOld = pageContent.match(/type:\s*(\w+)/i)
      if (typeMatchOld) {
        pageType = typeMatchOld[1]
        pageContent = pageContent.replace(/type:\s*\w+\s*\n?/i, '')
      }
    }
    
    // 提取内容（移除content:前缀如果存在）
    pageContent = pageContent.replace(/^content:\s*/i, '').trim()
    
    // 移除可能的 <page> 标签残留
    pageContent = pageContent.replace(/<\/?page>/gi, '').trim()
    
    // 提取配图建议（如果存在，支持多种格式）
    let imagePrompt: string | undefined = undefined
    // 格式1: 配图建议：xxx
    // 格式2: 配图建议: xxx  
    // 格式3: 配图建议 xxx
    // 格式4: 图片建议：xxx
    let promptMatch = pageContent.match(/配图建议[：:\s]+\s*(.+?)(?=\n\n|\n$|$)/is)
    if (!promptMatch) {
      promptMatch = pageContent.match(/图片建议[：:\s]+\s*(.+?)(?=\n\n|\n$|$)/is)
    }
    if (!promptMatch) {
      promptMatch = pageContent.match(/建议配图[：:\s]+\s*(.+?)(?=\n\n|\n$|$)/is)
    }
    
    if (promptMatch && promptMatch[1]) {
      imagePrompt = promptMatch[1].trim()
      // 清理换行和多余空格
      imagePrompt = imagePrompt.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
      
      if (imagePrompt) {
        // 从内容中移除配图建议行，避免在内容中重复显示
        pageContent = pageContent.replace(/配图建议[：:\s]+.+?(?=\n\n|\n$|$)/is, '').trim()
        pageContent = pageContent.replace(/图片建议[：:\s]+.+?(?=\n\n|\n$|$)/is, '').trim()
        pageContent = pageContent.replace(/建议配图[：:\s]+.+?(?=\n\n|\n$|$)/is, '').trim()
        // 清理多余的空行
        pageContent = pageContent.replace(/\n{3,}/g, '\n\n').trim()
        console.log(`页面 ${index + 1} 提取配图建议:`, imagePrompt)
      }
    }
    
    pages.push({
      index: index++,
      type: pageType,
      content: pageContent,
      imagePrompt: imagePrompt
    } as any)
  }
  
  // 如果没有解析到页面，创建一个默认页面
  if (pages.length === 0) {
    pages.push({
      index: 0,
      type: 'content',
      content: result.text
    } as any)
  }
  
  // 保证一定存在封面页，且封面在第一页（P1）
  const hasCover = pages.some(p => p.type === 'cover')
  if (!hasCover) {
    // 没有封面，则在最前面插入一个自动生成的封面
    pages.unshift({
      index: 0,
      type: 'cover',
      content: `📌 ${topic}\n\n开始你的精彩内容之旅`,
      imagePrompt: `根据主题 "${topic}" 生成一张吸引人的封面图片`
    } as any)
  } else {
    // 如果存在封面但不在第一页，则将第一个封面移动到第一页
    const firstCoverIndex = pages.findIndex(p => p.type === 'cover')
    if (firstCoverIndex > 0) {
      const [coverPage] = pages.splice(firstCoverIndex, 1)
      pages.unshift(coverPage)
    }
  }
  
  // 确保至少有 5 页内容页（不含封面和总结）
  while (pages.filter(p => (p as any).type === 'content').length < 5) {
    const newIndex = pages.length
    pages.push({
      index: newIndex,
      type: 'content',
      content: `第${newIndex}页：深入探讨${topic}的相关内容，提供更多有价值的信息和见解。`,
      imagePrompt: `根据页面内容和主题 "${topic}" 生成一张内容图片`
    } as any)
  }
  
  // 内容兜底：如果某些页内容为空，用主题生成默认文案，避免出现空白卡片
  pages.forEach((p: any) => {
    if (!p.content || !p.content.trim()) {
      if (p.type === 'cover') {
        p.content = `📌 ${topic}\n\n开始你的精彩内容之旅`
      } else if (p.type === 'summary') {
        p.content = `总结本次主题「${topic}」的关键要点，帮助读者快速回顾重点并给出行动建议。`
      } else {
        p.content = `围绕主题「${topic}」补充一页有价值的内容，提供具体案例、技巧或注意事项。`
      }
    }
  })
  
  // 配图建议兜底：如果某些页没有配图建议，为其生成默认建议，避免编辑页下方为空
  pages.forEach((p: any) => {
    if (!p.imagePrompt || !String(p.imagePrompt).trim()) {
      if (p.type === 'cover') {
        p.imagePrompt = `生成一张与主题「${topic}」相关的吸睛封面配图，突出标题和整体氛围。`
      } else if (p.type === 'summary') {
        p.imagePrompt = `生成一张总结页配图，用清晰的信息图或要点列表的方式概括本次主题「${topic}」的重点。`
      } else {
        p.imagePrompt = `根据本页内容生成一张小红书风格的配图，突出关键信息和视觉对比效果。`
      }
    }
  })
  
  // 重新索引，保证 index 连续且与顺序一致
  pages.forEach((p, idx) => { (p as any).index = idx })
  
  return {
    outline: result.text,
    pages: pages
  }
}

// 为文本生成图文模式生成单页图片
export const generatePageImage = async (
  pageContent: string,
  pageIndex: number,
  totalPages: number,
  fullOutline: string,
  topic: string,
  pageType: string = 'content',
  customPrompt?: string,
  imagePrompt?: string // 用户编辑的配图建议
): Promise<{ imageUrl: string; usage: TokenUsage }> => {
  // 检查是否启用模拟模式
  if (isMockMode()) {
    console.log(`🧪 [模拟模式] 生成第 ${pageIndex + 1} 页图片`)
    return await mockGeneratePageImage(pageContent, pageIndex)
  }

  // 使用自定义prompt或默认prompt
  let prompt = customPrompt || ''
  
  if (!prompt) {
    // 如果有用户编辑的配图建议，优先使用
    let imageSuggestionText = ''
    if (imagePrompt && imagePrompt.trim()) {
      imageSuggestionText = `\n\n用户配图建议：${imagePrompt.trim()}`
    }
    
    // 默认使用预设的图文生成 Prompt 模板
    prompt = `请生成一张小红书风格的图文内容图片。
【合规特别注意的】注意不要带有任何小红书的logo，不要有右下角的用户id以及logo
【合规特别注意的】用户给到的参考图片里如果有水印和logo（尤其是注意右下角，左上角），请一定要去掉

页面内容：
${pageContent}

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
---${imageSuggestionText}

请根据以上要求，生成一张精美的小红书风格图片。请直接给出图片，不要有任何手机边框，或者是白色留边。`
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
  
  // 调试模式：如果启用了调试模式，在控制台输出原始prompt
  const isDebugMode = localStorage.getItem('PROMPT_DEBUG_MODE') === 'true'
  if (isDebugMode) {
    console.log(`[图片生成 Prompt 调试] 第 ${pageIndex + 1} 页 (${pageType}):`, prompt)
  }

  // 添加请求ID用于追踪重复调用
  const requestId = `page_${pageIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  console.log(`[${requestId}] 开始生成第 ${pageIndex + 1} 页图片`, {
    pageType,
    hasCustomPrompt: !!customPrompt,
    hasImagePrompt: !!imagePrompt,
    timestamp: new Date().toISOString()
  })

  try {
    const result = await callGoogleGenAIAPI(prompt, [], {
      model: getApiKey('GOOGLE_MODEL') || 'gemini-3-pro-image-preview',
      temperature: 1.0,
      responseFormat: 'image'
    })

    console.log(`[${requestId}] API 响应数据 (Page ${pageIndex + 1}):`, {
      hasImageData: !!result.imageData,
      imageDataType: result.imageData ? (result.imageData.startsWith('data:') ? 'Base64' : 'URL') : 'none',
      imageDataLength: result.imageData?.length || 0,
      imageDataPreview: result.imageData?.substring(0, 100) || 'none'
    })

    if (!result.imageData) {
      console.error(`[${requestId}] ❌ 第 ${pageIndex + 1} 页图片生成失败: 未找到图片数据`)
      throw new Error('No image generated')
    }

    // 确保 imageData 是有效的字符串
    const imageUrl = typeof result.imageData === 'string' ? result.imageData : String(result.imageData)
    
    console.log(`[${requestId}] ✅ 第 ${pageIndex + 1} 页图片生成成功，类型:`, imageUrl.startsWith('data:') ? 'Base64' : 'URL', '长度:', imageUrl.length)

    return {
      imageUrl: imageUrl,
      usage: result.usage
    }
  } catch (error) {
    console.error(`[${requestId}] Page image generation failed:`, error)
    throw error
  }
}
