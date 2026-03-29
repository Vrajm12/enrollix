/**
 * Twilio Service Mocks
 */

export const mockTwilioService = {
  sendSMS: jest.fn().mockResolvedValue('SM1234567890abcdef'),
  getMessageStatus: jest.fn().mockResolvedValue('delivered')
};

export const mockTwilioServiceWithError = {
  sendSMS: jest.fn().mockRejectedValue(new Error('Invalid phone number')),
  getMessageStatus: jest.fn().mockRejectedValue(new Error('Message not found'))
};

/**
 * Prisma Client Mocks
 */
export const mockPrismaLeadOperations = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

export const mockPrismaSMSMessageOperations = {
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn()
};

export const mockPrismaUserOperations = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

export const mockPrismaActivityOperations = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn()
};

export const mockPrismaWhatsAppMessageOperations = {
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn()
};

export const mockPrisma = {
  lead: mockPrismaLeadOperations,
  sMSMessage: mockPrismaSMSMessageOperations,
  whatsAppMessage: mockPrismaWhatsAppMessageOperations,
  user: mockPrismaUserOperations,
  activity: mockPrismaActivityOperations,
  $disconnect: jest.fn().mockResolvedValue(undefined)
};

/**
 * Reset all mocks
 */
export const resetAllMocks = () => {
  Object.values(mockPrismaLeadOperations).forEach(mock => mock.mockReset());
  Object.values(mockPrismaSMSMessageOperations).forEach(mock => mock.mockReset());
  Object.values(mockPrismaUserOperations).forEach(mock => mock.mockReset());
  Object.values(mockTwilioService).forEach(mock => mock.mockReset());
};
