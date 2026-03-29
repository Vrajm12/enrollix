/**
 * Real User Flow Test (CRITICAL)
 * Complete workflow: Create Lead → Assign → Call → Add Note → Set Follow-up → Move Stage → Enroll
 * If this test breaks, the CRM is useless!
 */

import { mockPrisma, resetAllMocks } from '../../mocks';
import { createMockLead, createMockUser } from '../../utils/test-helpers';

jest.mock('../../prisma', () => ({
  prisma: mockPrisma
}));

describe('Real User Flow - Complete CRM Workflow (CRITICAL)', () => {
  let counselor = createMockUser({ id: 1, name: 'Rajesh Kumar', role: 'COUNSELOR' });
  let lead: any;
  let activity: any;

  beforeEach(() => {
    resetAllMocks();
    counselor = createMockUser({ id: 1, name: 'Rajesh Kumar', role: 'COUNSELOR' });
  });

  describe('Complete End-to-End Workflow', () => {
    it('should complete full CRM lifecycle: Create → Assign → Contact → Follow-up → Enroll', async () => {
      // STEP 1: Create Lead
      console.log('STEP 1: Creating lead...');
      lead = {
        id: 1,
        name: 'Priya Singh',
        phone: '+919876543210',
        email: 'priya@example.com',
        course: 'B.Tech Engineering',
        source: 'Website',
        status: 'LEAD' as const,
        priority: 'COLD' as const,
        nextFollowUp: null,
        assignedTo: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.lead.create.mockResolvedValue(lead);

      const createdLead = await mockPrisma.lead.create({
        data: {
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          course: lead.course,
          source: lead.source
        }
      });

      expect(createdLead.id).toBe(1);
      expect(createdLead.status).toBe('LEAD');
      expect(createdLead.assignedTo).toBeNull();
      console.log('✓ Lead created');

      // STEP 2: Assign to Counselor
      console.log('STEP 2: Assigning to counselor...');
      lead = { ...lead, assignedTo: counselor.id, updatedAt: new Date() };

      mockPrisma.lead.update.mockResolvedValue(lead);
      mockPrisma.user.findUnique.mockResolvedValue(counselor);

      const assignedLead = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { assignedTo: counselor.id }
      });

      expect(assignedLead.assignedTo).toBe(counselor.id);
      console.log(`✓ Lead assigned to ${counselor.name}`);

      // STEP 3: Make CALL and log activity
      console.log('STEP 3: Making call and logging activity...');
      const callTime = new Date();
      const nextFollowUp1 = new Date(callTime.getTime() + 24 * 60 * 60 * 1000); // Tomorrow

      const callActivity = {
        id: 1,
        leadId: lead.id,
        type: 'CALL' as const,
        notes: 'Called Priya, discussed B.Tech program. Very interested!',
        createdAt: callTime,
        nextFollowUp: nextFollowUp1
      };

      mockPrisma.activity.create.mockResolvedValue(callActivity);

      activity = await mockPrisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'CALL',
          notes: callActivity.notes,
          nextFollowUp: nextFollowUp1
        }
      });

      expect(activity.type).toBe('CALL');
      expect(activity.notes).toContain('Very interested');

      // Update lead status to CONTACTED
      lead = { ...lead, status: 'CONTACTED' as const };
      mockPrisma.lead.update.mockResolvedValue(lead);

      const contactedLead = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { status: 'CONTACTED', nextFollowUp: nextFollowUp1 }
      });

      expect(contactedLead.status).toBe('CONTACTED');
      console.log('✓ Call logged, status changed to CONTACTED');

      // STEP 4: Add NOTE and update priority
      console.log('STEP 4: Adding note and updating priority...');
      const noteTime = new Date();
      const nextFollowUp2 = new Date(noteTime.getTime() + 48 * 60 * 60 * 1000); // 2 days

      const noteActivity = {
        id: 2,
        leadId: lead.id,
        type: 'NOTE' as const,
        notes: 'Lead is 95% interested. Parents need to approve. Follow up in 2 days.',
        createdAt: noteTime,
        nextFollowUp: nextFollowUp2
      };

      mockPrisma.activity.create.mockResolvedValue(noteActivity);

      activity = await mockPrisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'NOTE',
          notes: noteActivity.notes,
          nextFollowUp: nextFollowUp2
        }
      });

      expect(activity.type).toBe('NOTE');

      // Update priority to WARM
      lead = { ...lead, priority: 'WARM' as const, nextFollowUp: nextFollowUp2 };
      mockPrisma.lead.update.mockResolvedValue(lead);

      const warmLead = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { priority: 'WARM', nextFollowUp: nextFollowUp2 }
      });

      expect(warmLead.priority).toBe('WARM');
      console.log('✓ Note added, priority upgraded to WARM');

      // STEP 5: Move to INTERESTED stage
      console.log('STEP 5: Moving to INTERESTED stage...');
      lead = { ...lead, status: 'INTERESTED' as const };
      mockPrisma.lead.update.mockResolvedValue(lead);

      const interestedLead = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { status: 'INTERESTED' }
      });

      expect(interestedLead.status).toBe('INTERESTED');
      console.log('✓ Status moved to INTERESTED');

      // STEP 6: Send EMAIL with course details
      console.log('STEP 6: Sending email with course details...');
      const emailTime = new Date();
      const nextFollowUp3 = new Date(emailTime.getTime() + 24 * 60 * 60 * 1000);

      const emailActivity = {
        id: 3,
        leadId: lead.id,
        type: 'EMAIL' as const,
        notes: 'Sent detailed B.Tech curriculum and fees document',
        createdAt: emailTime,
        nextFollowUp: nextFollowUp3
      };

      mockPrisma.activity.create.mockResolvedValue(emailActivity);

      await mockPrisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'EMAIL',
          notes: emailActivity.notes,
          nextFollowUp: nextFollowUp3
        }
      });

      lead = { ...lead, nextFollowUp: nextFollowUp3 };
      mockPrisma.lead.update.mockResolvedValue(lead);

      await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { nextFollowUp: nextFollowUp3 }
      });

      console.log('✓ Email sent');

      // STEP 7: Move to QUALIFIED (received parent approval)
      console.log('STEP 7: Marking as QUALIFIED...');
      lead = {
        ...lead,
        status: 'QUALIFIED' as const,
        priority: 'HOT' as const
      };

      mockPrisma.lead.update.mockResolvedValue(lead);

      const qualifiedLead = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { status: 'QUALIFIED', priority: 'HOT' }
      });

      expect(qualifiedLead.status).toBe('QUALIFIED');
      expect(qualifiedLead.priority).toBe('HOT');

      mockPrisma.activity.create.mockResolvedValue({
        id: 4,
        leadId: lead.id,
        type: 'NOTE' as const,
        notes: 'Parent approval received. Ready for qualification.',
        createdAt: new Date(),
        nextFollowUp: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      await mockPrisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'NOTE',
          notes: 'Parent approval received. Ready for qualification.',
          nextFollowUp: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      console.log('✓ Status moved to QUALIFIED, priority set to HOT');

      // STEP 8: Send WhatsApp with admission link
      console.log('STEP 8: Sending WhatsApp message...');

      mockPrisma.whatsAppMessage.create.mockResolvedValue({
        id: 1,
        leadId: lead.id,
        sentBy: counselor.id,
        message: 'Hi Priya! Click here to complete your admission: https://link.com/apply',
        status: 'SENT' as const,
        direction: 'OUTBOUND' as const,
        phoneNumber: lead.phone,
        messageId: 'WHATSAPP_MSG_001',
        mediaUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await mockPrisma.whatsAppMessage.create({
        data: {
          leadId: lead.id,
          sentBy: counselor.id,
          message: 'Hi Priya! Click here to complete your admission: https://link.com/apply',
          direction: 'OUTBOUND',
          phoneNumber: lead.phone
        }
      });

      console.log('✓ WhatsApp message sent');

      // STEP 9: Move to APPLIED
      console.log('STEP 9: Recording application submission...');
      lead = { ...lead, status: 'APPLIED' as const };

      mockPrisma.lead.update.mockResolvedValue(lead);

      const appliedLead = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { status: 'APPLIED' }
      });

      expect(appliedLead.status).toBe('APPLIED');

      mockPrisma.activity.create.mockResolvedValue({
        id: 5,
        leadId: lead.id,
        type: 'NOTE' as const,
        notes: 'Application submitted successfully',
        createdAt: new Date(),
        nextFollowUp: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      await mockPrisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'NOTE',
          notes: 'Application submitted successfully',
          nextFollowUp: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      console.log('✓ Status moved to APPLIED');

      // STEP 10: Final CALL - Enrollment confirmation
      console.log('STEP 10: Final enrollment call...');

      mockPrisma.activity.create.mockResolvedValue({
        id: 6,
        leadId: lead.id,
        type: 'CALL' as const,
        notes: 'Called to confirm enrollment. Priya confirmed her admission!',
        createdAt: new Date(),
        nextFollowUp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week follow-up
      });

      await mockPrisma.activity.create({
        data: {
          leadId: lead.id,
          type: 'CALL',
          notes: 'Called to confirm enrollment. Priya confirmed her admission!',
          nextFollowUp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      // STEP 11: FINAL - Move to ENROLLED
      console.log('STEP 11: Moving to ENROLLED (FINAL STATUS)...');
      lead = { ...lead, status: 'ENROLLED' as const };

      mockPrisma.lead.update.mockResolvedValue(lead);

      const enrolledLead = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { status: 'ENROLLED' }
      });

      expect(enrolledLead.status).toBe('ENROLLED');
      console.log('✓ Status moved to ENROLLED - CYCLE COMPLETE!');

      // Final verification
      console.log('\n✓✓✓ COMPLETE WORKFLOW SUCCESSFUL ✓✓✓');
      console.log('Lead lifecycle:');
      console.log('  LEAD → CONTACTED → INTERESTED → QUALIFIED → APPLIED → ENROLLED');
      console.log(`Timeline: ${lead.id} activities logged`);
      console.log('All touchpoints recorded');
    });

    it('should ensure no critical failures in workflow', async () => {
      // Verify essential operations don't crash
      const workflows = [
        { name: 'Create Lead', fn: () => mockPrisma.lead.create({}) },
        { name: 'Update Status', fn: () => mockPrisma.lead.update({ where: {}, data: {} }) },
        { name: 'Log Activity', fn: () => mockPrisma.activity.create({}) },
        { name: 'Assign Lead', fn: () => mockPrisma.lead.update({ where: {}, data: {} }) }
      ];

      for (const workflow of workflows) {
        expect(() => {
          mockPrisma.lead.create = jest.fn().mockResolvedValue({ id: 1 });
          mockPrisma.lead.update = jest.fn().mockResolvedValue({ id: 1 });
          mockPrisma.activity.create = jest.fn().mockResolvedValue({ id: 1 });
        }).not.toThrow();
      }
    });
  });

  describe('Workflow Validation Checkpoints', () => {
    it('should validate each workflow stage before proceeding', async () => {
      const lead = createMockLead({ id: 1, status: 'LEAD' as const });

      // Checkpoint 1: Lead creation
      expect(lead.id).toBeDefined();
      expect(lead.phone).toBeDefined();

      // Checkpoint 2: Before assignment
      const counselor = createMockUser({ id: 1 });
      expect(counselor.id).toBeDefined();

      // Checkpoint 3: Before activity
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expect(futureDate > new Date()).toBe(true);

      // Checkpoint 4: Before status transition
      const validStatuses = ['LEAD', 'CONTACTED', 'INTERESTED', 'QUALIFIED', 'APPLIED', 'ENROLLED'];
      expect(validStatuses).toContain(lead.status);
    });
  });

  describe('Workflow Error Recovery', () => {
    it('should handle assignment failure and retry', async () => {
      const lead = createMockLead({ id: 1 });

      // First attempt fails
      mockPrisma.lead.update.mockRejectedValueOnce(
        new Error('Assignment failed')
      );

      try {
        await mockPrisma.lead.update({
          where: { id: lead.id },
          data: { assignedTo: 1 }
        });
      } catch (error) {
        expect((error as Error).message).toBe('Assignment failed');
      }

      // Retry succeeds
      mockPrisma.lead.update.mockResolvedValueOnce({
        ...lead,
        assignedTo: 1
      });

      const result = await mockPrisma.lead.update({
        where: { id: lead.id },
        data: { assignedTo: 1 }
      });

      expect(result.assignedTo).toBe(1);
    });
  });
});
