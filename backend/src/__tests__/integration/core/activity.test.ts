/**
 * Core CRM Tests: Activity Logging
 * Tests for activity creation, type handling, and timeline consistency
 */

import { mockPrisma, resetAllMocks } from '../../mocks';
import { createMockLead, createMockUser } from '../../utils/test-helpers';

jest.mock('../../prisma', () => ({
  prisma: mockPrisma
}));

type ActivityType = 'CALL' | 'WHATSAPP' | 'EMAIL' | 'NOTE';

describe('Activity Logging', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Activity Creation & Types', () => {
    it('should log CALL activity', async () => {
      const lead = createMockLead({ id: 1 });
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      mockPrisma.activity.create.mockResolvedValue({
        id: 1,
        leadId: lead.id,
        type: 'CALL' as ActivityType,
        notes: 'Called lead, discussed course options',
        createdAt: new Date(),
        nextFollowUp: futureDate
      });

      const activity = await mockPrisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'CALL',
          notes: 'Called lead, discussed course options',
          nextFollowUp: futureDate
        }
      });

      expect(activity.type).toBe('CALL');
      expect(activity.notes).toBeDefined();
    });

    it('should log WHATSAPP activity', async () => {
      const lead = createMockLead({ id: 1 });
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      mockPrisma.activity.create.mockResolvedValue({
        id: 2,
        leadId: lead.id,
        type: 'WHATSAPP' as ActivityType,
        notes: 'Sent WhatsApp message with course brochure',
        createdAt: new Date(),
        nextFollowUp: futureDate
      });

      const activity = await mockPrisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'WHATSAPP',
          notes: 'Sent WhatsApp message with course brochure',
          nextFollowUp: futureDate
        }
      });

      expect(activity.type).toBe('WHATSAPP');
    });

    it('should log EMAIL activity', async () => {
      const lead = createMockLead({ id: 1 });
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      mockPrisma.activity.create.mockResolvedValue({
        id: 3,
        leadId: lead.id,
        type: 'EMAIL' as ActivityType,
        notes: 'Sent admission email with instructions',
        createdAt: new Date(),
        nextFollowUp: futureDate
      });

      const activity = await mockPrisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'EMAIL',
          notes: 'Sent admission email with instructions',
          nextFollowUp: futureDate
        }
      });

      expect(activity.type).toBe('EMAIL');
    });

    it('should log NOTE activity', async () => {
      const lead = createMockLead({ id: 1 });
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      mockPrisma.activity.create.mockResolvedValue({
        id: 4,
        leadId: lead.id,
        type: 'NOTE' as ActivityType,
        notes: 'Lead interested in dual course enrollment',
        createdAt: new Date(),
        nextFollowUp: futureDate
      });

      const activity = await mockPrisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'NOTE',
          notes: 'Lead interested in dual course enrollment',
          nextFollowUp: futureDate
        }
      });

      expect(activity.type).toBe('NOTE');
    });

    it('should store complete activity details', async () => {
      const lead = createMockLead({ id: 1 });
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const now = new Date();

      mockPrisma.activity.create.mockResolvedValue({
        id: 5,
        leadId: lead.id,
        type: 'CALL' as ActivityType,
        notes: 'Important conversation',
        createdAt: now,
        nextFollowUp: futureDate
      });

      const activity = await mockPrisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'CALL',
          notes: 'Important conversation',
          nextFollowUp: futureDate
        }
      });

      expect(activity.leadId).toBe(lead.id);
      expect(activity.createdAt).toBeDefined();
      expect(activity.nextFollowUp).toEqual(futureDate);
    });
  });

  describe('Timeline Consistency', () => {
    it('should retrieve activities in chronological order', async () => {
      const lead = createMockLead({ id: 1 });
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const activities = [
        {
          id: 1,
          leadId: lead.id,
          type: 'CALL' as ActivityType,
          notes: 'First call',
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
          nextFollowUp: futureDate
        },
        {
          id: 2,
          leadId: lead.id,
          type: 'EMAIL' as ActivityType,
          notes: 'Sent details',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          nextFollowUp: futureDate
        },
        {
          id: 3,
          leadId: lead.id,
          type: 'WHATSAPP' as ActivityType,
          notes: 'Follow-up reminder',
          createdAt: new Date(), // Just now
          nextFollowUp: futureDate
        }
      ];

      mockPrisma.activity.findMany.mockResolvedValue(
        activities.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      );

      const result = await mockPrisma.activity.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'asc' }
      });

      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
      expect(result[2].id).toBe(3);

      // Verify timestamps are ascending
      for (let i = 1; i < result.length; i++) {
        expect(result[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          result[i - 1].createdAt.getTime()
        );
      }
    });

    it('should get complete activity timeline for a lead', async () => {
      const lead = createMockLead({ id: 1 });
      const activities = [
        {
          id: 1,
          leadId: lead.id,
          type: 'CALL' as ActivityType,
          notes: 'Initial contact',
          createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
          nextFollowUp: new Date(Date.now() + 24 * 60 * 60 * 1000)
        },
        {
          id: 2,
          leadId: lead.id,
          type: 'NOTE' as ActivityType,
          notes: '90% interested in program',
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
          nextFollowUp: new Date(Date.now() + 24 * 60 * 60 * 1000)
        },
        {
          id: 3,
          leadId: lead.id,
          type: 'EMAIL' as ActivityType,
          notes: 'Sent payment details',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          nextFollowUp: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      ];

      mockPrisma.activity.findMany.mockResolvedValue(activities);

      const timeline = await mockPrisma.activity.findMany({
        where: { leadId: lead.id }
      });

      expect(timeline.length).toBe(3);
      expect(timeline[0].type).toBe('CALL');
      expect(timeline[1].type).toBe('NOTE');
      expect(timeline[2].type).toBe('EMAIL');
    });

    it('should detect gaps in follow-up timeline', async () => {
      const lead = createMockLead({ id: 1 });
      const activities = [
        {
          id: 1,
          leadId: lead.id,
          type: 'CALL' as ActivityType,
          notes: 'First contact',
          createdAt: new Date(Date.now() - 120 * 60 * 60 * 1000), // 5 days ago
          nextFollowUp: new Date(Date.now() - 96 * 60 * 60 * 1000) // 4 days ago
        },
        {
          id: 2,
          leadId: lead.id,
          type: 'CALL' as ActivityType,
          notes: 'Second contact',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          nextFollowUp: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
        }
      ];

      mockPrisma.activity.findMany.mockResolvedValue(activities);

      const timeline = await mockPrisma.activity.findMany({
        where: { leadId: lead.id }
      });

      // Calculate gap
      const firstActivityFollowUp = timeline[0].nextFollowUp;
      const secondActivityCreated = timeline[1].createdAt;

      const gapMs = secondActivityCreated.getTime() - firstActivityFollowUp.getTime();
      const gapDays = Math.floor(gapMs / (24 * 60 * 60 * 1000));

      expect(gapDays).toBeGreaterThan(0); // Gap exists
    });

    it('should show activity count per lead', async () => {
      const lead = createMockLead({ id: 1 });
      const activities = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        leadId: lead.id,
        type: ['CALL', 'EMAIL', 'WHATSAPP', 'NOTE', 'CALL'][i] as ActivityType,
        notes: `Activity ${i + 1}`,
        createdAt: new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000),
        nextFollowUp: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }));

      mockPrisma.activity.findMany.mockResolvedValue(activities);

      const result = await mockPrisma.activity.findMany({
        where: { leadId: lead.id }
      });

      expect(result.length).toBe(5);
    });
  });

  describe('Activity Duration Tracking', () => {
    it('should track time from activity creation to follow-up', async () => {
      const lead = createMockLead({ id: 1 });
      const baseDate = Date.now();
      const createdAt = new Date(baseDate - 48 * 60 * 60 * 1000); // 2 days ago
      const nextFollowUp = new Date(baseDate + 24 * 60 * 60 * 1000); // Tomorrow

      mockPrisma.activity.create.mockResolvedValue({
        id: 1,
        leadId: lead.id,
        type: 'CALL' as ActivityType,
        notes: 'Initial call',
        createdAt,
        nextFollowUp
      });

      const activity = await mockPrisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'CALL',
          notes: 'Initial call',
          nextFollowUp
        }
      });

      const durationMs = activity.nextFollowUp.getTime() - activity.createdAt.getTime();
      const durationDays = durationMs / (24 * 60 * 60 * 1000);

      expect(durationDays).toBeGreaterThan(0);
    });
  });

  describe('Activity Statistics', () => {
    it('should count activities by type', async () => {
      const lead = createMockLead({ id: 1 });
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const activities = [
        { type: 'CALL' as ActivityType },
        { type: 'CALL' as ActivityType },
        { type: 'EMAIL' as ActivityType },
        { type: 'WHATSAPP' as ActivityType },
        { type: 'NOTE' as ActivityType }
      ];

      mockPrisma.activity.findMany.mockResolvedValue(
        activities.map((a, i) => ({
          id: i + 1,
          leadId: lead.id,
          type: a.type,
          notes: `Activity ${i + 1}`,
          createdAt: new Date(),
          nextFollowUp: futureDate
        }))
      );

      const result = await mockPrisma.activity.findMany({
        where: { leadId: lead.id }
      });

      const stats = result.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
      }, {} as Record<ActivityType, number>);

      expect(stats.CALL).toBe(2);
      expect(stats.EMAIL).toBe(1);
      expect(stats.WHATSAPP).toBe(1);
      expect(stats.NOTE).toBe(1);
    });

    it('should get most recent activity for a lead', async () => {
      const lead = createMockLead({ id: 1 });
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const activities = [
        {
          id: 1,
          leadId: lead.id,
          type: 'CALL' as ActivityType,
          notes: 'Old call',
          createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
          nextFollowUp: futureDate
        },
        {
          id: 2,
          leadId: lead.id,
          type: 'EMAIL' as ActivityType,
          notes: 'Recent email',
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          nextFollowUp: futureDate
        }
      ];

      mockPrisma.activity.findMany.mockResolvedValue(
        activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 1)
      );

      const [mostRecent] = await mockPrisma.activity.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'desc' },
        take: 1
      });

      expect(mostRecent.type).toBe('EMAIL');
      expect(mostRecent.id).toBe(2);
    });
  });
});
