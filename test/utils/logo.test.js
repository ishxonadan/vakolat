const { expect } = require('chai')
const { getLibraryLogoSvg } = require('../../src/utils/logo')

describe('Logo Utils', () => {
  describe('getLibraryLogoSvg', () => {
    it('should return an SVG string', () => {
      const result = getLibraryLogoSvg()
      
      expect(result).to.be.a('string')
      expect(result).to.include('<svg')
      expect(result).to.include('</svg>')
    })

    it('should return valid SVG markup', () => {
      const result = getLibraryLogoSvg()
      
      expect(result).to.include('xmlns="http://www.w3.org/2000/svg"')
      expect(result).to.include('viewBox')
    })

    it('should return consistent output', () => {
      const result1 = getLibraryLogoSvg()
      const result2 = getLibraryLogoSvg()
      
      expect(result1).to.equal(result2)
    })

    it('should contain SVG path elements', () => {
      const result = getLibraryLogoSvg()
      
      expect(result).to.include('<path')
      expect(result).to.include('d=')
    })

    it('should have proper SVG structure', () => {
      const result = getLibraryLogoSvg()
      
      expect(result).to.include('<g')
      expect(result).to.include('transform')
    })
  })
})
