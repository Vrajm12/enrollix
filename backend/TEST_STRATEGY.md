# SMS CRM Testing Strategy & Documentation

## Overview

This document outlines the comprehensive test strategy for the CRM SMS messaging system. The test suite ensures production-grade reliability, security, and maintainability.

## Test Architecture

The test suite is organized into three layers:

```
Unit Tests (85% coverage)
         ↓
Integration Tests (80% coverage)
         ↓
E2E Tests (70% coverage)
```

### 1. Unit Tests (Service Layer)

**Location:** `src/__tests__/unit/services/`

**Coverage:** Testing individual functions in isolation with mocks.

#### Twilio Service Tests (`twilio.test.ts`)
Tests the `twilioService` module which encapsulates all Twilio API interactions.

**Test Cases:**
- Phone number formatting (E.164 standard)
  - Indian numbers: `+919876543210`, `9876543210`, `09876543210`
  - International numbers with country codes
  - Invalid number detection
- SMS sending functionality
  - Success scenarios (message returns SID)
  - Failure scenarios (network errors, invalid credentials)
  - Long message handling (1000+ characters)
- Message status retrieval
  - Successful status queries
  - Non-existent message handling
  - Status caching

**Running Unit Tests:**
```bash
npm run test:unit
```

**Coverage Target:** 85% (highest threshold)

---

### 2. Integration Tests (API Routes)

**Location:** `src/__tests__/integration/`

**Coverage:** Testing API endpoints with database and Twilio mocks.

#### Messaging Routes Tests (`messaging.test.ts`)
Tests complete SMS API endpoints including send, status check, and bulk operations.

**Endpoints Tested:**

| Endpoint | Method | Tests |
|----------|--------|-------|
| `/sms/send` | POST | Valid SMS send, invalid payload, non-existent lead |
| `/sms/status/:messageSid` | GET | Status retrieval, unknown message, status updates |
| `/sms/thread/:leadId` | GET | Thread retrieval, invalid lead, pagination |
| `/bulk/send` | POST | Bulk send, partial failures, error handling |
| `/stats` | GET | Statistics calculation, delivery rates |

**Key Test Scenarios:**
- Request validation (payload structure, required fields)
- Database interactions (lead lookup, message creation)
- Error handling (404 for missing resources, 400 for bad input)
- Response format validation
- Status code verification

**Running Integration Tests:**
```bash
npm run test:integration
```

**Coverage Target:** 80%

---

#### Webhook Handler Tests (`webhooks.test.ts`)
Tests Twilio webhook processing for message status updates.

**Webhook Scenarios:**
- Successful delivery confirmations
- Delivery failures with error codes
- Common Twilio error codes
  - `21614`: Not queued for delivery
  - `21615`: Invalid message body
  - `21202`: Invalid phone number format
  - `21622`: Cannot send to short codes
- Idempotent webhook handling (duplicate webhooks)
- Graceful handling of missing messages
- Concurrent webhook processing

**Key Features Tested:**
- Status persistence to database
- Error code capture
- Activity log creation
- Webhook authentication bypass (public endpoint)

**Running Webhook Tests:**
```bash
npm run test:integration -- webhooks.test.ts
```

---

#### Authentication Tests (`auth.test.ts`)
Tests JWT authentication and authorization for protected endpoints.

**Authentication Flows:**
- Valid JWT token acceptance
- Expired token rejection
- Malformed token handling
- Invalid Bearer token format
- Missing Authorization header

**Protected Endpoints:**
- `POST /sms/send` (requires auth)
- `GET /sms/thread/:leadId` (requires auth)
- `POST /bulk/send` (requires auth)
- `GET /sms/status/:messageSid` (requires auth)

**Public Endpoints:**
- `POST /webhooks/sms-status` (no auth required)

**Test Cases:**
- Valid token with correct secret
- Invalid tokens (wrong secret, expired, malformed)
- Token extraction and user population
- Multiple concurrent requests with different tokens

**Running Auth Tests:**
```bash
npm run test:integration -- auth.test.ts
```

---

### 3. E2E Tests (Complete Workflows)

**Location:** `src/__tests__/e2e/`

**Coverage:** Testing complete user workflows from end-to-end.

#### SMS Lifecycle Tests (`sms-lifecycle.test.ts`)
Tests the complete SMS workflow from sending to delivery confirmation.

**Workflows Tested:**

1. **Complete SMS Lifecycle**
   ```
   User sends SMS → Twilio accepts → Webhook received → Status checked
   ```
   - Verifies status progression: SENT → DELIVERED
   - Confirms database persistence
   - Validates message metadata

