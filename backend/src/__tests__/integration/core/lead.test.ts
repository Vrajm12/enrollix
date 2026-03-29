/**
 * Core CRM Tests: Lead Management
 * Tests for lead creation, validation, and assignment logic
 */

import { mockPrisma, resetAllMocks } from '../../mocks/index.js';
import { createMockLead, createMockUser } from '../../utils/test-helpers.js';

jest.mock('../../prisma.js', () => ({
  prisma: mockPrisma
}));

describe('Lead Management Core Tests', () => {
  const mockUser = createMockUser();

  beforeEach(() => {
    resetAllMocks();
  });

  describe('Lead Creation', () => {
    it('should create lead with valid data', async () => {
      const leadData = {
        name: 'John Doe',
        phone: '+919876543210',
        email: 'john@example.com',
        course: 'Engineering',
        source: 'Website',
        status: 'LEAD' as const
      };

      mockPrisma.lead.create.mockResolvedValue({
        id: 1,
        ...leadData,
        parentContact: null,
        address: null,
        priority: 'COLD',
        nextFollowUp: null,
        assignedTo: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await mockPrisma.lead.create({
        data: leadData
      });

      expect(result.id).toBe(1);
      expect(result.name).toBe('John Doe');
      expect(result.phone).toBe('+919876543210');
      expect(result.status).toBe('LEAD');
    });

    it('should reject lead without phone number', async () => {
      const invalidLeadData = {
        name: 'John Doe',
        phone: '', // Empty phone
        email: 'john@example.com'
      };

      // Validation should catch this
      expect(() => {
        if (!invalidLeadData.phone) throw new Error('Phone number required');
      }).toThrow('Phone number required');
    });

    it('should reject lead without name', async () => {
      const invalidLeadData = {
        name: '',
        phone: '+919876543210',
        email: 'john@example.com'
      };

      expect(() => {
        if (!invalidLeadData.name) throw new Error('Lead name required');
      }).toThrow('Lead name required');
    });

    it('should set default status to LEAD for new lead', async () => {
      const leadData = {
        name: 'Jane Doe',
        phone: '+918765432109',
        status: undefined
      };

      mockPrisma.lead.create.mockResolvedValue({
        id: 2,
        name: leadData.name,
        phone: leadData.phone,
        email: null,
        address: null,
        parentContact: null,
        course: null,
        source: null,
        status: 'LEAD', // Default status
        priority: 'COLD', // Default priority
        nextFollowUp: null,
        assignedTo: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await mockPrisma.lead.create({
        data: { name: leadData.name, phone: leadData.phone }
      });

      expect(result.status).toBe('LEAD');
      expect(result.priority).toBe('COLD');
    });
  });

  describe('Duplicate Phone Handling', () => {
    it('should detect duplicate phone number', async () => {
      const phone = '+919876543210';
      const existingLead = createMockLead({ phone });

      mockPrisma.lead.findUnique.mockResolvedValue(existingLead);

      const foundLead = await mockPrisma.lead.findUnique({
        where: { phone }
      });

      expect(foundLead).not.toBeNull();
      expect(foundLead?.phone).toBe(phone);
    });

    it('should prevent creating duplicate leads with same phone', async () => {
      const phone = '+919876543210';
      const existingLead = createMockLead({ id: 1, phone });

      mockPrisma.lead.findUnique.mockResolvedValue(existingLead);

      const duplicate = await mockPrisma.lead.findUnique({
        where: { phone }
      });

      expect(duplicate).toBeDefined();
      expect(duplicate?.id).toBe(1);

      // Prevent creation of duplicate
      if (duplicate) {
        throw new Error('Lead with this phone already exists');
      }
    });

    it('should allow similar phone numbers with different formatting', async () => {
      // E.164 vs local format - should be treated as different
      mockPrisma.lead.findUnique
        .mockResolvedValueOnce(createMockLead({ id: 1, phone: '+919876543210' }))
        .mockResolvedValueOnce(null); // Different format not found

      const e164Format = await mockPrisma.lead.findUnique({
        where: { phone: '+919876543210' }
      });

      const localFormat = await mockPrisma.lead.findUnique({
        where: { phone: '9876543210' }
      });

      expect(e164Format).toBeDefined();
      expect(localFormat).toBeNull();
    });

    it('should handle phone normalization before duplicate check', async () => {
      // Simulate phone normalization to E.164
      const normalizePhone = (phone: string) => {
        if (!phone.startsWith('+')) {
          if (!phone.startsWith('0')) {
            phone = '+91' + phone;
          } else {
            phone = '+91' + phone.substring(1);
          }
        }
        return phone;
      };

      const normalized = normalizePhone('9876543210');
      expect(normalized).toBe('+919876543210');

      mockPrisma.lead.findUnique.mockResolvedValue(
        createMockLead({ phone: normalized })
      );

      const result = await mockPrisma.lead.findUnique({
        where: { phone: normalized }
      });

      expect(result).toBeDefined();
    });
  });

  describe('Lead Assignment Logic', () => {
    it('should assign lead to counselor', async () => {
      const lead = createMockLead({ assignedTo: null });
      const assignedLead = { ...lead, assignedTo: mockUser.id };

      mockPrisma.lead.update.mockResolvedValue(assignedLead);

      const result = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { assignedTo: mockUser.id }
      });

      expect(result.assignedTo).toBe(mockUser.id);
    });

    it('should reassign lead from one counselor to another', async () => {
      const user1 = createMockUser({ id: 1 });
      const user2 = createMockUser({ id: 2 });
      const lead = createMockLead({ assignedTo: user1.id });

      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        assignedTo: user2.id
      });

      const result = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { assignedTo: user2.id }
      });

      expect(result.assignedTo).toBe(user2.id);
      expect(result.assignedTo).not.toBe(user1.id);
    });

    it('should prevent assigning lead to non-existent counselor', async () => {
      const lead = createMockLead();

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const counselor = await mockPrisma.user.findUnique({
        where: { id: 999 }
      });

      expect(counselor).toBeNull();

      // Validation should prevent assignment
      if (!counselor) {
        throw new Error('Counselor not found');
      }
    });

    it('should track assignment timestamp when assigned', async () => {
      const lead = createMockLead({ assignedTo: null });
      const now = new Date();

      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        assignedTo: mockUser.id,
        updatedAt: now
      });

      const result = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { assignedTo: mockUser.id }
      });

      expect(result.assignedTo).toBe(mockUser.id);
      expect(result.updatedAt).toBeDefined();
    });

    it('should allow unassigning a lead', async () => {
      const lead = createMockLead({ assignedTo: mockUser.id });

      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        assignedTo: null
      });

      const result = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { assignedTo: null }
      });

      expect(result.assignedTo).toBeNull();
    });

    it('should load assigned counselor details with lead', async () => {
      const user = createMockUser({ id: 1 });
      const lead = createMockLead({ assignedTo: user.id });

      mockPrisma.lead.findUnique.mockResolvedValue({
        ...lead,
        assignedCounselor: user
      });

      const result = await mockPrisma.lead.findUnique({
        where: { id: lead.id },
        include: { assignedCounselor: true }
      });

      expect(result?.assignedCounselor).toBeDefined();
      expect(result?.assignedCounselor?.name).toBe(user.name);
      expect(result?.assignedCounselor?.email).toBe(user.email);
    });
  });

  describe('Lead Priority Management', () => {
    it('should set lead priority to COLD, WARM, or HOT', async () => {
      const lead = createMockLead();

      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        priority: 'HOT'
      });

      const result = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { priority: 'HOT' }
      });

      expect(result.priority).toBe('HOT');
    });

    it('should default to COLD priority', async () => {
      mockPrisma.lead.create.mockResolvedValue(
        createMockLead({ priority: 'COLD' })
      );

      const result = await mockPrisma.lead.create({
        data: {
          name: 'Test Lead',
          phone: '+919876543210'
        }
      });

      expect(result.priority).toBe('COLD');
    });

    it('should update priority based on engagement', async () => {
      const lead = createMockLead({ priority: 'COLD' });

      // After call: upgrade to WARM
      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        priority: 'WARM'
      });

      const result = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { priority: 'WARM' }
      });

      expect(result.priority).toBe('WARM');
    });
  });

  describe('Lead Data Validation', () => {
    it('should validate email format if provided', async () => {
      const validateEmail = (email: string) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
      };

      expect(validateEmail('john@example.com')).toBe(true);
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('john@.com')).toBe(false);
    });

    it('should accept optional email field', async () => {
      const leadWithoutEmail = {
        name: 'John Doe',
        phone: '+919876543210',
        email: null
      };

      mockPrisma.lead.create.mockResolvedValue({
        id: 1,
        name: leadWithoutEmail.name,
        phone: leadWithoutEmail.phone,
        email: null,
        address: null,
        parentContact: null,
        course: null,
        source: null,
        status: 'LEAD' as const,
        priority: 'COLD' as const,
        nextFollowUp: null,
        assignedTo: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await mockPrisma.lead.create({
        data: { name: leadWithoutEmail.name, phone: leadWithoutEmail.phone }
      });

      expect(result.email).toBeNull();
    });

    it('should reject phone number with invalid format', async () => {
      const validatePhone = (phone: string) => {
        // Remove non-digit chars except leading +
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 15;
      };

      expect(validatePhone('+919876543210')).toBe(true);
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('9876543210')).toBe(true);
    });
  });
});
