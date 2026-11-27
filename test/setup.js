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
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: 'left',
        textBaseline: 'alphabetic',
        fillRect: function() {},
        clearRect: function() {},
        strokeRect: function() {},
        fillText: function() {},
        strokeText: function() {},
        beginPath: function() {},
        moveTo: function() {},
        lineTo: function() {},
        stroke: function() {},
        fill: function() {},
        save: function() {},
        restore: function() {},
        translate: function() {},
        scale: function() {},
        drawImage: function() {},
        measureText: function(text) {
          return { width: String(text || '').length * 8 }
        },
        getImageData: function(sx, sy, sw, sh) {
          return { data: new Uint8ClampedArray(Math.max(sw, 1) * Math.max(sh, 1) * 4), width: sw, height: sh }
        },
        putImageData: function() {},
        createImageData: function(w, h) {
          return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }
        },
      }
    }
    return null
  }

  // Track canvas instances to generate unique data URLs
  let canvasCounter = 0

  HTMLCanvasElement.prototype.toDataURL = function() {
    canvasCounter++
    const uniqueId = canvasCounter.toString(36).padStart(8, '0')
    return `data:image/png;base64,iVBORw0KGgoAAAANSUh${uniqueId}EUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`
  }
}

// Mock fetch for API service tests (will be overridden in individual test files)
// Note: node-fetch is ESM only in v3+, so we'll mock it in tests instead
