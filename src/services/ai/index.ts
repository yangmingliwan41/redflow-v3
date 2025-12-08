/**
 * AI 服务统一导出
 */

export * from './deepseek'
export * from './google'
export * from './imageAnalysis'
export * from './marketingCopy'
export * from './imageGeneration'
export * from './outline'
export * from './mock'

// 重新导出主要函数，保持向后兼容
export { analyzeProductImage } from './imageAnalysis'
export { generateMarketingCopy } from './marketingCopy'
export { generateStyledImage, generatePageImage } from './imageGeneration'
export { generateOutline } from './outline'
export { isMockMode } from './mock'





