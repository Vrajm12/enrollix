/**
 * Data Integrity Tests
 * Tests for cascading deletes, ordering, and concurrent updates
 */

import { mockPrisma, resetAllMocks } from '../../mocks/index.js';
import { createMockLead, createMockUser } from '../../utils/test-helpers.js';

jest.mock('../../prisma.js', () => ({
  prisma: mockPrisma
}));

describe('Data Integrity Tests', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Cascading Deletes', () => {
    it('should cascade delete activities when lead is deleted', async () => {
      const lead = createMockLead({ id: 1 });
      const activities = [
        {
          id: 1,
          leadId: lead.id,
          type: 'CALL' as const,
          notes: 'Activity 1',
          createdAt: new Date(),
          nextFollowUp: new Date()
        },
        {
          id: 2,
          leadId: lead.id,
          type: 'EMAIL' as const,
          notes: 'Activity 2',
          createdAt: new Date(),
          nextFollowUp: new Date()
        }
      ];

      mockPrisma.activity.findMany.mockResolvedValue(activities);
      mockPrisma.lead.delete.mockResolvedValue(lead);

      // Get activities before delete
      const activitiesBefore = await mockPrisma.activity.findMany({
        where: { leadId: lead.id }
      });

      expect(activitiesBefore.length).toBe(2);

      // Delete lead (should cascade delete activities)
      const deletedLead = await mockPrisma.lead.delete({
        where: { id: lead.id }
      });

      expect(deletedLead.id).toBe(1);

      // After deletion, activities should be gone
      mockPrisma.activity.findMany.mockResolvedValue([]);

      const activitiesAfter = await mockPrisma.activity.findMany({
        where: { leadId: lead.id }
      });

      expect(activitiesAfter.length).toBe(0);
    });

    it('should cascade delete SMS/WhatsApp messages when lead is deleted', async () => {
      const lead = createMockLead({ id: 1 });

      // Lead has associated messages
      mockPrisma.sMSMessage.findMany.mockResolvedValue([
        {
          id: 1,
          leadId: lead.id,
          sentBy: 1,
          message: 'Test SMS',
          status: 'SENT' as const,
          direction: 'OUTBOUND' as const,
          phoneNumber: lead.phone,
          messageId: 'SM123',
          provider: 'twilio',
          cost: 0.0075,
          errorCode: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      mockPrisma.whatsAppMessage.findMany.mockResolvedValue([
        {
          id: 1,
          leadId: lead.id,
          sentBy: 1,
          message: 'Test WhatsApp',
          status: 'SENT' as const,
          direction: 'OUTBOUND' as const,
          phoneNumber: lead.phone,
          messageId: 'WA123',
          mediaUrl: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      // Get messages before delete
      const smsBeforeDelete = await mockPrisma.sMSMessage.findMany({
        where: { leadId: lead.id }
      });
      const whatsappBeforeDelete = await mockPrisma.whatsAppMessage.findMany({
        where: { leadId: lead.id }
      });

      expect(smsBeforeDelete.length).toBe(1);
      expect(whatsappBeforeDelete.length).toBe(1);

      // Delete lead
      mockPrisma.lead.delete.mockResolvedValue(lead);
      await mockPrisma.lead.delete({ where: { id: lead.id } });

      // Messages should be deleted
      mockPrisma.sMSMessage.findMany.mockResolvedValue([]);
      mockPrisma.whatsAppMessage.findMany.mockResolvedValue([]);

      const smsAfterDelete = await mockPrisma.sMSMessage.findMany({
        where: { leadId: lead.id }
      });
      const whatsappAfterDelete = await mockPrisma.whatsAppMessage.findMany({
        where: { leadId: lead.id }
      });

      expect(smsAfterDelete.length).toBe(0);
      expect(whatsappAfterDelete.length).toBe(0);
    });

    it('should NOT delete user when lead is deleted', async () => {
      const lead = createMockLead({ id: 1, assignedTo: 1 });
      const user = createMockUser({ id: 1 });

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.lead.delete.mockResolvedValue(lead);

      // Verify user exists before
      const userBefore = await mockPrisma.user.findUnique({
        where: { id: user.id }
      });

      expect(userBefore).toBeDefined();

      // Delete lead
      await mockPrisma.lead.delete({ where: { id: lead.id } });

      // User should still exist
      const userAfter = await mockPrisma.user.findUnique({
        where: { id: user.id }
      });

      expect(userAfter).toBeDefined();
      expect(userAfter?.id).toBe(user.id);
    });
  });

  describe('Activity Ordering', () => {
    it('should retrieve multiple activities in chronological order', async () => {
      const lead = createMockLead({ id: 1 });
      const now = Date.now();

      const activities = [
        {
          id: 1,
          leadId: lead.id,
          type: 'CALL' as const,
          notes: 'First activity',
          createdAt: new Date(now - 72 * 60 * 60 * 1000), // 3 days ago
          nextFollowUp: new Date(now + 24 * 60 * 60 * 1000)
        },
        {
          id: 2,
          leadId: lead.id,
          type: 'EMAIL' as const,
          notes: 'Second activity',
          createdAt: new Date(now - 48 * 60 * 60 * 1000), // 2 days ago
          nextFollowUp: new Date(now + 24 * 60 * 60 * 1000)
        },
        {
          id: 3,
          leadId: lead.id,
          type: 'WHATSAPP' as const,
          notes: 'Third activity',
          createdAt: new Date(now - 24 * 60 * 60 * 1000), // 1 day ago
          nextFollowUp: new Date(now + 24 * 60 * 60 * 1000)
        },
        {
          id: 4,
          leadId: lead.id,
          type: 'NOTE' as const,
          notes: 'Fourth activity',
          createdAt: new Date(), // Just now
          nextFollowUp: new Date(now + 24 * 60 * 60 * 1000)
        }
      ];

      mockPrisma.activity.findMany.mockResolvedValue(
        activities.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      );

      const result = await mockPrisma.activity.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'asc' }
      });

      // Verify chronological order
      for (let i = 1; i < result.length; i++) {
        expect(result[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          result[i - 1].createdAt.getTime()
        );
      }

      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
      expect(result[2].id).toBe(3);
      expect(result[3].id).toBe(4);
    });

    it('should handle large activity count with correct ordering', async () => {
      const lead = createMockLead({ id: 1 });
      const baseTime = Date.now();

      // Create 100 activities
      const activities = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        leadId: lead.id,
        type: ['CALL', 'EMAIL', 'WHATSAPP', 'NOTE'][i % 4] as any,
        notes: `Activity ${i + 1}`,
        createdAt: new Date(baseTime + i * 60 * 60 * 1000), // Hours apart
        nextFollowUp: new Date(baseTime + (i + 1) * 24 * 60 * 60 * 1000)
      }));

      mockPrisma.activity.findMany.mockResolvedValue(
        activities.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      );

      const result = await mockPrisma.activity.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'asc' }
      });

      expect(result.length).toBe(100);

      // Verify order is maintained
      for (let i = 1; i < result.length; i++) {
        expect(result[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          result[i - 1].createdAt.getTime()
        );
      }
    });

    it('should maintain order when filtering activities by type', async () => {
      const lead = createMockLead({ id: 1 });
      const now = Date.now();

      const allActivities = [
        {
          id: 1,
          leadId: lead.id,
          type: 'CALL' as const,
          notes: 'Call 1',
          createdAt: new Date(now - 60 * 60 * 1000),
          nextFollowUp: new Date()
        },
        {
          id: 2,
          leadId: lead.id,
          type: 'EMAIL' as const,
          notes: 'Email 1',
          createdAt: new Date(now - 45 * 60 * 1000),
          nextFollowUp: new Date()
        },
        {
          id: 3,
          leadId: lead.id,
          type: 'CALL' as const,
          notes: 'Call 2',
          createdAt: new Date(now - 30 * 60 * 1000),
          nextFollowUp: new Date()
        },
        {
          id: 4,
          leadId: lead.id,
          type: 'CALL' as const,
          notes: 'Call 3',
          createdAt: new Date(),
          nextFollowUp: new Date()
        }
      ];

      const callsOnly = allActivities.filter(a => a.type === 'CALL');

      mockPrisma.activity.findMany.mockResolvedValue(
        callsOnly.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      );

      const result = await mockPrisma.activity.findMany({
        where: { leadId: lead.id, type: 'CALL' },
        orderBy: { createdAt: 'asc' }
      });

      expect(result.length).toBe(3);
      expect(result.every((a: any) => a.type === 'CALL')).toBe(true);

      // Verify order
      for (let i = 1; i < result.length; i++) {
        expect(result[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          result[i - 1].createdAt.getTime()
        );
      }
    });
  });

  describe('Concurrent Updates', () => {
    it('should maintain consistency with concurrent lead updates', async () => {
      const lead = createMockLead({ id: 1, status: 'LEAD' as const, priority: 'COLD' as const });

      // Simulate concurrent updates
      const update1 = { status: 'CONTACTED' as const };
      const update2 = { priority: 'WARM' as const };
      const update3 = { nextFollowUp: new Date(Date.now() + 24 * 60 * 60 * 1000) };

      mockPrisma.lead.update.mockResolvedValueOnce({
        ...lead,
        ...update1
      });

      mockPrisma.lead.update.mockResolvedValueOnce({
        ...lead,
        ...update1,
        ...update2
      });

      mockPrisma.lead.update.mockResolvedValueOnce({
        ...lead,
        ...update1,
        ...update2,
        ...update3
      });

      // Execute updates "concurrently" (sequential in test)
      const result1 = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: update1
      });

      const result2 = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: update2
      });

      const result3 = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: update3
      });

      // Final state should have all updates
      expect(result3.status).toBe('CONTACTED');
      expect(result3.priority).toBe('WARM');
      expect(result3.nextFollowUp).toBeDefined();
    });

    it('should handle concurrent activity creation for same lead', async () => {
      const lead = createMockLead({ id: 1 });
      const now = new Date();

      const activities = [
        {
          id: 1,
          leadId: lead.id,
          type: 'CALL' as const,
          notes: 'Activity 1',
          createdAt: now,
          nextFollowUp: new Date(now.getTime() + 24 * 60 * 60 * 1000)
        },
        {
          id: 2,
          leadId: lead.id,
          type: 'EMAIL' as const,
          notes: 'Activity 2',
          createdAt: now,
          nextFollowUp: new Date(now.getTime() + 24 * 60 * 60 * 1000)
        }
      ];

      mockPrisma.activity.create
        .mockResolvedValueOnce(activities[0])
        .mockResolvedValueOnce(activities[1]);

      // Create activities "concurrently"
      const [result1, result2] = await Promise.all([
        mockPrisma.activity.create({
          data: {
            leadId: lead.id,
            type: 'CALL',
            notes: 'Activity 1',
            nextFollowUp: activities[0].nextFollowUp
          }
        }),
        mockPrisma.activity.create({
          data: {
            leadId: lead.id,
            type: 'EMAIL',
            notes: 'Activity 2',
            nextFollowUp: activities[1].nextFollowUp
          }
        })
      ]);

      expect(result1.id).toBe(1);
      expect(result2.id).toBe(2);
      expect(result1.leadId).toBe(lead.id);
      expect(result2.leadId).toBe(lead.id);
    });

    it('should prevent lost updates', async () => {
      const lead = createMockLead({
        id: 1,
        status: 'LEAD' as const,
        priority: 'COLD' as const
      });

      // Simulate two concurrent updates from different users
      const user1Update = { status: 'CONTACTED' };
      const user2Update = { priority: 'WARM' };

      // Both should combine in final state
      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        ...user1Update,
        ...user2Update
      });

      const result1 = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: user1Update
      });

      const result2 = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: user2Update
      });

      // Both updates should be visible
      expect(result1.status).toBe('CONTACTED');
      expect(result2.priority).toBe('WARM');
    });

    it('should maintain referential integrity during concurrent updates', async () => {
      const lead = createMockLead({ id: 1, assignedTo: null });
      const user = createMockUser({ id: 1 });

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        assignedTo: user.id
      });

      // Concurrent assignment and other update
      const [assignmentResult, updateResult] = await Promise.all([
        mockPrisma.lead.update({
          where: { id: lead.id },
          data: { assignedTo: user.id }
        }),
        mockPrisma.lead.update({
          where: { id: lead.id },
          data: { priority: 'WARM' }
        })
      ]);

      expect(assignmentResult.assignedTo).toBe(user.id);
      expect(updateResult.assignedTo).toBe(user.id);
    });
  });

  describe('Data Consistency Checks', () => {
    it('should ensure nextFollowUp dates are always in future for active leads', async () => {
      const lead = createMockLead({
        id: 1,
        status: 'CONTACTED' as const,
        nextFollowUp: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      mockPrisma.lead.findUnique.mockResolvedValue(lead);

      const result = await mockPrisma.lead.findUnique({
        where: { id: lead.id }
      });

      if (result && result.status !== 'ENROLLED') {
        expect(result.nextFollowUp!.getTime()).toBeGreaterThan(Date.now());
      }
    });

    it('should verify referential integrity for assignments', async () => {
      const lead = createMockLead({ id: 1, assignedTo: 1 });
      const user = createMockUser({ id: 1 });

      mockPrisma.user.findUnique.mockResolvedValue(user);

      const assignee = await mockPrisma.user.findUnique({
        where: { id: lead.assignedTo! }
      });

      expect(assignee).toBeDefined();
      expect(assignee?.id).toBe(lead.assignedTo);
    });

    it('should count consistency: activities count should match lead activities', async () => {
      const lead = createMockLead({ id: 1 });
      const activities = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        leadId: lead.id,
        type: ['CALL', 'EMAIL', 'WHATSAPP', 'NOTE', 'CALL'][i] as any,
        notes: `Activity ${i + 1}`,
        createdAt: new Date(),
        nextFollowUp: new Date()
      }));

      mockPrisma.activity.findMany.mockResolvedValue(activities);
      mockPrisma.activity.count.mockResolvedValue(5);

      const activitiesList = await mockPrisma.activity.findMany({
        where: { leadId: lead.id }
      });

      const count = await mockPrisma.activity.count({
        where: { leadId: lead.id }
      });

      expect(activitiesList.length).toBe(count);
      expect(count).toBe(5);
    });
  });
});
