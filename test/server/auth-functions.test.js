const { expect } = require('chai')
const bcrypt = require('bcrypt')

describe('Auth Functions', () => {
  describe('Password Hashing', () => {
    it('should hash passwords correctly', async () => {
      const password = 'testpassword123'
      const hash = await bcrypt.hash(password, 10)

      expect(hash).to.be.a('string')
      expect(hash).to.not.equal(password)
      expect(hash.length).to.be.greaterThan(20) // bcrypt hashes are long
    })

    it('should verify hashed passwords correctly', async () => {
      const password = 'testpassword123'
      const hash = await bcrypt.hash(password, 10)

      const isValid = await bcrypt.compare(password, hash)
      expect(isValid).to.be.true
    })

    it('should reject incorrect passwords', async () => {
      const password = 'testpassword123'
      const wrongPassword = 'wrongpassword'
      const hash = await bcrypt.hash(password, 10)

      const isValid = await bcrypt.compare(wrongPassword, hash)
      expect(isValid).to.be.false
    })

    it('should produce different hashes for same password', async () => {
      const password = 'testpassword123'
      const hash1 = await bcrypt.hash(password, 10)
      const hash2 = await bcrypt.hash(password, 10)

      // bcrypt includes salt, so hashes should be different
      expect(hash1).to.not.equal(hash2)

      // But both should verify correctly
      const isValid1 = await bcrypt.compare(password, hash1)
      const isValid2 = await bcrypt.compare(password, hash2)
      expect(isValid1).to.be.true
      expect(isValid2).to.be.true
    })
  })

  describe('JWT Token Generation', () => {
    const jwt = require('jsonwebtoken')
    const JWT_SECRET = 'test-secret-key'

    it('should generate valid JWT tokens', () => {
      const payload = {
        id: '123',
        nickname: 'testuser',
        level: 'admin',
      }

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })

      expect(token).to.be.a('string')
      expect(token.split('.')).to.have.lengthOf(3) // JWT has 3 parts
    })

    it('should decode JWT tokens correctly', () => {
      const payload = {
        id: '123',
        nickname: 'testuser',
        level: 'admin',
      }

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })
      const decoded = jwt.verify(token, JWT_SECRET)

      expect(decoded.id).to.equal(payload.id)
      expect(decoded.nickname).to.equal(payload.nickname)
      expect(decoded.level).to.equal(payload.level)
    })

    it('should include expiration in token', () => {
      const payload = { id: '123' }
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })
      const decoded = jwt.verify(token, JWT_SECRET)

      expect(decoded).to.have.property('exp')
      expect(decoded.exp).to.be.a('number')
      expect(decoded.exp).to.be.greaterThan(Math.floor(Date.now() / 1000))
    })

    it('should reject tokens with wrong secret', () => {
      const payload = { id: '123' }
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })

      expect(() => {
        jwt.verify(token, 'wrong-secret')
      }).to.throw()
    })

    it('should reject expired tokens', () => {
      const payload = { id: '123' }
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1h' })

      expect(() => {
        jwt.verify(token, JWT_SECRET)
      }).to.throw()
    })
  })
})
