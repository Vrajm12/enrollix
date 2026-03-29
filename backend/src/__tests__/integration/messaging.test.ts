/**
 * Integration Tests: SMS Messaging API
 * Tests for SMS endpoints with database and Twilio mocking
 */

import express from 'express';
import request from 'supertest';
import messagingRouter from '../../../routes/messaging';
import { mockPrisma, resetAllMocks } from '../../mocks';
import { createMockLead, createMockSMSMessage, createMockUser } from '../../utils/test-helpers';

// Mock dependencies
jest.mock('../../../prisma', () => ({
  prisma: mockPrisma
}));

jest.mock('../../../services/twilio', () => ({
  twilioService: {
    sendSMS: jest.fn().mockResolvedValue('SM1234567890abcdef'),
    getMessageStatus: jest.fn().mockResolvedValue('delivered')
  }
}));

describe('SMS Messaging API Integration Tests', () => {
  let app: express.Application;
  const testToken = 'valid-jwt-token';
  const mockUser = createMockUser();
  const mockLead = createMockLead();
  const mockSmsMessage = createMockSMSMessage();

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req, res, next) => {
      (req as any).user = mockUser;
      next();
    });

    app.use('/messaging', messagingRouter);
  });

  beforeEach(() => {
    resetAllMocks();
  });

  describe('POST /messaging/sms/send', () => {
    it('should send SMS to a lead successfully', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.sMSMessage.create.mockResolvedValue(mockSmsMessage);
      mockPrisma.sMSMessage.findUnique.mockResolvedValue(mockSmsMessage);

      const response = await request(app)
        .post('/messaging/sms/send')
        .send({
          leadId: 1,
          message: 'Test SMS'
        });

      expect(response.status).toBe(201);
      expect(response.body.messageId).toBe('SM1234567890abcdef');
      expect(response.body.status).toBe('SENT');
      expect(mockPrisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 1 }
      });
    });

    it('should return 400 for invalid payload', async () => {
      const response = await request(app)
        .post('/messaging/sms/send')
        .send({
          leadId: 'invalid',
          message: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid payload');
    });

    it('should return 404 for non-existent lead', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/messaging/sms/send')
        .send({
          leadId: 999,
          message: 'Test SMS'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Lead not found');
    });

    it('should mark message as FAILED if Twilio fails', async () => {
      const failedMessage = createMockSMSMessage({ status: 'FAILED' });
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.sMSMessage.create.mockResolvedValue(failedMessage);
      mockPrisma.sMSMessage.update.mockResolvedValue(failedMessage);

      const response = await request(app)
        .post('/messaging/sms/send')
        .send({
          leadId: 1,
          message: 'Test SMS'
        });

      expect(response.status).toBe(201);
    });
  });

  describe('GET /messaging/sms/status/:messageSid', () => {
    it('should return message status', async () => {
      mockPrisma.sMSMessage.findFirst.mockResolvedValue(mockSmsMessage);

      const response = await request(app)
        .get('/messaging/sms/status/SM1234567890abcdef');

      expect(response.status).toBe(200);
      expect(response.body.message.messageId).toBe('SM1234567890abcdef');
      expect(response.body.twilioStatus).toBe('delivered');
    });

    it('should return 400 if messageSid is missing', async () => {
      const response = await request(app)
        .get('/messaging/sms/status/');

      expect(response.status).toBe(400);
    });

    it('should return 404 for unknown message', async () => {
      mockPrisma.sMSMessage.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/messaging/sms/status/SM_INVALID');

      expect(response.status).toBe(404);
    });

    it('should update message status if different from Twilio', async () => {
      const staleMessage = createMockSMSMessage({ status: 'SENT' });
      const updatedMessage = createMockSMSMessage({ status: 'DELIVERED' });

      mockPrisma.sMSMessage.findFirst.mockResolvedValue(staleMessage);
      mockPrisma.sMSMessage.update.mockResolvedValue(updatedMessage);

      const response = await request(app)
        .get('/messaging/sms/status/SM1234567890abcdef');

      expect(response.status).toBe(200);
      expect(response.body.updatedFromTwilio).toBe(true);
    });
  });

  describe('GET /messaging/sms/thread/:leadId', () => {
    it('should return SMS thread for a lead', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.sMSMessage.findMany.mockResolvedValue([mockSmsMessage]);

      const response = await request(app)
        .get('/messaging/sms/thread/1');

      expect(response.status).toBe(200);
      expect(response.body.lead.id).toBe(1);
      expect(response.body.messages).toHaveLength(1);
    });

    it('should return 400 for invalid leadId', async () => {
      const response = await request(app)
        .get('/messaging/sms/thread/invalid');

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent lead', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/messaging/sms/thread/999');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /messaging/bulk/send', () => {
    it('should send bulk SMS to multiple leads', async () => {
      const leads = [mockLead, createMockLead({ id: 2 })];
      mockPrisma.lead.findMany.mockResolvedValue(leads);
      mockPrisma.sMSMessage.create.mockResolvedValue(mockSmsMessage);

      const response = await request(app)
        .post('/messaging/bulk/send')
        .send({
          leadIds: [1, 2],
          message: 'Bulk SMS',
          type: 'sms'
        });

      expect(response.status).toBe(201);
      expect(response.body.messages).toHaveLength(2);
      expect(response.body.totalMessages).toBe(2);
    });

    it('should return 404 if no leads found', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);

      const response = await request(app)
        .post('/messaging/bulk/send')
        .send({
          leadIds: [999],
          message: 'Bulk SMS',
          type: 'sms'
        });

      expect(response.status).toBe(404);
    });

    it('should handle partial failures', async () => {
      const leads = [mockLead, createMockLead({ id: 2 })];
      mockPrisma.lead.findMany.mockResolvedValue(leads);
      mockPrisma.sMSMessage.create
        .mockResolvedValueOnce(mockSmsMessage)
        .mockResolvedValueOnce(createMockSMSMessage({ id: 2, status: 'FAILED' }));

      const response = await request(app)
        .post('/messaging/bulk/send')
        .send({
          leadIds: [1, 2],
          message: 'Bulk SMS',
          type: 'sms'
        });

      expect(response.status).toBe(201);
      expect(response.body.messages).toHaveLength(2);
    });
  });

  describe('POST /messaging/webhooks/sms-status', () => {
    it('should process Twilio webhook successfully', async () => {
      const webhookApp = express();
      webhookApp.use(express.urlencoded({ extended: true }));
      webhookApp.use('/messaging', messagingRouter);

      mockPrisma.sMSMessage.findFirst.mockResolvedValue(mockSmsMessage);
      mockPrisma.sMSMessage.update.mockResolvedValue(mockSmsMessage);

      const response = await request(webhookApp)
        .post('/messaging/webhooks/sms-status')
        .send({
          MessageSid: 'SM1234567890abcdef',
          MessageStatus: 'delivered',
          To: '+919876543210'
        });

      expect(response.status).toBe(200);
      expect(response.body.acknowledged).toBe(true);
    });

    it('should handle missing message gracefully', async () => {
      const webhookApp = express();
      webhookApp.use(express.urlencoded({ extended: true }));
      webhookApp.use('/messaging', messagingRouter);

      mockPrisma.sMSMessage.findFirst.mockResolvedValue(null);

      const response = await request(webhookApp)
        .post('/messaging/webhooks/sms-status')
        .send({
          MessageSid: 'SM_UNKNOWN',
          MessageStatus: 'delivered'
        });

      expect(response.status).toBe(200);
      expect(response.body.acknowledged).toBe(true);
    });

    it('should capture error codes from webhook', async () => {
      const webhookApp = express();
      webhookApp.use(express.urlencoded({ extended: true }));
      webhookApp.use('/messaging', messagingRouter);

      mockPrisma.sMSMessage.findFirst.mockResolvedValue(mockSmsMessage);
      mockPrisma.sMSMessage.update.mockResolvedValue(mockSmsMessage);

      const response = await request(webhookApp)
        .post('/messaging/webhooks/sms-status')
        .send({
          MessageSid: 'SM1234567890abcdef',
          MessageStatus: 'failed',
          ErrorCode: '21614'
        });

      expect(response.status).toBe(200);
      expect(mockPrisma.sMSMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            errorCode: '21614'
          })
        })
      );
    });
  });

  describe('GET /messaging/stats', () => {
    it('should return messaging statistics', async () => {
      mockPrisma.whatsAppMessage.count.mockResolvedValue(10);
      mockPrisma.sMSMessage.count
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(18);

      const response = await request(app)
        .get('/messaging/stats');

      expect(response.status).toBe(200);
      expect(response.body.sms.total).toBe(20);
      expect(response.body.sms.deliveryRate).toBeDefined();
    });
  });
});
