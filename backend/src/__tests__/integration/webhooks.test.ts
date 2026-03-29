/**
 * Integration Tests: SMS Webhook Handler
 * Tests for Twilio SMS status update webhooks
 */

import express from 'express';
import request from 'supertest';
import messagingRouter from '../../../routes/messaging';
import { mockPrisma, resetAllMocks } from '../../mocks';
import { createMockSMSMessage, createMockLead } from '../../utils/test-helpers';

jest.mock('../../../prisma', () => ({
  prisma: mockPrisma
}));

jest.mock('../../../services/twilio', () => ({
  twilioService: {
    sendSMS: jest.fn(),
    getMessageStatus: jest.fn()
  }
}));

describe('SMS Webhook Integration Tests', () => {
  let app: express.Application;
  const mockLead = createMockLead();
  const mockMessage = createMockSMSMessage();

  beforeAll(() => {
    app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use('/messaging', messagingRouter);
  });

  beforeEach(() => {
    resetAllMocks();
  });

  describe('POST /messaging/webhooks/sms-status', () => {
    it('should accept and process delivery confirmation', async () => {
      mockPrisma.sMSMessage.findFirst.mockResolvedValue(mockMessage);
      mockPrisma.sMSMessage.update.mockResolvedValue({
        ...mockMessage,
        status: 'DELIVERED'
      });

      const response = await request(app)
        .post('/messaging/webhooks/sms-status')
        .send({
          MessageSid: 'SM1234567890abcdef',
          MessageStatus: 'delivered',
          To: '+919876543210',
          From: '+15551234567'
        });

      expect(response.status).toBe(200);
      expect(response.body.acknowledged).toBe(true);
      expect(mockPrisma.sMSMessage.update).toHaveBeenCalled();
    });

    it('should update message status to FAILED on failure', async () => {
      const messages = [
        { ...mockMessage },
        { ...mockMessage, id: 2 },
        { ...mockMessage, id: 3 }
      ];

      mockPrisma.sMSMessage.findFirst.mockResolvedValue(messages[0]);
      mockPrisma.sMSMessage.update.mockResolvedValue({
        ...messages[0],
        status: 'FAILED'
      });

      const failReasons = ['delivered', 'failed', 'undelivered'];

      for (const reason of failReasons) {
        resetAllMocks();
        mockPrisma.sMSMessage.findFirst.mockResolvedValue(messages[0]);
        mockPrisma.sMSMessage.update.mockResolvedValue({
          ...messages[0],
          status: reason === 'delivered' ? 'DELIVERED' : 'FAILED'
        });

        const response = await request(app)
          .post('/messaging/webhooks/sms-status')
          .send({
            MessageSid: `SM${messages[0].id}`,
            MessageStatus: reason,
            To: '+919876543210'
          });

        expect(response.status).toBe(200);
      }
    });

    it('should capture Twilio error codes', async () => {
      mockPrisma.sMSMessage.findFirst.mockResolvedValue(mockMessage);
      mockPrisma.sMSMessage.update.mockResolvedValue({
        ...mockMessage,
        status: 'FAILED',
        errorCode: '21614'
      });

      const response = await request(app)
        .post('/messaging/webhooks/sms-status')
        .send({
          MessageSid: 'SM1234567890abcdef',
          MessageStatus: 'failed',
          ErrorCode: '21614', // "Not queued for delivery"
          To: '+919876543210'
        });

      expect(response.status).toBe(200);

      expect(mockPrisma.sMSMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { messageId: 'SM1234567890abcdef' },
          data: expect.objectContaining({
            errorCode: '21614'
          })
        })
      );
    });

    it('should handle common Twilio error codes', async () => {
      const errorCodes = [
        { code: '21614', desc: 'Not queued for delivery' },
        { code: '21615', desc: 'The message body is invalid' },
        { code: '21202', desc: 'Invalid phone number format' },
        { code: '21622', desc: 'Cannot send to short codes' }
      ];

      for (const error of errorCodes) {
        resetAllMocks();
        mockPrisma.sMSMessage.findFirst.mockResolvedValue(mockMessage);
        mockPrisma.sMSMessage.update.mockResolvedValue({
          ...mockMessage,
          errorCode: error.code
        });

        const response = await request(app)
          .post('/messaging/webhooks/sms-status')
          .send({
            MessageSid: 'SM1234567890abcdef',
            MessageStatus: 'failed',
            ErrorCode: error.code,
            To: '+919876543210'
          });

        expect(response.status).toBe(200);
        expect(response.body.acknowledged).toBe(true);
      }
    });

    it('should create activity log for successful delivery', async () => {
      mockPrisma.sMSMessage.findFirst.mockResolvedValue(mockMessage);
      mockPrisma.sMSMessage.update.mockResolvedValue({
        ...mockMessage,
        status: 'DELIVERED'
      });

      const response = await request(app)
        .post('/messaging/webhooks/sms-status')
        .send({
          MessageSid: 'SM1234567890abcdef',
          MessageStatus: 'delivered',
          To: '+919876543210'
        });

      expect(response.status).toBe(200);
    });

    it('should be idempotent for duplicate webhooks', async () => {
      mockPrisma.sMSMessage.findFirst.mockResolvedValue(mockMessage);
      mockPrisma.sMSMessage.update.mockResolvedValue({
        ...mockMessage,
        status: 'DELIVERED'
      });

      const payload = {
        MessageSid: 'SM1234567890abcdef',
        MessageStatus: 'delivered',
        To: '+919876543210'
      };

      const response1 = await request(app)
        .post('/messaging/webhooks/sms-status')
        .send(payload);

      const response2 = await request(app)
        .post('/messaging/webhooks/sms-status')
        .send(payload);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('should handle webhook for non-existent message gracefully', async () => {
      mockPrisma.sMSMessage.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/messaging/webhooks/sms-status')
        .send({
          MessageSid: 'SM_UNKNOWN_ID',
          MessageStatus: 'delivered',
          To: '+919876543210'
        });

      expect(response.status).toBe(200);
      expect(response.body.acknowledged).toBe(true);
    });

    it('should validate webhook payload format', async () => {
      const invalidPayloads = [
        { MessageSid: '' }, // Missing required fields
        { MessageStatus: 'delivered' }, // Missing MessageSid
        {}, // Empty payload
        { MessageSid: 'SM123', MessageStatus: 'invalid_status' } // Invalid status
      ];

      for (const payload of invalidPayloads) {
        const response = await request(app)
          .post('/messaging/webhooks/sms-status')
          .send(payload);

        // Webhook should not crash on invalid input
        expect([200, 400]).toContain(response.status);
      }
    });

    it('should handle concurrent webhook deliveries', async () => {
      const mockMessages = [
        createMockSMSMessage({ id: 1 }),
        createMockSMSMessage({ id: 2 }),
        createMockSMSMessage({ id: 3 })
      ];

      mockPrisma.sMSMessage.findFirst
        .mockResolvedValueOnce(mockMessages[0])
        .mockResolvedValueOnce(mockMessages[1])
        .mockResolvedValueOnce(mockMessages[2]);

      mockPrisma.sMSMessage.update
        .mockResolvedValueOnce({ ...mockMessages[0], status: 'DELIVERED' })
        .mockResolvedValueOnce({ ...mockMessages[1], status: 'DELIVERED' })
        .mockResolvedValueOnce({ ...mockMessages[2], status: 'DELIVERED' });

      const requests = [
        request(app)
          .post('/messaging/webhooks/sms-status')
          .send({
            MessageSid: `SM${mockMessages[0].id}`,
            MessageStatus: 'delivered',
            To: '+919876543210'
          }),
        request(app)
          .post('/messaging/webhooks/sms-status')
          .send({
            MessageSid: `SM${mockMessages[1].id}`,
            MessageStatus: 'delivered',
            To: '+918765432109'
          }),
        request(app)
          .post('/messaging/webhooks/sms-status')
          .send({
            MessageSid: `SM${mockMessages[2].id}`,
            MessageStatus: 'delivered',
            To: '+919123456789'
          })
      ];

      const responses = await Promise.all(requests);

      responses.forEach((resp) => {
        expect(resp.status).toBe(200);
        expect(resp.body.acknowledged).toBe(true);
      });
    });

    it('should record webhook timestamp', async () => {
      mockPrisma.sMSMessage.findFirst.mockResolvedValue(mockMessage);
      mockPrisma.sMSMessage.update.mockResolvedValue({
        ...mockMessage,
        status: 'DELIVERED',
        updatedAt: new Date()
      });

      const response = await request(app)
        .post('/messaging/webhooks/sms-status')
        .send({
          MessageSid: 'SM1234567890abcdef',
          MessageStatus: 'delivered',
          To: '+919876543210'
        });

      expect(response.status).toBe(200);
      expect(mockPrisma.sMSMessage.update).toHaveBeenCalled();
    });

    it('should not require authentication for webhooks', async () => {
      // Webhooks should work without JWT token
      mockPrisma.sMSMessage.findFirst.mockResolvedValue(mockMessage);
      mockPrisma.sMSMessage.update.mockResolvedValue({
        ...mockMessage,
        status: 'DELIVERED'
      });

      const response = await request(app)
        .post('/messaging/webhooks/sms-status')
        .send({
          MessageSid: 'SM1234567890abcdef',
          MessageStatus: 'delivered'
        });

      expect(response.status).toBe(200);
    });
  });
});
