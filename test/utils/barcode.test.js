const { expect } = require('chai')

describe('Barcode Utils', () => {
  let generateBarcode

  before(async () => {
    ;({ generateBarcode } = await import('../../src/utils/barcode.js'))
  })

  describe('generateBarcode', () => {
    it('should generate a barcode data URL', () => {
      const text = 'TEST123'
      const result = generateBarcode(text)

      expect(result).to.be.a('string')
      expect(result).to.include('data:image')
      expect(result).to.include('base64')
    })

    it('should handle empty string', () => {
      const result = generateBarcode('')

      expect(result).to.be.a('string')
      expect(result).to.include('data:image')
    })

    it('should handle special characters', () => {
      const result = generateBarcode('TEST-123_ABC')

      expect(result).to.be.a('string')
      expect(result).to.include('data:image')
    })
  })
})
