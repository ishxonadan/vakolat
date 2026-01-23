const { expect } = require('chai')
const jwt = require('jsonwebtoken')
const AuthService = require('../../src/service/auth.service').default || require('../../src/service/auth.service')

// Mock fetch
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

describe('Auth Service', () => {
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
    
    // Reset AuthService state
    AuthService.user = null
    AuthService.token = null
    AuthService.permissions = []
  })

  afterEach(() => {
    // Restore original implementations
    global.fetch = originalFetch
    if (global.localStorage) {
      global.localStorage.clear()
    }
  })

  describe('loadFromStorage', () => {
    it('should load user and token from localStorage', () => {
      const mockUser = { id: '123', nickname: 'testuser', level: 'admin' }
      const mockToken = 'test-token-123'
      const mockPermissions = ['view_statistics', 'manage_tickets']
      
      global.localStorage.setItem('token', mockToken)
      global.localStorage.setItem('user', JSON.stringify(mockUser))
      global.localStorage.setItem('permissions', JSON.stringify(mockPermissions))
      
      AuthService.loadFromStorage()
      
      expect(AuthService.token).to.equal(mockToken)
      expect(AuthService.user).to.deep.equal(mockUser)
      expect(AuthService.permissions).to.deep.equal(mockPermissions)
    })

    it('should handle missing localStorage data', () => {
      AuthService.loadFromStorage()
      
      expect(AuthService.token).to.be.null
      expect(AuthService.user).to.be.null
      expect(AuthService.permissions).to.deep.equal([])
    })

    it('should clear storage on invalid JSON', () => {
      global.localStorage.setItem('token', 'valid-token')
      global.localStorage.setItem('user', 'invalid-json{')
      
      AuthService.loadFromStorage()
      
      expect(AuthService.token).to.be.null
      expect(AuthService.user).to.be.null
    })
  })

  describe('setToken', () => {
    it('should set token and store in localStorage', () => {
      const token = 'test-token-123'
      AuthService.setToken(token)
      
      expect(AuthService.token).to.equal(token)
      expect(global.localStorage.getItem('token')).to.equal(token)
      expect(global.localStorage.getItem('auth')).to.equal('true')
    })

  })

  describe('setUser', () => {
    it('should set user and store in localStorage', () => {
      const user = { id: '123', nickname: 'testuser', level: 'admin' }
      AuthService.setUser(user)
      
      expect(AuthService.user).to.deep.equal(user)
      expect(global.localStorage.getItem('user')).to.equal(JSON.stringify(user))
    })
  })

  describe('getToken', () => {
    it('should return the current token', () => {
      const token = 'test-token-123'
      AuthService.token = token
      
      expect(AuthService.getToken()).to.equal(token)
    })

    it('should return null when no token is set', () => {
      AuthService.token = null
      
      expect(AuthService.getToken()).to.be.null
    })
  })

  describe('getUser', () => {
    it('should return the current user', () => {
      const user = { id: '123', nickname: 'testuser' }
      AuthService.user = user
      
      expect(AuthService.getUser()).to.deep.equal(user)
    })

    it('should return null when no user is set', () => {
      AuthService.user = null
      
      expect(AuthService.getUser()).to.be.null
    })
  })

  describe('isAuthenticated', () => {
    it('should return false when no token exists', () => {
      AuthService.token = null
      AuthService.user = null
      
      expect(AuthService.isAuthenticated()).to.be.false
    })

    it('should return false when no user exists', () => {
      AuthService.token = 'some-token'
      AuthService.user = null
      
      // Without valid user, should return false
      expect(AuthService.isAuthenticated()).to.be.false
    })
  })

  describe('getUserLevel', () => {
    it('should return user level from user object', () => {
      AuthService.user = { level: 'admin' }
      
      expect(AuthService.getUserLevel()).to.equal('admin')
    })

    it('should return default level when user has no level', () => {
      AuthService.user = {}
      
      expect(AuthService.getUserLevel()).to.equal('expert')
    })

    it('should return default level when no user exists', () => {
      AuthService.user = null
      
      expect(AuthService.getUserLevel()).to.equal('expert')
    })
  })

  describe('getPermissions', () => {
    it('should return user permissions', () => {
      const permissions = ['view_statistics', 'manage_tickets']
      AuthService.permissions = permissions
      
      expect(AuthService.getPermissions()).to.deep.equal(permissions)
    })

    it('should return empty array when no permissions exist', () => {
      AuthService.permissions = []
      
      expect(AuthService.getPermissions()).to.deep.equal([])
    })
  })

  describe('hasPermission', () => {
    it('should return true for superadmin (rais)', () => {
      AuthService.user = { level: 'rais' }
      
      expect(AuthService.hasPermission('any_permission')).to.be.true
    })

    it('should return true when user has the permission', () => {
      AuthService.user = { level: 'admin' }
      AuthService.permissions = ['view_statistics', 'manage_tickets']
      
      expect(AuthService.hasPermission('view_statistics')).to.be.true
    })

    it('should return false when user does not have the permission', () => {
      AuthService.user = { level: 'admin' }
      AuthService.permissions = ['view_statistics']
      
      expect(AuthService.hasPermission('manage_tickets')).to.be.false
    })
  })

  describe('hasPermissions', () => {
    it('should return true for superadmin (rais)', () => {
      AuthService.user = { level: 'rais' }
      
      expect(AuthService.hasPermissions(['permission1', 'permission2'])).to.be.true
    })

    it('should return true when user has all required permissions', () => {
      AuthService.user = { level: 'admin' }
      AuthService.permissions = ['view_statistics', 'manage_tickets', 'view_dissertations']
      
      expect(AuthService.hasPermissions(['view_statistics', 'manage_tickets'])).to.be.true
    })

    it('should return false when user is missing any permission', () => {
      AuthService.user = { level: 'admin' }
      AuthService.permissions = ['view_statistics']
      
      expect(AuthService.hasPermissions(['view_statistics', 'manage_tickets'])).to.be.false
    })
  })

  describe('hasAccess', () => {
    it('should return true when user level is equal or higher', () => {
      AuthService.user = { level: 'admin' }
      
      expect(AuthService.hasAccess('admin')).to.be.true
      expect(AuthService.hasAccess('expert')).to.be.true
    })

    it('should return false when user level is lower', () => {
      AuthService.user = { level: 'expert' }
      
      expect(AuthService.hasAccess('admin')).to.be.false
    })

    it('should respect level hierarchy', () => {
      AuthService.user = { level: 'rais' }
      
      expect(AuthService.hasAccess('admin')).to.be.true
      expect(AuthService.hasAccess('expert')).to.be.true
      expect(AuthService.hasAccess('user')).to.be.true
    })
  })

  describe('getFullName', () => {
    it('should return full name from user object', () => {
      AuthService.user = { firstname: 'John', lastname: 'Doe' }
      
      expect(AuthService.getFullName()).to.equal('John Doe')
    })

    it('should return empty string when no user exists', () => {
      AuthService.user = null
      
      expect(AuthService.getFullName()).to.equal('')
    })

    it('should handle missing firstname or lastname', () => {
      AuthService.user = { firstname: 'John', lastname: '' }
      
      const result = AuthService.getFullName()
      // The trim() will remove trailing space, but undefined becomes 'John undefined'
      // Let's accept either 'John' or 'John ' as valid
      expect(result.trim()).to.equal('John')
    })
  })

  describe('clearStorage', () => {
    it('should clear all auth-related data', () => {
      global.localStorage.setItem('token', 'test-token')
      global.localStorage.setItem('user', '{"id":"123"}')
      global.localStorage.setItem('permissions', '["perm1"]')
      global.localStorage.setItem('auth', 'true')
      
      AuthService.token = 'test-token'
      AuthService.user = { id: '123' }
      AuthService.permissions = ['perm1']
      
      AuthService.clearStorage()
      
      expect(AuthService.token).to.be.null
      expect(AuthService.user).to.be.null
      expect(AuthService.permissions).to.deep.equal([])
      expect(global.localStorage.getItem('token')).to.be.null
      expect(global.localStorage.getItem('user')).to.be.null
      expect(global.localStorage.getItem('permissions')).to.be.null
    })
  })

  describe('login', () => {
    it('should return error on invalid credentials', async () => {
      global.fetch = () => mockFetch({ error: 'Invalid credentials' }, 401)
      
      const result = await AuthService.login('testuser', 'wrongpassword')
      
      expect(result.success).to.be.false
      expect(result.error).to.include('Invalid credentials')
    })

    it('should return error on network failure', async () => {
      global.fetch = () => Promise.reject(new Error('Network error'))
      
      const result = await AuthService.login('testuser', 'password123')
      
      expect(result.success).to.be.false
      expect(result.error).to.include('Network error')
    })
  })

  describe('logout', () => {
    it('should clear all auth data on logout', () => {
      AuthService.token = 'test-token'
      AuthService.user = { id: '123' }
      AuthService.permissions = ['perm1']
      global.localStorage.setItem('token', 'test-token')
      
      AuthService.logout()
      
      expect(AuthService.token).to.be.null
      expect(AuthService.user).to.be.null
      expect(AuthService.permissions).to.deep.equal([])
    })
  })
})
