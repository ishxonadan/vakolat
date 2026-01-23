// Test fixtures for consistent test data
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key'

const fixtures = {
  // User fixtures
  users: {
    admin: {
      id: '507f1f77bcf86cd799439011',
      nickname: 'admin',
      firstname: 'Admin',
      lastname: 'User',
      level: 'admin',
      isActive: true,
    },
    rais: {
      id: '507f1f77bcf86cd799439012',
      nickname: 'superadmin',
      firstname: 'Super',
      lastname: 'Admin',
      level: 'rais',
      isActive: true,
    },
    expert: {
      id: '507f1f77bcf86cd799439013',
      nickname: 'expert1',
      firstname: 'Expert',
      lastname: 'One',
      level: 'expert',
      isActive: true,
    },
    inactive: {
      id: '507f1f77bcf86cd799439014',
      nickname: 'inactive',
      firstname: 'Inactive',
      lastname: 'User',
      level: 'expert',
      isActive: false,
    },
  },

  // Permission fixtures
  permissions: {
    manageUsers: {
      name: 'manage_users',
      description: 'Can manage users',
      isActive: true,
    },
    viewStatistics: {
      name: 'view_statistics',
      description: 'Can view statistics',
      isActive: true,
    },
    manageTickets: {
      name: 'manage_tickets',
      description: 'Can manage tickets',
      isActive: true,
    },
    viewDissertations: {
      name: 'view_dissertations',
      description: 'Can view dissertations',
      isActive: true,
    },
  },

  // Ticket fixtures
  tickets: {
    valid: {
      ticketId: 'IQ0000000001',
      passport: 'AB1234567',
      fullname: 'Test User',
      date: new Date('2024-01-15T00:00:00.000Z'),
      dailyOrderNumber: 1,
      globalTicketNumber: 1,
      isUpdate: false,
      nameChanged: false,
    },
    updated: {
      ticketId: 'IQ0000000002',
      passport: 'AB7654321',
      fullname: 'Updated User',
      date: new Date('2024-01-15T00:00:00.000Z'),
      dailyOrderNumber: 2,
      globalTicketNumber: 2,
      isUpdate: true,
      nameChanged: true,
    },
  },

  // Website/Organization fixtures
  websites: {
    natlib: {
      name: 'National Library of Uzbekistan',
      url: 'https://www.natlib.uz',
      libraryConfig: {
        locationCode: 'LOC001',
        locationName: 'National Library',
        region: 'Tashkent',
        apiEndpoint: 'https://library.natlib.uz/api',
        isActive: true,
      },
    },
    regionalLib: {
      name: 'Regional Library',
      url: 'https://regional.library.uz',
      libraryConfig: {
        locationCode: 'LOC002',
        locationName: 'Regional Library',
        region: 'Samarkand',
        apiEndpoint: 'https://api.regional.library.uz',
        isActive: true,
      },
    },
    noLibConfig: {
      name: 'Website Without Library',
      url: 'https://example.library.uz',
      libraryConfig: {
        isActive: false,
      },
    },
  },

  // Rating metrics fixtures
  metrics: {
    high: {
      visitCount: 500,
      pageVisits: 600,
      interactiveServiceUsage: 70,
      personalAccountCount: 80,
      electronicResourceCount: 15,
      newsViewCount: 15,
      electronicResourceUsage: 20,
    },
    medium: {
      visitCount: 250,
      pageVisits: 400,
      interactiveServiceUsage: 35,
      personalAccountCount: 40,
      electronicResourceCount: 7,
      newsViewCount: 7,
      electronicResourceUsage: 8,
    },
    low: {
      visitCount: 50,
      pageVisits: 100,
      interactiveServiceUsage: 5,
      personalAccountCount: 10,
      electronicResourceCount: 1,
      newsViewCount: 1,
      electronicResourceUsage: 2,
    },
    zero: {
      visitCount: 0,
      pageVisits: 0,
      interactiveServiceUsage: 0,
      personalAccountCount: 0,
      electronicResourceCount: 0,
      newsViewCount: 0,
      electronicResourceUsage: 0,
    },
  },

  // Survey vote fixtures
  surveyVotes: {
    good: {
      domain: 'natlib.uz',
      responses: {
        usability: 5,
        design: 5,
        search: 5,
      },
      fingerprint: 'test-fingerprint-1',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    },
    average: {
      domain: 'natlib.uz',
      responses: {
        usability: 3,
        design: 3,
        search: 3,
      },
      fingerprint: 'test-fingerprint-2',
      ipAddress: '192.168.1.2',
      userAgent: 'Mozilla/5.0',
    },
    poor: {
      domain: 'natlib.uz',
      responses: {
        usability: 1,
        design: 1,
        search: 1,
      },
      fingerprint: 'test-fingerprint-3',
      ipAddress: '192.168.1.3',
      userAgent: 'Mozilla/5.0',
    },
  },

  // Helper to generate JWT tokens
  generateToken(userData, options = {}) {
    const defaultOptions = { expiresIn: '1h' }
    return jwt.sign(userData, JWT_SECRET, { ...defaultOptions, ...options })
  },

  // Helper to generate expired token
  generateExpiredToken(userData) {
    return jwt.sign(userData, JWT_SECRET, { expiresIn: '-1h' })
  },

  // Helper to normalize dates for tickets
  normalizeDate(date = new Date()) {
    const normalized = new Date(date)
    normalized.setHours(0, 0, 0, 0)
    return normalized
  },
}

module.exports = fixtures
