const { expect } = require('chai')

describe('Ticket Generation Functions', () => {
  describe('generateTicketId', () => {
    // This function is defined in server.js
    function generateTicketId(ticketNumber) {
      return `IQ${ticketNumber.toString().padStart(10, '0')}`
    }

    it('should generate ticket ID with correct format', () => {
      const ticketNumber = 123
      const result = generateTicketId(ticketNumber)

      expect(result).to.be.a('string')
      expect(result).to.match(/^IQ\d{10}$/)
      expect(result).to.equal('IQ0000000123')
    })

    it('should pad single digit numbers correctly', () => {
      const result = generateTicketId(1)

      expect(result).to.equal('IQ0000000001')
    })

    it('should handle large numbers', () => {
      const result = generateTicketId(9999999999)

      expect(result).to.equal('IQ9999999999')
    })

    it('should always start with IQ prefix', () => {
      const result = generateTicketId(12345)

      expect(result).to.match(/^IQ/)
    })

    it('should always be 12 characters long', () => {
      const result1 = generateTicketId(1)
      const result2 = generateTicketId(1234567890)

      expect(result1.length).to.equal(12)
      expect(result2.length).to.equal(12)
    })
  })

  describe('normalizeToCalendarDay', () => {
    // This function is defined in server.js
    function normalizeToCalendarDay(date = new Date()) {
      const normalized = new Date(date)
      normalized.setHours(0, 0, 0, 0)
      return normalized
    }

    it('should set hours, minutes, seconds, and milliseconds to zero', () => {
      const date = new Date('2024-01-15T14:30:45.123Z')
      const normalized = normalizeToCalendarDay(date)

      expect(normalized.getHours()).to.equal(0)
      expect(normalized.getMinutes()).to.equal(0)
      expect(normalized.getSeconds()).to.equal(0)
      expect(normalized.getMilliseconds()).to.equal(0)
    })

    it('should preserve the date part', () => {
      const date = new Date('2024-01-15T14:30:45.123Z')
      const normalized = normalizeToCalendarDay(date)

      expect(normalized.getFullYear()).to.equal(date.getFullYear())
      expect(normalized.getMonth()).to.equal(date.getMonth())
      expect(normalized.getDate()).to.equal(date.getDate())
    })

    it('should work with default parameter (current date)', () => {
      const normalized = normalizeToCalendarDay()

      expect(normalized).to.be.instanceOf(Date)
      expect(normalized.getHours()).to.equal(0)
      expect(normalized.getMinutes()).to.equal(0)
      expect(normalized.getSeconds()).to.equal(0)
    })

    it('should return same normalized date for different times on same day', () => {
      // Use same local day to avoid timezone issues
      const baseDate = new Date(2024, 0, 15) // January 15, 2024 local time
      const date1 = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0)
      const date2 = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 23, 59, 59, 999)

      const normalized1 = normalizeToCalendarDay(date1)
      const normalized2 = normalizeToCalendarDay(date2)

      expect(normalized1.getTime()).to.equal(normalized2.getTime())
    })
  })

  describe('getTodayNormalized', () => {
    // This function is defined in server.js
    function getTodayNormalized() {
      return normalizeToCalendarDay(new Date())
    }

    function normalizeToCalendarDay(date = new Date()) {
      const normalized = new Date(date)
      normalized.setHours(0, 0, 0, 0)
      return normalized
    }

    it('should return today\'s date normalized to midnight', () => {
      const today = getTodayNormalized()
      const now = new Date()
      const expected = normalizeToCalendarDay(now)

      expect(today.getTime()).to.equal(expected.getTime())
    })

    it('should always return date with time set to 00:00:00.000', () => {
      const today = getTodayNormalized()

      expect(today.getHours()).to.equal(0)
      expect(today.getMinutes()).to.equal(0)
      expect(today.getSeconds()).to.equal(0)
      expect(today.getMilliseconds()).to.equal(0)
    })
  })

  describe('Passport Validation', () => {
    it('should validate passport format correctly', () => {
      const passportRegex = /^[A-Z]{2}\d{7}$/

      // Valid passports
      expect(passportRegex.test('AB1234567')).to.be.true
      expect(passportRegex.test('XY9876543')).to.be.true
      expect(passportRegex.test('AA0000001')).to.be.true

      // Invalid passports
      expect(passportRegex.test('ab1234567')).to.be.false // lowercase
      expect(passportRegex.test('A1234567')).to.be.false // one letter
      expect(passportRegex.test('ABC1234567')).to.be.false // three letters
      expect(passportRegex.test('AB123456')).to.be.false // 6 digits
      expect(passportRegex.test('AB12345678')).to.be.false // 8 digits
      expect(passportRegex.test('12AB34567')).to.be.false // wrong order
      expect(passportRegex.test('AB1234567 ')).to.be.false // with space
    })

    it('should handle passport with spaces by trimming', () => {
      const passport = '  AB1234567  '
      const cleanPassport = passport.trim()
      const passportRegex = /^[A-Z]{2}\d{7}$/

      expect(passportRegex.test(cleanPassport)).to.be.true
    })
  })

  describe('Ticket ID Format Validation', () => {
    it('should validate ticket ID format', () => {
      const ticketIdRegex = /^IQ\d{10}$/

      // Valid ticket IDs
      expect(ticketIdRegex.test('IQ0000000001')).to.be.true
      expect(ticketIdRegex.test('IQ1234567890')).to.be.true
      expect(ticketIdRegex.test('IQ9999999999')).to.be.true

      // Invalid ticket IDs
      expect(ticketIdRegex.test('IQ123456789')).to.be.false // 9 digits
      expect(ticketIdRegex.test('IQ12345678901')).to.be.false // 11 digits
      expect(ticketIdRegex.test('iq0000000001')).to.be.false // lowercase
      expect(ticketIdRegex.test('AB0000000001')).to.be.false // wrong prefix
      expect(ticketIdRegex.test('IQ0000000001 ')).to.be.false // with space
    })
  })
})