2. **Failed Delivery Workflow**
   ```
   User sends SMS → Twilio rejects → Webhook with error code → Status checked
   ```
   - Tests failure handling
   - Error code capture and persistence
   - Accurate status representation

3. **SMS Thread Tracking**
   - Multiple messages from single lead
   - Chronological ordering
   - Lead metadata association

4. **Bulk SMS Operations**
   - Send to multiple leads
   - Track individual delivery status
   - Handle partial failures gracefully

5. **Concurrent Operations**
   - Simultaneous SMS sends
   - Race condition prevention
   - State consistency

6. **Error Recovery**
   - Transient Twilio errors (retry scenarios)
   - Invalid phone number handling
   - Database transaction rollback

**Running E2E Tests:**
```bash
npm run test:e2e
```

**Coverage Target:** 70% (baseline)

---

## Test Execution

### Development

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run specific test suite
npm test -- messaging.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should send SMS"
```

### CI/CD Pipeline

```bash
# Generate coverage report
npm run test:coverage

# Run with CI optimizations (detects hanging tests)
npm run test:ci
```

### Coverage Reports

After running tests with coverage:
```bash
npm run test:coverage
```

Coverage HTML report: `coverage/lcov-report/index.html`

**Coverage Thresholds:**
- Global: 70-80%
- Services: 85%
- Routes: 75-80%
- Utilities: 75%

---

## Mock Strategy

### Prisma Client Mocking

All database operations are mocked to prevent test database dependencies.

**Mock Factory Example:**
```typescript
import { mockPrisma } from '../../mocks';

mockPrisma.lead.findUnique.mockResolvedValue({
  id: 1,
  name: 'John Doe',
  phone: '+919876543210',
  email: 'john@example.com',
  createdAt: new Date(),
  updatedAt: new Date()
});
```

**Available Prisma Mocks:**
- `lead` (findUnique, findMany, create, update, delete)
- `sMSMessage` (findUnique, findFirst, findMany, create, update)
- `whatsAppMessage` (findUnique, findMany, create, update)
- `user` (findUnique, findMany, create)

### Twilio Service Mocking

Twilio operations are mocked to avoid actual SMS sending during tests.

**Mock Factory Example:**
```typescript
jest.mock('../../../services/twilio', () => ({
  twilioService: {
    sendSMS: jest.fn().mockResolvedValue('SM1234567890'),
    getMessageStatus: jest.fn().mockResolvedValue('delivered')
  }
}));
```

### Test Helpers

Factory functions create realistic mock data:

```typescript
// Create mock lead
const lead = createMockLead({ id: 1, phone: '+919876543210' });

// Create mock SMS message
const sms = createMockSMSMessage({ 
  leadId: 1, 
  status: 'SENT',
  messageId: 'SM123'
});

// Create mock user
const user = createMockUser({ email: 'admin@crm.com' });
```

**Helper Location:** `src/__tests__/utils/test-helpers.ts`

---

## Test Isolation & Cleanup

Each test has automatic setup and teardown:

```typescript
beforeEach(() => {
  resetAllMocks();  // Clear all mock state
  jest.clearAllMocks();  // Clear jest mock call history
});
```

This ensures **test independence** - each test runs in isolation.

---

## Common Testing Patterns

### Pattern 1: Testing Happy Path
```typescript
it('should send SMS successfully', async () => {
  // Arrange
  mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
  mockPrisma.sMSMessage.create.mockResolvedValue(mockMessage);

  // Act
  const response = await request(app)
    .post('/messaging/sms/send')
    .send({ leadId: 1, message: 'Test' });

  // Assert
  expect(response.status).toBe(201);
  expect(response.body.messageId).toBe('SM123');
});
```

### Pattern 2: Testing Error Cases
```typescript
it('should return 404 for non-existent lead', async () => {
  // Arrange
  mockPrisma.lead.findUnique.mockResolvedValue(null);

  // Act
  const response = await request(app)
    .post('/messaging/sms/send')
    .send({ leadId: 999, message: 'Test' });

  // Assert
  expect(response.status).toBe(404);
  expect(response.body.message).toBe('Lead not found');
});
```

### Pattern 3: Testing Webhook Processing
```typescript
it('should update message status from webhook', async () => {
  // Arrange
  mockPrisma.sMSMessage.findFirst.mockResolvedValue(mockMessage);
  mockPrisma.sMSMessage.update.mockResolvedValue({
    ...mockMessage,
    status: 'DELIVERED'
  });

  // Act
  const response = await request(app)
    .post('/messaging/webhooks/sms-status')
    .send({
      MessageSid: 'SM123',
      MessageStatus: 'delivered'
    });

  // Assert
  expect(response.status).toBe(200);
  expect(mockPrisma.sMSMessage.update).toHaveBeenCalled();
});
```

---

## Debugging Tests

### Verbose Output
```bash
npm test -- --verbose
```

### Debug Specific Test
```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand
# Then open chrome://inspect in Chrome DevTools
```

### Console Logging in Tests
```typescript
console.log('Debug info:', mockPrisma.lead.findUnique.mock.calls);
```

### Check Mock Call History
```typescript
expect(mockPrisma.sMSMessage.create).toHaveBeenCalledWith({
  data: {
    leadId: 1,
    message: 'Test',
    sentBy: userId
  }
});
```

---

## Continuous Integration

### GitHub Actions Setup

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '22'
      - run: npm install
      - run: npm run test:ci
```

