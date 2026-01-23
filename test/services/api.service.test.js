const { expect } = require('chai')
const ApiService = require('../../src/service/api.service').default || require('../../src/service/api.service')

// Mock fetch globally
const mockFetch = (responseData, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => responseData,
    text: async () => JSON.stringify(responseData),
  })
}

// Set up fetch mock before requiring the service
if (typeof global.fetch === 'undefined') {
  global.fetch = mockFetch
}

describe('API Service', () => {
  let originalFetch
  let originalLocalStorage

  beforeEach(() => {
    // Save original implementations
    originalFetch = global.fetch
    originalLocalStorage = global.localStorage
    
    // Clear localStorage before each test
    if (global.localStorage) {
      global.localStorage.clear()
    }
  })

  afterEach(() => {
    // Restore original implementations
    global.fetch = originalFetch
  })

  describe('get', () => {
    it('should make a GET request successfully', async () => {
      const mockData = { id: 1, name: 'Test' }
      global.fetch = () => mockFetch(mockData, 200)

      const result = await ApiService.get('/test')

      expect(result).to.deep.equal(mockData)
    })

    it('should include Authorization header when token exists', async () => {
      global.localStorage.setItem('token', 'test-token-123')
      let capturedHeaders = null
      
      global.fetch = (url, options) => {
        capturedHeaders = options.headers
        return mockFetch({ success: true }, 200)
      }

      await ApiService.get('/test')

      expect(capturedHeaders).to.have.property('Authorization', 'Bearer test-token-123')
    })

    it('should not include Authorization header when token does not exist', async () => {
      let capturedHeaders = null
      
      global.fetch = (url, options) => {
        capturedHeaders = options.headers
        return mockFetch({ success: true }, 200)
      }

      await ApiService.get('/test')

      expect(capturedHeaders).to.not.have.property('Authorization')
    })

    it('should throw error on failed request', async () => {
      global.fetch = () => mockFetch({ error: 'Not found' }, 404)

      try {
        await ApiService.get('/test')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).to.be.instanceOf(Error)
        expect(error.message).to.include('Not found')
      }
    })
  })

  describe('post', () => {
    it('should make a POST request with data', async () => {
      const mockData = { success: true, id: 1 }
      let capturedBody = null
      
      global.fetch = (url, options) => {
        capturedBody = JSON.parse(options.body)
        return mockFetch(mockData, 201)
      }

      const requestData = { name: 'Test', value: 123 }
      const result = await ApiService.post('/test', requestData)

      expect(capturedBody).to.deep.equal(requestData)
      expect(result).to.deep.equal(mockData)
    })

    it('should include Authorization header when token exists', async () => {
      global.localStorage.setItem('token', 'test-token-123')
      let capturedHeaders = null
      
      global.fetch = (url, options) => {
        capturedHeaders = options.headers
        return mockFetch({ success: true }, 201)
      }

      await ApiService.post('/test', { data: 'test' })

      expect(capturedHeaders).to.have.property('Authorization', 'Bearer test-token-123')
    })

    it('should throw error on failed request', async () => {
      global.fetch = () => mockFetch({ error: 'Bad request' }, 400)

      try {
        await ApiService.post('/test', {})
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).to.be.instanceOf(Error)
      }
    })
  })

  describe('put', () => {
    it('should make a PUT request with data', async () => {
      const mockData = { success: true }
      let capturedBody = null
      
      global.fetch = (url, options) => {
        capturedBody = JSON.parse(options.body)
        return mockFetch(mockData, 200)
      }

      const requestData = { id: 1, name: 'Updated' }
      const result = await ApiService.put('/test/1', requestData)

      expect(capturedBody).to.deep.equal(requestData)
      expect(result).to.deep.equal(mockData)
    })

    it('should include Authorization header when token exists', async () => {
      global.localStorage.setItem('token', 'test-token-123')
      let capturedHeaders = null
      
      global.fetch = (url, options) => {
        capturedHeaders = options.headers
        return mockFetch({ success: true }, 200)
      }

      await ApiService.put('/test/1', { data: 'test' })

      expect(capturedHeaders).to.have.property('Authorization', 'Bearer test-token-123')
    })
  })

  describe('delete', () => {
    it('should make a DELETE request', async () => {
      const mockData = { success: true, message: 'Deleted' }
      global.fetch = () => mockFetch(mockData, 200)

      const result = await ApiService.delete('/test/1')

      expect(result).to.deep.equal(mockData)
    })

    it('should include Authorization header when token exists', async () => {
      global.localStorage.setItem('token', 'test-token-123')
      let capturedHeaders = null
      
      global.fetch = (url, options) => {
        capturedHeaders = options.headers
        return mockFetch({ success: true }, 200)
      }

      await ApiService.delete('/test/1')

      expect(capturedHeaders).to.have.property('Authorization', 'Bearer test-token-123')
    })

    it('should throw error on failed request', async () => {
      global.fetch = () => mockFetch({ error: 'Not found' }, 404)

      try {
        await ApiService.delete('/test/1')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).to.be.instanceOf(Error)
      }
    })
  })
})
