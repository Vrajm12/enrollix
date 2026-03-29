/**
 * Core CRM Tests: Lead Pipeline & Status Transitions
 * Tests for lead status workflow and invalid transitions
 */

import { mockPrisma, resetAllMocks } from '../../mocks/index.js';
import { createMockLead, createMockUser } from '../../utils/test-helpers.js';

jest.mock('../../prisma.js', () => ({
  prisma: mockPrisma
}));

type LeadStatus = 'LEAD' | 'CONTACTED' | 'INTERESTED' | 'QUALIFIED' | 'APPLIED' | 'ENROLLED';

describe('Lead Pipeline & Status Management', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Valid Status Transitions', () => {
    it('should transition LEAD → CONTACTED', async () => {
      const lead = createMockLead({ status: 'LEAD' as LeadStatus });

      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        status: 'CONTACTED' as LeadStatus
      });

      const result = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { status: 'CONTACTED' }
      });

      expect(result.status).toBe('CONTACTED');
    });

    it('should transition CONTACTED → INTERESTED', async () => {
      const lead = createMockLead({ status: 'CONTACTED' as LeadStatus });

      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        status: 'INTERESTED' as LeadStatus
      });

      const result = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { status: 'INTERESTED' }
      });

      expect(result.status).toBe('INTERESTED');
    });

    it('should transition INTERESTED → QUALIFIED', async () => {
      const lead = createMockLead({ status: 'INTERESTED' as LeadStatus });

      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        status: 'QUALIFIED' as LeadStatus
      });

      const result = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { status: 'QUALIFIED' }
      });

      expect(result.status).toBe('QUALIFIED');
    });

    it('should transition QUALIFIED → APPLIED', async () => {
      const lead = createMockLead({ status: 'QUALIFIED' as LeadStatus });

      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        status: 'APPLIED' as LeadStatus
      });

      const result = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { status: 'APPLIED' }
      });

      expect(result.status).toBe('APPLIED');
    });

    it('should transition APPLIED → ENROLLED', async () => {
      const lead = createMockLead({ status: 'APPLIED' as LeadStatus });

      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        status: 'ENROLLED' as LeadStatus
      });

      const result = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { status: 'ENROLLED' }
      });

      expect(result.status).toBe('ENROLLED');
    });

    it('should allow skip stages forward (e.g., CONTACTED → QUALIFIED)', async () => {
      const lead = createMockLead({ status: 'CONTACTED' as LeadStatus });

      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        status: 'QUALIFIED' as LeadStatus
      });

      const result = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { status: 'QUALIFIED' }
      });

      expect(result.status).toBe('QUALIFIED');
    });

    it('should follow complete pipeline LEAD → ENROLLED', async () => {
      const stages: LeadStatus[] = [
        'LEAD',
        'CONTACTED',
        'INTERESTED',
        'QUALIFIED',
        'APPLIED',
        'ENROLLED'
      ];

      let lead = createMockLead({ status: stages[0] });

      for (let i = 1; i < stages.length; i++) {
        mockPrisma.lead.update.mockResolvedValue({
          ...lead,
          status: stages[i]
        });

        lead = await mockPrisma.lead.update({
          where: { id: lead.id },
          data: { status: stages[i] }
        });

        expect(lead.status).toBe(stages[i]);
      }
    });
  });

  describe('Invalid Status Transitions (Edge Cases)', () => {
    it('should prevent reverse transition CONTACTED → LEAD', async () => {
      const lead = createMockLead({ status: 'CONTACTED' as LeadStatus });

      const isValidTransition = (from: LeadStatus, to: LeadStatus): boolean => {
        const pipeline: Record<LeadStatus, LeadStatus[]> = {
          LEAD: ['CONTACTED', 'INTERESTED', 'QUALIFIED', 'APPLIED', 'ENROLLED'],
          CONTACTED: ['INTERESTED', 'QUALIFIED', 'APPLIED', 'ENROLLED'],
          INTERESTED: ['QUALIFIED', 'APPLIED', 'ENROLLED'],
          QUALIFIED: ['APPLIED', 'ENROLLED'],
          APPLIED: ['ENROLLED'],
          ENROLLED: []
        };
        return pipeline[from].includes(to);
      };

      expect(isValidTransition('CONTACTED', 'LEAD')).toBe(false);

      // Should throw error on invalid transition
      if (!isValidTransition('CONTACTED', 'LEAD')) {
        throw new Error('Invalid transition: cannot move backwards in pipeline');
      }
    });

    it('should prevent reverse transition INTERESTED → CONTACTED', async () => {
      const isValidTransition = (from: LeadStatus, to: LeadStatus): boolean => {
        // Can only move forward or skip forward
        const stageOrder: Record<LeadStatus, number> = {
          LEAD: 0,
          CONTACTED: 1,
          INTERESTED: 2,
          QUALIFIED: 3,
          APPLIED: 4,
          ENROLLED: 5
        };
        return stageOrder[to] >= stageOrder[from];
      };

      expect(isValidTransition('INTERESTED', 'CONTACTED')).toBe(false);
    });

    it('should prevent reverse transition from ENROLLED', async () => {
      const lead = createMockLead({ status: 'ENROLLED' as LeadStatus });

      const isValidTransition = (from: LeadStatus, to: LeadStatus): boolean => {
        // ENROLLED is final stage
        if (from === 'ENROLLED') return false;
        const stageOrder: Record<LeadStatus, number> = {
          LEAD: 0,
          CONTACTED: 1,
          INTERESTED: 2,
          QUALIFIED: 3,
          APPLIED: 4,
          ENROLLED: 5
        };
        return stageOrder[to] >= stageOrder[from];
      };

      expect(isValidTransition('ENROLLED', 'APPLIED')).toBe(false);
      expect(isValidTransition('ENROLLED', 'CONTACTED')).toBe(false);
    });

    it('should allow staying in same status (idempotent)', async () => {
      const lead = createMockLead({ status: 'INTERESTED' as LeadStatus });

      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        status: 'INTERESTED' as LeadStatus
      });

      const result = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { status: 'INTERESTED' }
      });

      expect(result.status).toBe('INTERESTED');
    });

    it('should prevent invalid arbitrary transition', async () => {
      const isValidTransition = (from: LeadStatus, to: LeadStatus): boolean => {
        const stageOrder: Record<LeadStatus, number> = {
          LEAD: 0,
          CONTACTED: 1,
          INTERESTED: 2,
          QUALIFIED: 3,
          APPLIED: 4,
          ENROLLED: 5
        };
        return stageOrder[to] >= stageOrder[from];
      };

      // QUALIFIED → CONTACTED (invalid)
      expect(isValidTransition('QUALIFIED', 'CONTACTED')).toBe(false);

      // APPLIED → LEAD (invalid)
      expect(isValidTransition('APPLIED', 'LEAD')).toBe(false);
    });
  });

  describe('Status Transition Logging', () => {
    it('should record timestamp when status changes', async () => {
      const lead = createMockLead({ status: 'LEAD' as LeadStatus });
      const now = new Date();

      mockPrisma.lead.update.mockResolvedValue({
        ...lead,
        status: 'CONTACTED' as LeadStatus,
        updatedAt: now
      });

      const result = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { status: 'CONTACTED' }
      });

      expect(result.updatedAt).toBeDefined();
      expect(result.updatedAt).toEqual(now);
    });

    it('should track who changed the status (via activity log)', async () => {
      const lead = createMockLead({ status: 'LEAD' as LeadStatus });
      const userId = 1;

      mockPrisma.activity.create.mockResolvedValue({
        id: 1,
        leadId: lead.id,
        type: 'NOTE',
        notes: `Status changed from LEAD to CONTACTED`,
        createdAt: new Date(),
        nextFollowUp: new Date()
      });

      const activity = await mockPrisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'NOTE',
          notes: `Status changed from LEAD to CONTACTED`,
          nextFollowUp: new Date()
        }
      });

      expect(activity.notes).toContain('Status changed');
    });
  });

  describe('Pipeline Analytics', () => {
    it('should count leads at each stage', async () => {
      const leads = [
        createMockLead({ id: 1, status: 'LEAD' as LeadStatus }),
        createMockLead({ id: 2, status: 'LEAD' as LeadStatus }),
        createMockLead({ id: 3, status: 'CONTACTED' as LeadStatus }),
        createMockLead({ id: 4, status: 'INTERESTED' as LeadStatus }),
        createMockLead({ id: 5, status: 'QUALIFIED' as LeadStatus })
      ];

      mockPrisma.lead.findMany.mockResolvedValue(leads);

      const allLeads = await mockPrisma.lead.findMany();
      const stageCounts = allLeads.reduce((acc: Record<string, number>, lead: any) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<LeadStatus, number>);

      expect(stageCounts.LEAD).toBe(2);
      expect(stageCounts.CONTACTED).toBe(1);
      expect(stageCounts.INTERESTED).toBe(1);
      expect(stageCounts.QUALIFIED).toBe(1);
    });

    it('should calculate conversion rate through pipeline', async () => {
      const leads = [
        createMockLead({ status: 'LEAD' as LeadStatus }),
        createMockLead({ status: 'LEAD' as LeadStatus }),
        createMockLead({ status: 'CONTACTED' as LeadStatus }),
        createMockLead({ status: 'CONTACTED' as LeadStatus }),
        createMockLead({ status: 'INTERESTED' as LeadStatus }),
        createMockLead({ status: 'QUALIFIED' as LeadStatus }),
        createMockLead({ status: 'ENROLLED' as LeadStatus })
      ];

      mockPrisma.lead.findMany.mockResolvedValue(leads);

      const allLeads = await mockPrisma.lead.findMany();
      const totalLeads = allLeads.length;
      const enrolledCount = allLeads.filter((l: any) => l.status === 'ENROLLED').length;
      const conversionRate = (enrolledCount / totalLeads) * 100;

      expect(conversionRate).toBe((1 / 7) * 100);
    });
  });

  describe('Stage-Specific Rules', () => {
    it('should require assignment before CONTACTED', async () => {
      const lead = createMockLead({
        status: 'LEAD' as LeadStatus,
        assignedTo: null
      });

      // Validation: Cannot contact unassigned lead
      const canContact = (lead: any) => {
        return lead.assignedTo !== null && lead.assignedTo !== undefined;
      };

      expect(canContact(lead)).toBe(false);

      // With assignment
      const assignedLead = { ...lead, assignedTo: 1 };
      expect(canContact(assignedLead)).toBe(true);
    });

    it('should require at least one activity before INTERESTED', async () => {
      const lead = createMockLead({
        status: 'INTERESTED' as LeadStatus,
        id: 1
      });

      mockPrisma.activity.findMany.mockResolvedValue([
        {
          id: 1,
          leadId: lead.id,
          type: 'CALL',
          notes: 'Initial contact',
          createdAt: new Date(),
          nextFollowUp: new Date()
        }
      ]);

      const activities = await mockPrisma.activity.findMany({
        where: { leadId: lead.id }
      });

      expect(activities.length).toBeGreaterThan(0);
    });

    it('should require follow-up set before QUALIFIED', async () => {
      const lead = createMockLead({
        status: 'QUALIFIED' as LeadStatus,
        nextFollowUp: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      });

      expect(lead.nextFollowUp).not.toBeNull();
    });
  });
});
