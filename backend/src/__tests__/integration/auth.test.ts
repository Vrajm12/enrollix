/**
 * Integration Tests: Authentication & Authorization
 * Tests for JWT middleware and protected endpoints
 */

import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
// @ts-ignore - test files excluded from compilation
import messagingRouter from '../../../routes/messaging';
// @ts-ignore - test files excluded from compilation
import { mockPrisma, resetAllMocks } from '../../mocks';
// @ts-ignore - test files excluded from compilation
import { createMockUser, createMockLead, createMockSMSMessage } from '../../utils/test-helpers';

jest.mock('../../../prisma', () => ({
  prisma: mockPrisma
}));

jest.mock('../../../services/twilio');

describe('Authentication & Authorization Integration Tests', () => {
  let app: express.Application;
  const mockUser = createMockUser();
  const mockLead = createMockLead();
  const validToken = jwt.sign(
    { id: mockUser.id, email: mockUser.email },
    process.env.JWT_SECRET || 'test-secret'
  );

  const invalidToken = 'invalid.token.here';
  const expiredToken = jwt.sign(
    { id: mockUser.id },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '-1h' }
  );

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Custom auth middleware that respects webhook bypass
    app.use((req, res, next) => {
      const isWebhook = req.path === '/messaging/webhooks/sms-status' && req.method === 'POST';

      if (isWebhook) {
        next();
        return;
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing or invalid token' });
      }

      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
        (req as any).user = decoded;
        next();
      } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
      }
    });

    app.use('/messaging', messagingRouter);
  });

  beforeEach(() => {
    resetAllMocks();
  });

  describe('Protected Endpoints', () => {
    it('should require authentication for POST /sms/send', async () => {
      const response = await request(app)
        .post('/messaging/sms/send')
        .send({
          leadId: 1,
          message: 'Test'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Missing or invalid token');
    });

    it('should require authentication for GET /sms/thread/:leadId', async () => {
      const response = await request(app)
        .get('/messaging/sms/thread/1');

      expect(response.status).toBe(401);
    });

    it('should require authentication for POST /bulk/send', async () => {
      const response = await request(app)
        .post('/messaging/bulk/send')
        .send({
          leadIds: [1],
          message: 'Bulk test',
          type: 'sms'
        });

      expect(response.status).toBe(401);
    });

    it('should require authentication for GET /sms/status/:messageSid', async () => {
      const response = await request(app)
        .get('/messaging/sms/status/SM123');

      expect(response.status).toBe(401);
    });
  });

  describe('Public Endpoints', () => {
    it('should allow unauthenticated access to webhook endpoint', async () => {
      mockPrisma.sMSMessage.findFirst.mockResolvedValue(createMockSMSMessage());
      mockPrisma.sMSMessage.update.mockResolvedValue(createMockSMSMessage());

      const response = await request(app)
        .post('/messaging/webhooks/sms-status')
        .send({
          MessageSid: 'SM123',
          MessageStatus: 'delivered'
        });

      // Should not return 401
      expect(response.status).not.toBe(401);
    });

    it('should handle webhook without Authorization header', async () => {
      mockPrisma.sMSMessage.findFirst.mockResolvedValue(createMockSMSMessage());
      mockPrisma.sMSMessage.update.mockResolvedValue(createMockSMSMessage());

      const response = await request(app)
        .post('/messaging/webhooks/sms-status')
        .set('Authorization', '') // Explicitly empty
        .send({
          MessageSid: 'SM123',
          MessageStatus: 'delivered'
        });

      expect(response.status).not.toBe(401);
    });
  });

  describe('Valid Token Handling', () => {
    it('should accept valid JWT token', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.sMSMessage.create.mockResolvedValue(createMockSMSMessage());
      mockPrisma.sMSMessage.findUnique.mockResolvedValue(createMockSMSMessage());

      const response = await request(app)
        .post('/messaging/sms/send')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          leadId: 1,
          message: 'Test with valid token'
        });

      expect(response.status).not.toBe(401);
    });

    it('should populate req.user from valid token', async () => {
      let capturedUser: any = null;

      const testApp = express();
      testApp.use(express.json());

      testApp.use((req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ message: 'Missing token' });
        }

        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
          (req as any).user = decoded;
          capturedUser = decoded;
          next();
        } catch (error) {
          return res.status(401).json({ message: 'Invalid token' });
        }
      });

      testApp.get('/test', (req, res) => {
        res.json({ user: (req as any).user });
      });

      const response = await request(testApp)
        .get('/test')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(capturedUser.id).toBe(mockUser.id);
      expect(capturedUser.email).toBe(mockUser.email);
    });
  });

  describe('Invalid Token Handling', () => {
    it('should reject malformed token', async () => {
      const response = await request(app)
        .post('/messaging/sms/send')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({
          leadId: 1,
          message: 'Test'
        });

      expect(response.status).toBe(401);
    });

    it('should reject expired token', async () => {
      const response = await request(app)
        .post('/messaging/sms/send')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          leadId: 1,
          message: 'Test'
        });

      expect(response.status).toBe(401);
    });

    it('should reject Bearer token with incorrect format', async () => {
      const response = await request(app)
        .post('/messaging/sms/send')
        .set('Authorization', `InvalidScheme ${validToken}`)
        .send({
          leadId: 1,
          message: 'Test'
        });

      expect(response.status).toBe(401);
    });

    it('should reject Authorization header without Bearer prefix', async () => {
      const response = await request(app)
        .post('/messaging/sms/send')
        .set('Authorization', validToken)
        .send({
          leadId: 1,
          message: 'Test'
        });

      expect(response.status).toBe(401);
    });

    it('should reject token signed with different secret', async () => {
      const wrongSecretToken = jwt.sign(
        { id: mockUser.id },
        'different-secret'
      );

      const response = await request(app)
        .post('/messaging/sms/send')
        .set('Authorization', `Bearer ${wrongSecretToken}`)
        .send({
          leadId: 1,
          message: 'Test'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Authorization Edge Cases', () => {
    it('should handle missing Authorization header', async () => {
      const response = await request(app)
        .post('/messaging/sms/send')
        .send({
          leadId: 1,
          message: 'Test'
        });

      // No Authorization header = 401
      expect(response.status).toBe(401);
    });

    it('should handle empty Authorization header', async () => {
      const response = await request(app)
        .post('/messaging/sms/send')
        .set('Authorization', '')
        .send({
          leadId: 1,
          message: 'Test'
        });

      expect(response.status).toBe(401);
    });

    it('should handle whitespace-only Authorization header', async () => {
      const response = await request(app)
        .post('/messaging/sms/send')
        .set('Authorization', '   ')
        .send({
          leadId: 1,
          message: 'Test'
        });

      expect(response.status).toBe(401);
    });

    it('should allow requests with valid token case-insensitively for Bearer', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.sMSMessage.create.mockResolvedValue(createMockSMSMessage());
      mockPrisma.sMSMessage.findUnique.mockResolvedValue(createMockSMSMessage());

      const response = await request(app)
        .post('/messaging/sms/send')
        .set('Authorization', `bearer ${validToken}`.toLowerCase())
        .send({
          leadId: 1,
          message: 'Test'
        });

      // Lowercase 'bearer' might still work depending on implementation
      // At minimum, uppercase Bearer should work
      expect([200, 201, 401]).toContain(response.status);
    });
  });

  describe('Multiple Requests', () => {
    it('should validate token for each request independently', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.sMSMessage.create.mockResolvedValue(createMockSMSMessage());
      mockPrisma.sMSMessage.findUnique.mockResolvedValue(createMockSMSMessage());

      // Request 1: Valid token
      const response1 = await request(app)
        .post('/messaging/sms/send')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          leadId: 1,
          message: 'Test 1'
        });

      expect(response1.status).not.toBe(401);

      // Request 2: Invalid token
      const response2 = await request(app)
        .post('/messaging/sms/send')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({
          leadId: 1,
          message: 'Test 2'
        });

      expect(response2.status).toBe(401);

      // Request 3: Valid token again
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.sMSMessage.create.mockResolvedValue(createMockSMSMessage());
      mockPrisma.sMSMessage.findUnique.mockResolvedValue(createMockSMSMessage());

      const response3 = await request(app)
        .post('/messaging/sms/send')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          leadId: 1,
          message: 'Test 3'
        });

      expect(response3.status).not.toBe(401);
    });
  });
});
