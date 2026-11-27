import JsBarcode from 'jsbarcode'

const EMPTY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

/**
 * Generate a Code 128 barcode as a canvas data URL.
 * @param {string} text
 * @param {{
 *   displayValue?: boolean,
 *   height?: number,
 *   width?: number,
 *   margin?: number,
 *   fontSize?: number,
 *   textMargin?: number,
 *   background?: string,
 *   lineColor?: string,
 *   transparent?: boolean,
 * }} [options]
 * @returns {string}
 */
export function generateBarcode(text, options = {}) {
  const {
    displayValue = true,
    height = 42,
    width = 1.6,
    margin = 4,
    fontSize = 11,
    textMargin = 2,
    background = '#ffffff',
    lineColor = '#000000',
    transparent = false,
  } = options

  const canvas = document.createElement('canvas')
  const value = String(text ?? '').trim() || ' '

  try {
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width,
      height,
      displayValue,
      fontSize,
      textMargin,
      margin,
      background,
      lineColor,
    })
    return canvasToPng(canvas, transparent)
  } catch {
    try {
      const ctx = canvas.getContext('2d')
      canvas.width = 200
      canvas.height = 40
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#000000'
        ctx.font = '10px monospace'
        ctx.fillText(String(text ?? ''), 8, 24)
      }
      return canvasToPng(canvas, transparent)
    } catch {
      return EMPTY_PNG
    }
  }
}

function canvasToPng(canvas, transparent) {
  if (transparent) {
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = image.data
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
          data[i + 3] = 0
        }
      }
      ctx.putImageData(image, 0, 0)
    }
  }
  return canvas.toDataURL('image/png')
}

export default { generateBarcode }
