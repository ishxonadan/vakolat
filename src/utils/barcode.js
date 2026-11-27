const JsBarcode = require('jsbarcode')

const EMPTY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

/**
 * Generate a Code 128 barcode as a canvas data URL.
 * @param {string} text
 * @returns {string}
 */
function generateBarcode(text) {
  const canvas = document.createElement('canvas')
  const value = String(text ?? '').trim() || ' '

  try {
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: 1.6,
      height: 42,
      displayValue: true,
      fontSize: 11,
      textMargin: 2,
      margin: 4,
      background: '#ffffff',
      lineColor: '#000000',
    })
    return canvas.toDataURL('image/png')
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
      return canvas.toDataURL('image/png')
    } catch {
      return EMPTY_PNG
    }
  }
}

module.exports = { generateBarcode }
