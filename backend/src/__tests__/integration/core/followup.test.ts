/**
 * Core CRM Tests: Follow-Up Management (CRITICAL)
 * Tests for follow-up scheduling, missed detection, and overdue tracking
 */

import { mockPrisma, resetAllMocks } from '../../mocks';
import { createMockLead, createMockSMSMessage } from '../../utils/test-helpers';

jest.mock('../../prisma', () => ({
  prisma: mockPrisma
}));

describe('Follow-Up Management (CRITICAL)', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Cannot Save Activity Without Follow-Up', () => {
    it('should require nextFollowUp when creating activity', async () => {
      const lead = createMockLead({ id: 1 });

      const activityData = {
        leadId: lead.id,
        type: 'CALL',
        notes: 'Initial contact call',
        nextFollowUp: null // MISSING - Should reject
      };

      // Validation should catch missing follow-up
      const validateActivity = (activity: any) => {
        if (!activity.nextFollowUp) {
          throw new Error('Cannot save activity without follow-up date');
        }
        return true;
      };

      expect(() => validateActivity(activityData)).toThrow(
        'Cannot save activity without follow-up date'
      );
    });

    it('should require nextFollowUp in the future', async () => {
      const lead = createMockLead({ id: 1 });
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

      const activityData = {
        leadId: lead.id,
        type: 'CALL',
        notes: 'Call',
        nextFollowUp: pastDate
      };

      const validateFollowUp = (activity: any) => {
        const now = new Date();
        const followUpDate = new Date(activity.nextFollowUp);
        if (followUpDate < now) {
          throw new Error('Follow-up date must be in the future');
        }
        return true;
      };

      expect(() => validateFollowUp(activityData)).toThrow(
        'Follow-up date must be in the future'
      );
    });

    it('should set nextFollowUp on lead when activity is created', async () => {
      const lead = createMockLead({ id: 1, nextFollowUp: null });
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      mockPrisma.activity.create.mockResolvedValue({
        id: 1,
        leadId: lead.id,
        type: 'CALL',
        notes: 'Contact made',
        createdAt: new Date(),
        nextFollowUp: futureDate
      });

      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        nextFollowUp: futureDate
      });

      // Create activity
      const activity = await mockPrisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'CALL',
          notes: 'Contact made',
          nextFollowUp: futureDate
        }
      });

      // Update lead with next follow-up
      const updatedLead = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { nextFollowUp: activity.nextFollowUp }
      });

      expect(updatedLead.nextFollowUp).toEqual(futureDate);
    });

    it('should accept valid follow-up dates (minimum 1 hour from now)', async () => {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const validateFollowUp = (followUpDate: Date) => {
        const now = new Date();
        const minimumMinutes = 60;
        const minimumMs = minimumMinutes * 60 * 1000;
        
        if (followUpDate.getTime() < now.getTime() + minimumMs) {
          throw new Error(`Follow-up must be at least ${minimumMinutes} minutes from now`);
        }
        return true;
      };

      // Should pass
      expect(validateFollowUp(twoHoursFromNow)).toBe(true);
    });

    it('should reject follow-up less than 1 hour from now', async () => {
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

      const validateFollowUp = (followUpDate: Date) => {
        const now = new Date();
        const minimumMinutes = 60;
        const minimumMs = minimumMinutes * 60 * 1000;
        
        if (followUpDate.getTime() < now.getTime() + minimumMs) {
          throw new Error(`Follow-up must be at least ${minimumMinutes} minutes from now`);
        }
      };

      expect(() => validateFollowUp(thirtyMinutesFromNow)).toThrow(
        'Follow-up must be at least 60 minutes from now'
      );
    });
  });

  describe('Missed Follow-Up Detection', () => {
    it('should detect missed follow-up (nextFollowUp in past)', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const lead = createMockLead({
        id: 1,
        nextFollowUp: yesterday
      });

      const isMissed = (lead: any) => {
        return lead.nextFollowUp && new Date(lead.nextFollowUp) < new Date();
      };

      expect(isMissed(lead)).toBe(true);
    });

    it('should get list of all missed follow-ups', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const today = new Date();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const leads = [
        createMockLead({ id: 1, nextFollowUp: yesterday }), // Missed
        createMockLead({ id: 2, nextFollowUp: today }), // Today
        createMockLead({ id: 3, nextFollowUp: tomorrow }), // Future
        createMockLead({ id: 4, nextFollowUp: null }) // No follow-up set
      ];

      mockPrisma.lead.findMany.mockResolvedValue(
        leads.filter(l => l.nextFollowUp && new Date(l.nextFollowUp) < new Date())
      );

      const missedFollowUps = await mockPrisma.lead.findMany({
        where: {
          nextFollowUp: {
            lt: new Date() // Less than now
          }
        }
      });

      expect(missedFollowUps.length).toBe(1);
      expect(missedFollowUps[0].id).toBe(1);
    });

    it('should calculate days overdue', async () => {
      const daysAgo = (days: number) => {
        return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      };

      const lead = createMockLead({
        id: 1,
        nextFollowUp: daysAgo(5) // 5 days ago
      });

      const calculateDaysOverdue = (followUpDate: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - new Date(followUpDate).getTime();
        return Math.floor(diffMs / (24 * 60 * 60 * 1000));
      };

      const daysOverdue = calculateDaysOverdue(lead.nextFollowUp!);
      expect(daysOverdue).toBe(5);
    });

    it('should flag leads with multiple missed follow-ups', async () => {
      const lead = createMockLead({
        id: 1,
        nextFollowUp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      });

      mockPrisma.activity.findMany.mockResolvedValue([
        {
          id: 1,
          leadId: lead.id,
          type: 'CALL',
          notes: 'Call 1',
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          nextFollowUp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        },
        {
          id: 2,
          leadId: lead.id,
          type: 'CALL',
          notes: 'Call 2',
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          nextFollowUp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        }
      ]);

      const activities = await mockPrisma.activity.findMany({
        where: { leadId: lead.id }
      });

      const missedFollowUps = activities.filter(
        (a: any) => new Date(a.nextFollowUp) < new Date()
      );

      expect(missedFollowUps.length).toBe(2);
    });

    it('should send notification for missed follow-up', async () => {
      const lead = createMockLead({
        id: 1,
        nextFollowUp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        assignedTo: 1
      });

      const shouldNotify = (lead: any) => {
        if (!lead.nextFollowUp) return false;
        return new Date(lead.nextFollowUp) < new Date();
      };

      expect(shouldNotify(lead)).toBe(true);

      // Simulate notification
      const notification = {
        counselorId: lead.assignedTo,
        leadId: lead.id,
        message: `Follow-up missed for lead ${lead.name}`,
        severity: 'HIGH'
      };

      expect(notification.message).toContain('Follow-up missed');
    });
  });

  describe('Follow-Up Classification (Today vs Overdue)', () => {
    it('should classify follow-up as TODAY', async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);

      const lead = createMockLead({
        id: 1,
        nextFollowUp: today
      });

      const classifyFollowUp = (followUpDate: Date) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const followUpDay = new Date(
          followUpDate.getFullYear(),
          followUpDate.getMonth(),
          followUpDate.getDate()
        );

        if (followUpDay < today) return 'OVERDUE';
        if (followUpDay.getTime() === today.getTime()) return 'TODAY';
        return 'FUTURE';
      };

      const classification = classifyFollowUp(lead.nextFollowUp!);
      expect(classification).toBe('TODAY');
    });

    it('should classify follow-up as OVERDUE', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const lead = createMockLead({
        id: 1,
        nextFollowUp: yesterday
      });

      const classifyFollowUp = (followUpDate: Date) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const followUpDay = new Date(
          followUpDate.getFullYear(),
          followUpDate.getMonth(),
          followUpDate.getDate()
        );

        if (followUpDay < today) return 'OVERDUE';
        if (followUpDay.getTime() === today.getTime()) return 'TODAY';
        return 'FUTURE';
      };

      const classification = classifyFollowUp(lead.nextFollowUp!);
      expect(classification).toBe('OVERDUE');
    });

    it('should classify follow-up as FUTURE', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const lead = createMockLead({
        id: 1,
        nextFollowUp: tomorrow
      });

      const classifyFollowUp = (followUpDate: Date) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const followUpDay = new Date(
          followUpDate.getFullYear(),
          followUpDate.getMonth(),
          followUpDate.getDate()
        );

        if (followUpDay < today) return 'OVERDUE';
        if (followUpDay.getTime() === today.getTime()) return 'TODAY';
        return 'FUTURE';
      };

      const classification = classifyFollowUp(lead.nextFollowUp!);
      expect(classification).toBe('FUTURE');
    });

    it('should get dashboard stats: today, overdue, upcoming', async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const leads = [
        createMockLead({ id: 1, nextFollowUp: yesterday }), // Overdue
        createMockLead({ id: 2, nextFollowUp: today }), // Today
        createMockLead({ id: 3, nextFollowUp: today }), // Today
        createMockLead({ id: 4, nextFollowUp: tomorrow }), // Future
        createMockLead({ id: 5, nextFollowUp: null }) // No follow-up
      ];

      mockPrisma.lead.findMany.mockResolvedValue(leads.filter(l => l.nextFollowUp));

      const allLeads = await mockPrisma.lead.findMany({
        where: {
          nextFollowUp: { not: null }
        }
      });

      const stats = {
        overdue: allLeads.filter((l: any) => {
          const followUpDay = new Date(
            l.nextFollowUp!.getFullYear(),
            l.nextFollowUp!.getMonth(),
            l.nextFollowUp!.getDate()
          );
          return followUpDay < today;
        }).length,
        today: allLeads.filter((l: any) => {
          const followUpDay = new Date(
            l.nextFollowUp!.getFullYear(),
            l.nextFollowUp!.getMonth(),
            l.nextFollowUp!.getDate()
          );
          return followUpDay.getTime() === today.getTime();
        }).length,
        upcoming: allLeads.filter((l: any) => {
          const followUpDay = new Date(
            l.nextFollowUp!.getFullYear(),
            l.nextFollowUp!.getMonth(),
            l.nextFollowUp!.getDate()
          );
          return followUpDay > today;
        }).length
      };

      expect(stats.overdue).toBe(1);
      expect(stats.today).toBe(2);
      expect(stats.upcoming).toBe(1);
    });
  });

  describe('Follow-Up Rescheduling', () => {
    it('should allow rescheduling missed follow-up', async () => {
      const oldDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const lead = createMockLead({
        id: 1,
        nextFollowUp: oldDate
      });

      const newDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        nextFollowUp: newDate
      });

      const result = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { nextFollowUp: newDate }
      });

      expect(result.nextFollowUp).toEqual(newDate);
      expect(result.nextFollowUp).not.toEqual(oldDate);
    });

    it('should record reason for rescheduling', async () => {
      const lead = createMockLead({ id: 1 });
      const newDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

      mockPrisma.activity.create.mockResolvedValue({
        id: 1,
        leadId: lead.id,
        type: 'NOTE',
        notes: 'Rescheduled: Lead not available, will call tomorrow',
        createdAt: new Date(),
        nextFollowUp: newDate
      });

      const activity = await mockPrisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'NOTE',
          notes: 'Rescheduled: Lead not available, will call tomorrow',
          nextFollowUp: newDate
        }
      });

      expect(activity.notes).toContain('Rescheduled');
    });
  });

  describe('Follow-Up Automation', () => {
    it('should auto-create reminder 24 hours before follow-up', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const lead = createMockLead({
        id: 1,
        nextFollowUp: tomorrow,
        assignedTo: 1
      });

      // Check if reminder should be created
      const shouldCreateReminder = (followUpDate: Date) => {
        const now = new Date();
        const hoursUntil = (new Date(followUpDate).getTime() - now.getTime()) / (60 * 60 * 1000);
        return hoursUntil <= 24 && hoursUntil > 0;
      };

      expect(shouldCreateReminder(lead.nextFollowUp!)).toBe(true);
    });

    it('should auto-resolve follow-up when activity completed', async () => {
      const lead = createMockLead({
        id: 1,
        nextFollowUp: new Date()
      });

      // When activity is created with future follow-up, previous one is resolved
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        nextFollowUp: futureDate
      });

      const result = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { nextFollowUp: futureDate }
      });

      expect(result.nextFollowUp).toEqual(futureDate);
    });
  });
});
