/**
 * 图片处理工具函数
 */

/**
 * 压缩图片
 */
export function compressImage(
  source: string | File,
  maxWidth = 800,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const processImage = (src: string) => {
      const img = new Image()
      img.onload = () => {
        let w = img.width
        let h = img.height
        
        if (w > maxWidth) {
          h = (h * maxWidth) / w
          w = maxWidth
        }
        
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context unavailable'))
          return
        }
        
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => reject(new Error('Image load failed during compression'))
      img.src = src
    }

    if (source instanceof File) {
      const reader = new FileReader()
      reader.onload = (e) => processImage(e.target?.result as string)
      reader.onerror = reject
      reader.readAsDataURL(source)
    } else {
      processImage(source)
    }
  })
}

/**
 * 将 File 转换为 base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 将 File 转换为 GenerativePart 格式（用于 Google GenAI API）
 */
export async function fileToGenerativePart(
  file: File
): Promise<{ mimeType: string; data: string }> {
  const base64 = await fileToBase64(file)
  // 移除 data:image/...;base64, 前缀
  const data = base64.split(',')[1] || base64
  return {
    mimeType: file.type || 'image/jpeg',
    data
  }
}





