/**
 * Recorta la imagen a un cuadrado centrado y la devuelve como data URL JPEG.
 * Usa FileReader (data: URL) en vez de createObjectURL para no chocar con la CSP (blob:).
 */
export function compressImage(file: File, size = 300, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width  = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!
        const side = Math.min(img.width, img.height)
        const sx   = (img.width  - side) / 2
        const sy   = (img.height - side) / 2
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
}