### Pre-commit Hook

Prevent committing untested code:

```bash
#!/bin/bash
npm run test:coverage
if [ $? -ne 0 ]; then
  echo "Tests failed. Commit aborted."
  exit 1
fi
```

---

## Best Practices

### ✅ DO

- **Isolate tests**: Each test should be independent
- **Use descriptive names**: `should send SMS to lead successfully`
- **Follow AAA pattern**: Arrange, Act, Assert
- **Mock external dependencies**: Databases, APIs, services
- **Test edge cases**: Empty strings, null values, negative numbers
- **Reset mocks**: Between each test to prevent state leakage
- **Use factories**: For consistent mock data creation
- **Keep tests fast**: Avoid \> 100ms per test

### ❌ DON'T

- **Don't test external APIs**: Mock them instead
- **Don't share state between tests**: Use beforeEach cleanup
- **Don't use sleep/delays**: Use mocks to control timing
- **Don't test implementation details**: Test behavior/output
- **Don't create real database records**: Use mocks
- **Don't hardcode test data**: Use factories
- **Don't test framework code**: Jest, Express, etc.

---

## Expanding Test Coverage

### Adding New Endpoint Tests

1. Create test file: `src/__tests__/integration/new-feature.test.ts`
2. Import mocks and helpers
3. Follow test patterns above
4. Run: `npm test -- new-feature.test.ts`
5. Check coverage: `npm run test:coverage`

### Adding New Unit Tests

1. Create test file: `src/__tests__/unit/services/new-service.test.ts`
2. Mock all external dependencies
3. Test all code paths and error scenarios
4. Maintain 85% coverage target

### Adding E2E Workflows

1. Create test file: `src/__tests__/e2e/new-workflow.test.ts`
2. Test complete user journeys
3. Include success and failure paths
4. Verify side effects (database updates, logs)

---

## Troubleshooting

### Tests Timeout
```
Error: Timeout - Async callback was not invoked
```
**Solution:**
- Add `done()` callback or return Promise
- Increase timeout: `jest.setTimeout(10000)`
- Check if mock promises resolve correctly

### Mock Not Working
```
Error: Cannot spy on property
```
**Solution:**
- Clear mocks: `jest.clearAllMocks()`
- Ensure module is imported before mocking
- Check mock path matches import path

### Port Already in Use
```
Error: listen EADDRINUSE :::4000
```
**Solution:**
- Different test ports for different suites
- Cleanup after tests: `app.close()`
- Kill lingering processes

---

## Performance Optimization

### Test Execution Time

Current benchmark:
- Unit tests: ~2-3 seconds
- Integration tests: ~5-7 seconds
- E2E tests: ~8-10 seconds
- Total: ~15-20 seconds

### Optimization Strategies

1. **Parallel Execution**: Jest runs tests in parallel by default
2. **Reduce Mock Setup**: Reuse mocks when possible
3. **Skip Slow Tests**: Use `.skip` in development
4. **Coverage Only When Needed**: `npm test` vs `npm run test:coverage`

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## Next Steps

After running tests successfully:

1. ✅ Run full test suite: `npm test`
2. ✅ Check coverage: `npm run test:coverage`
3. ✅ Fix any failing tests
4. ✅ Commit with confidence
5. ✅ Push to CI/CD pipeline

---

**Last Updated:** 2024-03-29
**Test Coverage:** 70-85% across all modules
**Status:** **Production Ready** ✅
