/**
 * 大纲生成服务
 */

import { Page } from '../../stores/textGenerator'
import { logger } from '../../composables/useLogger'
import { callDeepSeekAPI } from './deepseek'
import { isMockMode, mockGenerateOutline } from './mock'

/**
 * 生成大纲（文本生成图文模式，使用DeepSeek）
 */
export async function generateOutline(
  topic: string
): Promise<{ outline: string; pages: Array<Page> }> {
  if (isMockMode()) {
    logger.debug('🧪 [模拟模式] 生成大纲')
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
5. 每页末尾必须包含"配图建议："描述配图场景
6. 避免使用竖线符号 | （会与 markdown 表格冲突）

【特别的！！注意】直接给出大纲内容（不要有任何多余的说明，也就是你直接从[封面]开始，不要有针对用户的回应对话），请输出：`

  const systemPrompt = '你是一个专业的小红书内容创作助手，擅长生成吸引人的图文大纲。'
  const result = await callDeepSeekAPI(prompt, systemPrompt)
  
  // 解析大纲为页面数组
  const pages: Array<Page> = []
  
  let pageTexts: string[] = []
  // 优先按 <page> 分割
  if (result.text.includes('<page>')) {
    pageTexts = result.text.split(/<page>/gi).map(s => s.trim()).filter(s => s)
  } else if (result.text.includes('---')) {
    // 如果没有 <page> 标签，尝试按 --- 分割 (向后兼容)
    pageTexts = result.text.split(/---/gi).map(s => s.trim()).filter(s => s)
  } else {
    // 如果都没有，按 [封面] [内容] [总结] 分割
    const sections = result.text.split(/(?=\[(?:封面|内容|总结)\])/g)
    pageTexts = sections.map(s => s.trim()).filter(s => s)
  }
  
  let index = 0
  
  for (const pageText of pageTexts) {
    if (!pageText) continue
    
    let pageContent = pageText
    let pageType: Page['type'] = 'content'
    
    // 解析页面类型（支持：[封面]、[内容]、[总结] 标记）
    const typeMatch = pageContent.match(/^\[(\S+)\]/)
    if (typeMatch) {
      const typeCn = typeMatch[1]
      const typeMapping: Record<string, Page['type']> = {
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
        pageType = typeMatchOld[1] as Page['type']
        pageContent = pageContent.replace(/type:\s*\w+\s*\n?/i, '')
      }
    }
    
    // 提取内容（移除content:前缀如果存在）
    pageContent = pageContent.replace(/^content:\s*/i, '').trim()
    
    // 移除可能的 <page> 标签残留
    pageContent = pageContent.replace(/<\/?page>/gi, '').trim()
    
    // 提取配图建议（如果存在，支持多种格式）
    let imagePrompt: string | undefined = undefined
    let promptMatch = pageContent.match(/(?:配图建议|图片建议|建议配图)[：:\s]+\s*(.+?)(?=\n\n|\n$|$)/is)
    
    if (promptMatch && promptMatch[1]) {
      imagePrompt = promptMatch[1].trim()
      // 从内容中移除配图建议行，避免在内容中重复显示
      pageContent = pageContent.replace(/(?:配图建议|图片建议|建议配图)[：:\s]+.+?(?=\n\n|\n$|$)/is, '').trim()
    }
    
    if (import.meta.env.DEV) {
      logger.debug(`页面 ${index + 1} 提取配图建议:`, imagePrompt)
    }
    
    pages.push({
      index: index++,
      type: pageType,
      content: pageContent,
      imagePrompt: imagePrompt
    })
  }
  
  // 如果没有解析到页面，创建一个默认页面
  if (pages.length === 0) {
    pages.push({
      index: 0,
      type: 'content',
      content: result.text,
      imagePrompt: `根据主题 "${topic}" 生成一张内容图片`
    })
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
    })
  } else {
    // 如果存在封面但不在第一页，则将第一个封面移动到第一页
    const firstCoverIndex = pages.findIndex(p => p.type === 'cover')
    if (firstCoverIndex > 0) {
      const [coverPage] = pages.splice(firstCoverIndex, 1)
      pages.unshift(coverPage)
    }
  }
  
  // 确保至少有 5 页内容页（不含封面和总结）
  while (pages.filter(p => p.type === 'content').length < 5) {
    const newIndex = pages.length
    pages.push({
      index: newIndex,
      type: 'content',
      content: `第${newIndex}页：深入探讨${topic}的相关内容，提供更多有价值的信息和见解。`,
      imagePrompt: `根据页面内容和主题 "${topic}" 生成一张内容图片`
    })
  }
  
  // 内容兜底：如果某些页内容为空，用主题生成默认文案，避免出现空白卡片
  pages.forEach((p) => {
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
  pages.forEach((p) => {
    if (!p.imagePrompt || !p.imagePrompt.trim()) {
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
  pages.forEach((p, idx) => { p.index = idx })
  
  return {
    outline: result.text,
    pages: pages
  }
}

