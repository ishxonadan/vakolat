// Test setup file
// This file sets up the testing environment

// Setup jsdom for browser-like environment in Node.js
if (typeof window === 'undefined') {
  require('jsdom-global')()
}

// Mock localStorage for Node.js environment
if (typeof localStorage === 'undefined') {
  const localStorageMock = (() => {
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
    }
  })()
  global.localStorage = localStorageMock
}

// Mock Canvas for barcode generation tests
// jsdom doesn't support canvas.getContext() without native canvas package
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function(contextType) {
    if (contextType === '2d') {
      return {
        fillStyle: '',
        fillRect: function() {},
        fillText: function() {},
        measureText: function(text) {
          return { width: text.length * 8 }
        },
      }
    }
    return null
  }
  
  // Track canvas instances to generate unique data URLs
  let canvasCounter = 0
  
  HTMLCanvasElement.prototype.toDataURL = function(type) {
    // Return a mock base64 image data URL with unique counter
    canvasCounter++
    const uniqueId = canvasCounter.toString(36).padStart(8, '0')
    return `data:image/png;base64,iVBORw0KGgoAAAANSUh${uniqueId}EUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`
  }
}

// Mock fetch for API service tests (will be overridden in individual test files)
// Note: node-fetch is ESM only in v3+, so we'll mock it in tests instead
