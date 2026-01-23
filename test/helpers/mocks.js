// Mock helpers for testing

/**
 * Create a mock Express request object
 */
function mockRequest(options = {}) {
  return {
    headers: options.headers || {},
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    user: options.user || null,
    app: {
      locals: options.locals || {},
    },
    ...options,
  }
}

/**
 * Create a mock Express response object
 */
function mockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
  }

  res.status = function(code) {
    this.statusCode = code
    return this
  }

  res.json = function(data) {
    this.body = data
    return this
  }

  res.send = function(data) {
    this.body = data
    return this
  }

  res.setHeader = function(name, value) {
    this.headers[name] = value
    return this
  }

  res.sendFile = function(path) {
    this.filePath = path
    return this
  }

  return res
}

/**
 * Create a mock next function for middleware
 */
function mockNext() {
  let called = false
  let error = null
  
  const next = function(err) {
    called = true
    error = err
  }
  
  Object.defineProperty(next, 'called', {
    get: () => called,
    set: (val) => { called = val }
  })
  
  Object.defineProperty(next, 'error', {
    get: () => error,
    set: (val) => { error = val }
  })
  
  return next
}

/**
 * Create a mock fetch function
 */
function mockFetch(responseData, status = 200) {
  return (url, options) => {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      url,
      options,
      json: async () => responseData,
      text: async () => JSON.stringify(responseData),
      headers: new Map([['content-type', 'application/json']]),
    })
  }
}

/**
 * Create a mock Mongoose model
 */
function mockMongooseModel(mockData = null) {
  const model = function(data) {
    this.data = data
    this.save = async () => ({ ...data, _id: 'mock-id-123', createdAt: new Date() })
  }

  model.findOne = async (query) => {
    if (mockData) {
      return {
        ...mockData,
        populate: async () => mockData,
      }
    }
    return null
  }

  model.findById = async (id) => {
    if (mockData && mockData._id === id) {
      return {
        ...mockData,
        populate: async () => mockData,
      }
    }
    return null
  }

  model.find = async (query) => {
    return mockData ? [mockData] : []
  }

  model.findOneAndUpdate = async (query, update, options) => {
    return { ...mockData, ...update, _id: 'mock-id-123' }
  }

  model.findOneAndDelete = async (query) => {
    return mockData
  }

  model.collection = {
    dropIndex: async () => {},
    createIndex: async () => {},
  }

  return model
}

/**
 * Mock localStorage for Node environment
 */
function createLocalStorageMock() {
  let store = {}

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString()
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index) => {
      const keys = Object.keys(store)
      return keys[index] || null
    },
  }
}

/**
 * Mock axios for HTTP requests
 */
function mockAxios(responseData, status = 200) {
  return {
    request: async (options) => ({
      data: responseData,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: {},
      config: options,
    }),
    get: async (url, config) => ({
      data: responseData,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
    }),
    post: async (url, data, config) => ({
      data: responseData,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
    }),
    put: async (url, data, config) => ({
      data: responseData,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
    }),
    delete: async (url, config) => ({
      data: responseData,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
    }),
  }
}

module.exports = {
  mockRequest,
  mockResponse,
  mockNext,
  mockFetch,
  mockMongooseModel,
  createLocalStorageMock,
  mockAxios,
}
