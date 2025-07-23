// Simple barcode generator for Code 128
export const generateBarcode = (text) => {
  // This is a simplified barcode representation
  // In a real implementation, you'd use a proper barcode library
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  canvas.width = 200
  canvas.height = 40

  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = "#000000"
  ctx.font = "8px monospace"

  // Simple pattern generation (not actual Code 128)
  let x = 10
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i)
    const pattern = charCode % 8 // Simple pattern based on char code

    for (let j = 0; j < 8; j++) {
      if ((pattern >> j) & 1) {
        ctx.fillRect(x, 5, 2, 25)
      }
      x += 2
    }
    x += 1 // Space between characters
  }

  // Add text below barcode
  ctx.fillText(text, (canvas.width - ctx.measureText(text).width) / 2, 38)

  return canvas.toDataURL()
}
