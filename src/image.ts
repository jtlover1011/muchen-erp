export function readImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) return Promise.reject(new Error('请选择图片文件'))
  if (file.size > 8 * 1024 * 1024) return Promise.reject(new Error('图片超过 8MB，请换一张'))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 480
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('图片处理失败'))
          return
        }
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      img.onerror = () => reject(new Error('图片读取失败'))
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
