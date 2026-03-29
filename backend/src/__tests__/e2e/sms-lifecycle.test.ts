/**
 * End-to-End Tests: Complete SMS Lifecycle
 * Tests complete workflows from sending SMS to delivery confirmation
 */

import express from 'express';
import request from 'supertest';
import messagingRouter from '../../../routes/messaging.js';
import { mockPrisma, resetAllMocks } from '../../mocks/index.js';
import { createMockLead, createMockUser, createMockSMSMessage } from '../../utils/test-helpers.js';

jest.mock('../../../prisma', () => ({
  prisma: mockPrisma
}));

jest.mock('../../../services/twilio');

describe('SMS Lifecycle E2E Tests', () => {
  let app: express.Application;
  const mockUser = createMockUser();
  let mockLead = createMockLead();
  let messageId = 'SM_TEST_123456';

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Mock auth middleware
    app.use((req, res, next) => {
      (req as any).user = mockUser;
      next();
    });

    app.use('/messaging', messagingRouter);
  });

  beforeEach(() => {
    resetAllMocks();
    mockLead = createMockLead();
  });

  describe('Complete SMS Workflow', () => {
    it('should complete full SMS lifecycle: send -> webhook -> status check', async () => {
      // Step 1: User sends SMS to lead
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);

      const mockCreatedMessage = createMockSMSMessage({
        messageId,
        status: 'SENT'
      });
      mockPrisma.sMSMessage.create.mockResolvedValue(mockCreatedMessage);
      mockPrisma.sMSMessage.findUnique.mockResolvedValue(mockCreatedMessage);

      const sendResponse = await request(app)
        .post('/messaging/sms/send')
        .send({
          leadId: mockLead.id,
          message: 'Hello, this is a test SMS'
        });

      expect(sendResponse.status).toBe(201);
      expect(sendResponse.body.status).toBe('SENT');
      expect(sendResponse.body.messageId).toBe(messageId);

      // Step 2: Twilio sends webhook with delivery status
      mockPrisma.sMSMessage.findFirst.mockResolvedValue(mockCreatedMessage);

      const updatedMessage = createMockSMSMessage({
        messageId,
        status: 'DELIVERED'
      });
      mockPrisma.sMSMessage.update.mockResolvedValue(updatedMessage);

      const webhookResponse = await request(app)
        .post('/messaging/webhooks/sms-status')
        .send({
          MessageSid: messageId,
          MessageStatus: 'delivered',
          To: mockLead.phone
        });

      expect(webhookResponse.status).toBe(200);
      expect(webhookResponse.body.acknowledged).toBe(true);

      // Step 3: User checks message status
      mockPrisma.sMSMessage.findFirst.mockResolvedValue(updatedMessage);

      const statusResponse = await request(app)
        .get(`/messaging/sms/status/${messageId}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.message.status).toBe('DELIVERED');
    });

    it('should handle failed delivery workflow', async () => {
      // Step 1: Send SMS
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);

      const sentMessage = createMockSMSMessage({
        messageId: 'SM_FAILED_123',
        status: 'SENT'
      });
      mockPrisma.sMSMessage.create.mockResolvedValue(sentMessage);
      mockPrisma.sMSMessage.findUnique.mockResolvedValue(sentMessage);

      const sendResponse = await request(app)
        .post('/messaging/sms/send')
        .send({
          leadId: mockLead.id,
          message: 'Test message'
        });

      expect(sendResponse.status).toBe(201);

      // Step 2: Receive failure webhook
      const failedMessage = createMockSMSMessage({
        messageId: 'SM_FAILED_123',
        status: 'FAILED',
        errorCode: '21614'
      });

      mockPrisma.sMSMessage.findFirst.mockResolvedValue(sentMessage);
      mockPrisma.sMSMessage.update.mockResolvedValue(failedMessage);

      const webhookResponse = await request(app)
        .post('/messaging/webhooks/sms-status')
        .send({
          MessageSid: 'SM_FAILED_123',
          MessageStatus: 'failed',
          ErrorCode: '21614',
          To: mockLead.phone
        });

      expect(webhookResponse.status).toBe(200);

      // Step 3: Verify failure status persisted
      mockPrisma.sMSMessage.findFirst.mockResolvedValue(failedMessage);

      const statusResponse = await request(app)
        .get('/messaging/sms/status/SM_FAILED_123');

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.message.status).toBe('FAILED');
      expect(statusResponse.body.message.errorCode).toBe('21614');
    });

    it('should track SMS thread for a lead', async () => {
      const messages = [
        createMockSMSMessage({ id: 1, messageId: 'SM_001', status: 'DELIVERED' }),
        createMockSMSMessage({ id: 2, messageId: 'SM_002', status: 'DELIVERED' }),
        createMockSMSMessage({ id: 3, messageId: 'SM_003', status: 'SENT' })
      ];

      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.sMSMessage.findMany.mockResolvedValue(messages);

      const response = await request(app)
        .get(`/messaging/sms/thread/${mockLead.id}`);

      expect(response.status).toBe(200);
      expect(response.body.messages).toHaveLength(3);
      expect(response.body.messages[0].messageId).toBe('SM_001');
      expect(response.body.lead.id).toBe(mockLead.id);
    });
  });

  describe('Bulk SMS Workflow', () => {
    it('should send bulk SMS and track all deliveries', async () => {
      const leads = [
        createMockLead({ id: 1 }),
        createMockLead({ id: 2 }),
        createMockLead({ id: 3 })
      ];
      const message = 'Bulk SMS message';

      mockPrisma.lead.findMany.mockResolvedValue(leads);

      const messages = leads.map((lead, idx) =>
        createMockSMSMessage({
          id: idx + 1,
          leadId: lead.id,
          messageId: `SM_BULK_${idx + 1}`,
          message,
          status: 'SENT'
        })
      );

      messages.forEach((msg, idx) => {
        if (idx < 3) {
          mockPrisma.sMSMessage.create.mockResolvedValueOnce(msg);
        }
      });

      const sendResponse = await request(app)
        .post('/messaging/bulk/send')
        .send({
          leadIds: [1, 2, 3],
          message,
          type: 'sms'
        });

      expect(sendResponse.status).toBe(201);
      expect(sendResponse.body.messages).toHaveLength(3);
      expect(sendResponse.body.totalMessages).toBe(3);

      // Simulate webhook for each message
      for (let i = 0; i < messages.length; i++) {
        const deliveredMsg = createMockSMSMessage({
          id: i + 1,
          messageId: messages[i].messageId,
          status: 'DELIVERED'
        });

        mockPrisma.sMSMessage.findFirst.mockResolvedValueOnce(messages[i]);
        mockPrisma.sMSMessage.update.mockResolvedValueOnce(deliveredMsg);

        const webhookRes = await request(app)
          .post('/messaging/webhooks/sms-status')
          .send({
            MessageSid: messages[i].messageId,
            MessageStatus: 'delivered'
          });

        expect(webhookRes.status).toBe(200);
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent SMS sends correctly', async () => {
      const leads = [
        createMockLead({ id: 1 }),
        createMockLead({ id: 2 })
      ];

      mockPrisma.lead.findUnique
        .mockResolvedValueOnce(leads[0])
        .mockResolvedValueOnce(leads[1]);

      const messages = [
        createMockSMSMessage({ id: 1, messageId: 'SM_CONC_1' }),
        createMockSMSMessage({ id: 2, messageId: 'SM_CONC_2' })
      ];

      mockPrisma.sMSMessage.create
        .mockResolvedValueOnce(messages[0])
        .mockResolvedValueOnce(messages[1]);

      mockPrisma.sMSMessage.findUnique
        .mockResolvedValueOnce(messages[0])
        .mockResolvedValueOnce(messages[1]);

      const requests = [
        request(app)
          .post('/messaging/sms/send')
          .send({
            leadId: leads[0].id,
            message: 'Message 1'
          }),
        request(app)
          .post('/messaging/sms/send')
          .send({
            leadId: leads[1].id,
            message: 'Message 2'
          })
      ];

      const responses = await Promise.all(requests);

      responses.forEach((resp, idx) => {
        expect(resp.status).toBe(201);
        expect(resp.body.messageId).toBe(messages[idx].messageId);
      });
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from transient Twilio errors', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);

      // First attempt: Twilio connection error
      mockPrisma.sMSMessage.create.mockRejectedValueOnce(
        new Error('Twilio connection timeout')
      );

      const firstAttempt = await request(app)
        .post('/messaging/sms/send')
        .send({
          leadId: mockLead.id,
          message: 'Retry test'
        });

      expect(firstAttempt.status).toBe(500);

      // Retry: Succeeds
      const successMessage = createMockSMSMessage({ messageId: 'SM_RETRY_001' });
      mockPrisma.sMSMessage.create.mockResolvedValueOnce(successMessage);
      mockPrisma.sMSMessage.findUnique.mockResolvedValueOnce(successMessage);

      const retryAttempt = await request(app)
        .post('/messaging/sms/send')
        .send({
          leadId: mockLead.id,
          message: 'Retry test'
        });

      expect(retryAttempt.status).toBe(201);
      expect(retryAttempt.body.messageId).toBe('SM_RETRY_001');
    });

    it('should handle invalid phone numbers gracefully', async () => {
      const invalidPhoneLead = createMockLead({ phone: 'invalid-phone' });
      mockPrisma.lead.findUnique.mockResolvedValue(invalidPhoneLead);

      const response = await request(app)
        .post('/messaging/sms/send')
        .send({
          leadId: invalidPhoneLead.id,
          message: 'Test'
        });

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent state through complete workflow', async () => {
      // Setup
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);

      const message = createMockSMSMessage({
        messageId: 'SM_CONSISTENT_001',
        leadId: mockLead.id,
        status: 'SENT'
      });

      mockPrisma.sMSMessage.create.mockResolvedValue(message);
      mockPrisma.sMSMessage.findUnique.mockResolvedValue(message);

      // Send SMS
      const sendRes = await request(app)
        .post('/messaging/sms/send')
        .send({
          leadId: mockLead.id,
          message: 'Consistency test'
        });

      expect(sendRes.status).toBe(201);
      const sentMessageId = sendRes.body.messageId;

      // Verify immediately after send
      mockPrisma.sMSMessage.findFirst.mockResolvedValue(message);

      const immediateStatus = await request(app)
        .get(`/messaging/sms/status/${sentMessageId}`);

      expect(immediateStatus.status).toBe(200);
      expect(immediateStatus.body.message.messageId).toBe(sentMessageId);

      // Simulate delivery update
      const deliveredMessage = { ...message, status: 'DELIVERED' };
      mockPrisma.sMSMessage.findFirst.mockResolvedValue(deliveredMessage);
      mockPrisma.sMSMessage.update.mockResolvedValue(deliveredMessage);

      await request(app)
        .post('/messaging/webhooks/sms-status')
        .send({
          MessageSid: sentMessageId,
          MessageStatus: 'delivered'
        });

      // Final verification
      mockPrisma.sMSMessage.findFirst.mockResolvedValue(deliveredMessage);

      const finalStatus = await request(app)
        .get(`/messaging/sms/status/${sentMessageId}`);

      expect(finalStatus.status).toBe(200);
      expect(finalStatus.body.message.status).toBe('DELIVERED');
    });
  });
});
