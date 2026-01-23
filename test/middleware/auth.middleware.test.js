const { expect } = require('chai')
const jwt = require('jsonwebtoken')
const { verifyToken } = require('../../src/middleware/auth.middleware')

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key'

describe('Auth Middleware', () => {
  describe('verifyToken', () => {
    let req, res

    beforeEach(() => {
      req = {
        headers: {},
      }
      res = {
        statusCode: 200,
        body: null,
        status: function(code) {
          this.statusCode = code
          return this
        },
        json: function(data) {
          this.body = data
          return this
        },
      }
    })

    it('should return 401 when no authorization header', () => {
      req.headers.authorization = undefined
      
      verifyToken(req, res, () => {})

      expect(res.statusCode).to.equal(401)
      expect(res.body).to.have.property('error')
    })

    it('should return 401 when authorization header does not start with Bearer', () => {
      req.headers.authorization = 'Token some-token'

      verifyToken(req, res, () => {})

      expect(res.statusCode).to.equal(401)
      expect(res.body).to.have.property('error')
    })

    it('should return 401 when token is invalid', () => {
      req.headers.authorization = 'Bearer invalid-token'

      verifyToken(req, res, () => {})

      expect(res.statusCode).to.equal(401)
      expect(res.body).to.have.property('error')
    })

    it('should return 401 when token is expired', () => {
      const token = jwt.sign({ id: '123' }, JWT_SECRET, { expiresIn: '-1h' })
      req.headers.authorization = `Bearer ${token}`

      verifyToken(req, res, () => {})

      expect(res.statusCode).to.equal(401)
      expect(res.body).to.have.property('error')
    })

    it('should allow valid token', () => {
      const token = jwt.sign({ id: '123', level: 'admin' }, JWT_SECRET, { expiresIn: '1h' })
      req.headers.authorization = `Bearer ${token}`
      
      let nextCalled = false
      verifyToken(req, res, () => { nextCalled = true })

      expect(nextCalled).to.be.true
      expect(req.user).to.exist
      expect(req.user).to.have.property('id', '123')
    })
  })
})
