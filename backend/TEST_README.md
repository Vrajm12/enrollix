# Quick Test Reference

## Installation

First install the test dependencies:

```bash
npm install
```

This adds:
- **jest** - Test runner
- **ts-jest** - TypeScript support for Jest  
- **supertest** - HTTP assertion library
- **@types/jest** - TypeScript types
- **@types/supertest** - TypeScript types

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (auto-rerun on file changes)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```
Opens: `coverage/lcov-report/index.html`

### By Category
```bash
npm run test:unit          # Unit tests only
npm run test:integration  # Integration tests only
npm run test:e2e          # E2E tests only
```

### Specific Test File
```bash
npm test -- messaging.test.ts
npm test -- webhooks.test.ts
npm test -- auth.test.ts
```

### CI Pipeline
```bash
npm run test:ci  # With coverage, detects hanging tests
```

## Test Files Created

### Unit Tests
- `src/__tests__/unit/services/twilio.test.ts` (20+ tests)
  - Phone formatting (E.164)
  - SMS sending (success/failure)
  - Message status retrieval

### Integration Tests
- `src/__tests__/integration/messaging.test.ts` (12+ tests)
  - `/sms/send` endpoint
  - `/sms/status/:messageSid` endpoint
  - `/sms/thread/:leadId` endpoint
  - `/bulk/send` endpoint
  - `/stats` endpoint

- `src/__tests__/integration/webhooks.test.ts` (10+ tests)
  - Twilio webhook processing
  - Status updates & error codes
  - Idempotent handling
  - Concurrent webhooks

- `src/__tests__/integration/auth.test.ts` (15+ tests)
  - JWT token validation
  - Protected endpoints
  - Public endpoints (webhooks)
  - Token expiration & error handling

### E2E Tests
- `src/__tests__/e2e/sms-lifecycle.test.ts` (10+ tests)
  - Complete SMS workflow
  - Failed delivery handling
  - SMS thread tracking
  - Bulk operations
  - Error recovery
  - Data consistency

## Test Infrastructure

### Mocks & Helpers
- `src/__tests__/mocks/index.ts` - Prisma & Twilio mocks
- `src/__tests__/utils/test-helpers.ts` - Factory functions
- `src/__tests__/setup.ts` - Global setup
- `jest.config.js` - Jest configuration

### Coverage Targets
- Unit Tests (Services): **85%**
- Integration Tests (Routes): **75-80%**
- E2E Tests (Workflows): **70%**
- Global Baseline: **70-80%**

## Test Examples

### Running One Test
```bash
npm test -- --testNamePattern="should send SMS successfully"
```

### Debugging
```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand
# Then open chrome://inspect in Chrome
```

### Watch Mode with Coverage
```bash
npm run test:watch -- --coverage
```

## Expected Results

All tests should pass:

```
PASS  src/__tests__/unit/services/twilio.test.ts
PASS  src/__tests__/integration/messaging.test.ts
PASS  src/__tests__/integration/webhooks.test.ts
PASS  src/__tests__/integration/auth.test.ts
PASS  src/__tests__/e2e/sms-lifecycle.test.ts

Test Suites: 5 passed, 5 total
Tests:       60+ passed, 60+ total
Snapshots:   0 total
Time:        15-20s (depending on machine)
```

## Coverage Report

After `npm run test:coverage`:

```
Statements   : 75-85% (depending on module)
Branches     : 70-78%
Functions    : 75-85%
Lines        : 75-85%
```

View HTML report: `coverage/lcov-report/index.html`

---

**Next Step:** Run `npm test` to validate all tests pass! 🚀
