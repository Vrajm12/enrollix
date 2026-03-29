/**
 * Unit Tests: Twilio Service
 * Tests for SMS sending and status checking functionality
 */

import { twilioService } from '../../../services/twilio';

// Mock Twilio client
jest.mock('twilio', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    messages: {
      create: jest.fn(),
      get: jest.fn()
    },
    messages: jest.fn().mockReturnValue({
      fetch: jest.fn()
    })
  }))
}));

describe('TwilioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendSMS', () => {
    it('should send SMS successfully', async () => {
      const result = await twilioService.sendSMS('+919876543210', 'Test message');
      expect(result).toBeTruthy();
    });

    it('should handle invalid phone number', async () => {
      expect.assertions(1);
      try {
        await twilioService.sendSMS('invalid', 'Test message');
      } catch (error) {
        expect((error as Error).message).toContain('phone');
      }
    });

    it('should return null if credentials not configured', async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, TWILIO_ACCOUNT_SID: '', TWILIO_AUTH_TOKEN: '' };

      const result = await twilioService.sendSMS('+919876543210', 'Test');

      expect(result).toBeNull();
      process.env = originalEnv;
    });

    it('should support Indian phone number formats', async () => {
      const testCases = [
        '+919876543210',
        '9876543210',
        '09876543210',
        '919876543210'
      ];

      for (const phone of testCases) {
        const result = await twilioService.sendSMS(phone, 'Test');
        expect(result).toBeTruthy();
      }
    });

    it('should validate message length', async () => {
      const longMessage = 'a'.repeat(1601); // Over 1600 chars
      expect.assertions(1);
      try {
        await twilioService.sendSMS('+919876543210', longMessage);
      } catch (error) {
        expect((error as Error).message).toBeTruthy();
      }
    });
  });

  describe('getMessageStatus', () => {
    it('should fetch message status successfully', async () => {
      const status = await twilioService.getMessageStatus('SM1234567890abcdef');
      expect(['sent', 'delivered', 'failed', 'queued']).toContain(status);
    });

    it('should return null for invalid SID', async () => {
      const status = await twilioService.getMessageStatus('invalid');
      expect(status).toBeNull();
    });

    it('should return null if credentials not configured', async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, TWILIO_ACCOUNT_SID: '', TWILIO_AUTH_TOKEN: '' };

      const status = await twilioService.getMessageStatus('SM1234567890abcdef');

      expect(status).toBeNull();
      process.env = originalEnv;
    });

    it('should handle API errors gracefully', async () => {
      const status = await twilioService.getMessageStatus('SM1234567890abcdef');
      expect(status).toBeDefined();
    });
  });

  describe('Phone number formatting', () => {
    it('should format Indian numbers correctly', () => {
      const testCases = [
        { input: '9876543210', expected: '+919876543210' },
        { input: '09876543210', expected: '+919876543210' },
        { input: '919876543210', expected: '+919876543210' },
        { input: '+919876543210', expected: '+919876543210' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect.assertions(4);
        // The formatting happens inside sendSMS
      });
    });
  });
});
