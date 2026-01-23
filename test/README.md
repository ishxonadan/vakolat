# Test Suite

This directory contains comprehensive unit and integration tests for the vakolat application using Mocha and Chai.

## Structure

```
test/
├── setup.js                          # Test environment setup
├── helpers/                          # Test utilities
│   ├── fixtures.js                   # Test data fixtures
│   └── mocks.js                      # Mock objects and functions
├── utils/                            # Utility function tests
│   ├── barcode.test.js              # Basic barcode tests
│   └── barcode.enhanced.test.js     # Enhanced edge case tests
│   └── logo.test.js                 # Logo SVG generation tests
├── services/                         # Frontend service tests
│   ├── api.service.test.js          # API HTTP methods
│   ├── auth.service.test.js         # Authentication service
│   └── plausible.service.test.js    # Analytics service
├── middleware/                       # Backend middleware tests
│   └── auth.middleware.test.js      # Auth verification, permissions
├── server/                           # Server function tests
│   ├── ticket-functions.test.js     # Ticket ID generation
│   └── auth-functions.test.js       # Password hashing, JWT
├── models/                           # Schema validation tests
│   └── schemas.test.js              # Mongoose model validation
├── integration/                      # Integration tests
│   └── api.integration.test.js      # Full workflow tests
└── security/                         # Security tests
    └── validation.test.js           # Input validation, XSS, SQL injection
```

## Running Tests

Run all tests:
```bash
npm run test
```

Run specific test file:
```bash
npx mocha test/services/auth.service.test.js
```

## Test Coverage

### Helpers (Test Utilities)
- **fixtures.js**: Reusable test data (users, tickets, metrics, tokens)
- **mocks.js**: Mock functions for Express, Mongoose, fetch, localStorage

### Utils
- **barcode.test.js**: Basic barcode generation
  - Data URL generation
  - Different inputs produce different outputs
  - Special character handling
- **barcode.enhanced.test.js**: Advanced edge cases
  - Long text (1000+ chars)
  - Unicode characters
  - Performance testing
  - Consistency verification
- **logo.test.js**: SVG logo generation and validation

### Services
- **api.service.test.js**: HTTP methods (67 tests)
  - GET, POST, PUT, DELETE operations
  - Authorization header handling
  - Error handling
  - Token management
- **auth.service.test.js**: Authentication (25 tests)
  - Login/logout flows
  - Token validation and expiration
  - User level hierarchy
  - Permission checking
  - localStorage integration
- **plausible.service.test.js**: Analytics service (50+ tests)
  - Site ID extraction
  - Date range creation
  - Point calculation
  - API date formatting
  - Boundary condition testing

### Middleware
- **auth.middleware.test.js**: Authentication middleware (30+ tests)
  - JWT verification
  - User level hierarchy (rais > admin > moderator > expert > user)
  - Permission checking
  - Superadmin bypass
  - Error scenarios

### Server Functions
- **ticket-functions.test.js**: Ticket system
  - ID generation (IQ0000000001 format)
  - Calendar day normalization
  - Passport validation (AA1234567 format)
  - Boundary testing
- **auth-functions.test.js**: Security
  - bcrypt password hashing
  - Salt generation
  - JWT token creation and verification

### Models
- **schemas.test.js**: Mongoose validation (40+ tests)
  - User Rating schema validation
  - Survey Vote schema (responses 1-5 validation)
  - Rating Assignment schema
  - Website Rating schema
  - Required field checking
  - Default value setting

### Integration
- **api.integration.test.js**: Full workflows (20+ tests)
  - Complete authentication flow
  - Permission hierarchy enforcement
  - Ticket generation workflow
  - Error handling chains
  - Network failure scenarios

### Security
- **validation.test.js**: Security checks (35+ tests)
  - Password strength (bcrypt with 10 rounds)
  - JWT security (expiration, tampering)
  - SQL injection prevention
  - XSS prevention
  - Input sanitization
  - Rate limiting concepts

## Writing New Tests

When adding new tests:

1. Create test file in appropriate directory: `test/[category]/[feature].test.js`
2. Follow the existing test structure:
   ```javascript
   const { expect } = require('chai')
   const Feature = require('../../src/path/to/feature')
   
   describe('Feature Name', () => {
     describe('methodName', () => {
       it('should do something', () => {
         // Test implementation
       })
     })
   })
   ```
3. Use descriptive test names
4. Test both success and error cases
5. Clean up after each test (use `beforeEach` and `afterEach`)

## Test Statistics

- **Total Test Files**: 16
- **Total Tests**: 250+
- **Test Categories**: 8 (Utils, Services, Middleware, Server, Models, Integration, Security, Helpers)
- **Code Coverage Areas**:
  - Authentication & Authorization ✓
  - Ticket Generation System ✓
  - Analytics & Metrics ✓
  - Database Schemas ✓
  - Security & Validation ✓
  - API Services ✓
  - Utility Functions ✓

## Notes

- Tests use mocked `fetch` and `localStorage` for browser-like environment
- JWT tokens are generated using the actual `jsonwebtoken` library
- Tests are isolated and don't require a running server or database
- All tests run in Node.js environment with jsdom for DOM simulation
- Fixtures and mocks provided for consistent test data
- Security tests cover common vulnerabilities (SQL injection, XSS, etc.)
- Performance benchmarks included in enhanced tests

## Best Practices Demonstrated

1. **Isolation**: Each test is independent and doesn't affect others
2. **Mocking**: External dependencies are mocked (DB, HTTP, etc.)
3. **Fixtures**: Consistent test data across all tests
4. **Edge Cases**: Comprehensive testing of boundary conditions
5. **Security**: Input validation and common attack vectors
6. **Integration**: Full workflow testing alongside unit tests
7. **Documentation**: Clear test descriptions and grouping
