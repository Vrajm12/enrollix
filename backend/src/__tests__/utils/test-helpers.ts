/**
 * Jest setup and global utilities for testing
 */

export const createMockUser = (overrides = {}) => ({
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashedpassword',
  role: 'COUNSELOR' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockLead = (overrides = {}) => ({
  id: 1,
  name: 'Test Lead',
  phone: '+919876543210',
  email: 'lead@example.com',
  address: 'Test Address',
  parentContact: '+919876543211',
  course: 'B.Tech',
  source: 'Website',
  status: 'LEAD' as const,
  priority: 'COLD' as const,
  nextFollowUp: null,
  assignedTo: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockSMSMessage = (overrides = {}) => ({
  id: 1,
  leadId: 1,
  sentBy: 1,
  message: 'Hello, this is a test SMS',
  status: 'SENT' as const,
  direction: 'OUTBOUND' as const,
  phoneNumber: '+919876543210',
  messageId: 'SM1234567890abcdef',
  provider: 'twilio',
  cost: 0.0075,
  errorCode: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockTwilioMessage = (overrides = {}) => ({
  sid: 'SM1234567890abcdef',
  status: 'sent',
  from: '+14155552671',
  to: '+919876543210',
  body: 'Test message',
  errorCode: null,
  errorMessage: null,
  ...overrides
});

/**
 * Mock implementations for common functions
 */
export const mockAsyncHandler = (fn: Function) => (req: any, res: any) => {
  Promise.resolve(fn(req, res)).catch((err) => res.status(500).json({ error: err.message }));
};

export const mockExpressRequest = (overrides = {}) => ({
  user: createMockUser(),
  params: {},
  body: {},
  headers: { authorization: 'Bearer token' },
  ...overrides
});

export const mockExpressResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};
