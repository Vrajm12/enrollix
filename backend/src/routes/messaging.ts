import { Router } from "express";
import { z } from "zod";
import { MessageStatus } from "@prisma/client";
import twilio from "twilio";
import { prisma } from "../prisma.js";
import { validateResourceTenant } from "../utils/tenantHelper.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildLeadSelect } from "../utils/leadCompatibility.js";
import { env } from "../config.js";
import { twilioService } from "../services/twilio.js";
import { emailService } from "../services/email.js";

const router = Router();

// Validation schemas
const sendWhatsAppSchema = z.object({
  leadId: z.number().int().positive(),
  message: z.string().min(1, "Message is required"),
  mediaUrl: z.string().url().optional().nullable()
});

const sendSMSSchema = z.object({
  leadId: z.number().int().positive(),
  message: z.string().min(1, "Message is required")
});

const bulkMessageSchema = z.object({
  leadIds: z.array(z.number().int().positive()).min(1),
  message: z.string().min(1, "Message is required"),
  type: z.enum(["whatsapp", "sms", "email"]),
  subject: z.string().trim().max(200).optional(),
  dryRun: z.boolean().optional()
}).superRefine((value, ctx) => {
  if (value.type === "email" && (!value.subject || value.subject.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Subject is required for email",
      path: ["subject"]
    });
  }
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// WhatsApp Endpoints
router.post(
  "/whatsapp/send",
  asyncHandler(async (req, res) => {
    const parsed = sendWhatsAppSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid payload",
        errors: parsed.error.flatten()
      });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: parsed.data.leadId },
      select: await buildLeadSelect({
        includeAssignedCounselor: false,
        includeRemarks: false
      })
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // ✅ CRITICAL: Validate tenant access
    if (!validateResourceTenant(req.user!.tenantId, lead.tenantId, req.user?.role)) {
      return res.status(403).json({ message: "Access denied for this lead" });
    }

    // Create message record in database
    const message = await prisma.whatsAppMessage.create({
      data: {
        tenantId: req.user!.tenantId,
        leadId: lead.id,
        sentBy: req.user!.id,
        message: parsed.data.message,
        status: "PENDING",
        direction: "OUTBOUND",
        phoneNumber: lead.phone,
        mediaUrl: parsed.data.mediaUrl
      }
    });

    // TODO: Integrate WhatsApp Business API for actual sending
    // For now, simulate sending after 2 seconds
    setTimeout(async () => {
      await prisma.whatsAppMessage.update({
        where: { id: message.id },
        data: {
          status: "DELIVERED",
          messageId: `wa_${Date.now()}_${message.id}`
        }
      });
    }, 2000);

    return res.status(201).json(message);
  })
);

router.get(
  "/whatsapp/thread/:leadId",
  asyncHandler(async (req, res) => {
    const leadId = Number(req.params.leadId);
    if (isNaN(leadId) || leadId <= 0) {
      return res.status(400).json({ message: "Invalid lead id" });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: await buildLeadSelect({
        includeAssignedCounselor: false,
        includeRemarks: false
      })
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // ✅ CRITICAL: Validate tenant access
    if (!validateResourceTenant(req.user!.tenantId, lead.tenantId, req.user?.role)) {
      return res.status(403).json({ message: "Access denied for this lead" });
    }

    const messages = await prisma.whatsAppMessage.findMany({
      where: { leadId },
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    return res.json({ lead, messages });
  })
);

// SMS Endpoints
router.post(
  "/sms/send",
  asyncHandler(async (req, res) => {
    const parsed = sendSMSSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid payload",
        errors: parsed.error.flatten()
      });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: parsed.data.leadId },
      select: await buildLeadSelect({
        includeAssignedCounselor: false,
        includeRemarks: false
      })
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // ✅ CRITICAL: Validate tenant access
    if (!validateResourceTenant(req.user!.tenantId, lead.tenantId, req.user?.role)) {
      return res.status(403).json({ message: "Access denied for this lead" });
    }

    // Create message record in database with PENDING status
    const message = await prisma.sMSMessage.create({
      data: {
        tenantId: req.user!.tenantId,
        leadId: lead.id,
        sentBy: req.user!.id,
        message: parsed.data.message,
        status: "PENDING",
        direction: "OUTBOUND",
        phoneNumber: lead.phone,
        provider: "twilio"
      }
    });

    // Send via Twilio and update message record
    try {
      const messageSid = await twilioService.sendSMS(lead.phone, parsed.data.message);
      
      if (messageSid) {
        // Update message with Twilio SID and mark as sent
        await prisma.sMSMessage.update({
          where: { id: message.id },
          data: {
            status: "SENT",
            messageId: messageSid,
            cost: 0.0075
          }
        });
        
        // Fetch updated message to return
        const updatedMessage = await prisma.sMSMessage.findUnique({
          where: { id: message.id },
          include: { user: { select: { id: true, name: true, email: true } } }
        });
        return res.status(201).json(updatedMessage);
      } else {
        // If Twilio not configured, return message as is
        return res.status(201).json(message);
      }
    } catch (error) {
      // Update message status to FAILED if sending fails
      await prisma.sMSMessage.update({
        where: { id: message.id },
        data: { status: "FAILED" }
      });
      
      return res.status(500).json({
        message: "Failed to send SMS",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  })
);

router.get(
  "/sms/thread/:leadId",
  asyncHandler(async (req, res) => {
    const leadId = Number(req.params.leadId);
    if (isNaN(leadId) || leadId <= 0) {
      return res.status(400).json({ message: "Invalid lead id" });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: await buildLeadSelect({
        includeAssignedCounselor: false,
        includeRemarks: false
      })
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }
    // ✅ CRITICAL: Validate tenant access
    if (!validateResourceTenant(req.user!.tenantId, lead.tenantId, req.user?.role)) {
      return res.status(403).json({ message: "Access denied for this lead" });
    }

    const messages = await prisma.sMSMessage.findMany({
      where: { leadId },
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    return res.json({ lead, messages });
  })
);

// Bulk Messaging Endpoint
router.post(
  "/bulk/send",
  asyncHandler(async (req, res) => {
    const parsed = bulkMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid payload",
        errors: parsed.error.flatten()
      });
    }

    // Fetch all leads
    const leadSelect = await buildLeadSelect({
      includeAssignedCounselor: false,
      includeRemarks: false
    });
    const leads = await prisma.lead.findMany({
      where: {
        tenantId: req.user!.tenantId,
        id: { in: parsed.data.leadIds }
      },
      select: leadSelect
    });

    if (leads.length === 0) {
      return res.status(404).json({ message: "No leads found" });
    }

    const results = [];
    const dryRun = parsed.data.dryRun ?? false;

    if (parsed.data.type === "whatsapp") {
      for (const lead of leads) {
        const message = await prisma.whatsAppMessage.create({
          data: {
            tenantId: req.user!.tenantId,
            leadId: lead.id,
            sentBy: req.user!.id,
            message: parsed.data.message,
            status: "PENDING",
            direction: "OUTBOUND",
            phoneNumber: lead.phone
          }
        });
        results.push(message);
      }
    } else if (parsed.data.type === "sms") {
      for (const lead of leads) {
        try {
          // Send SMS via Twilio
          const messageSid = await twilioService.sendSMS(lead.phone, parsed.data.message);
          
          const message = await prisma.sMSMessage.create({
            data: {
              tenantId: req.user!.tenantId,
              leadId: lead.id,
              sentBy: req.user!.id,
              message: parsed.data.message,
              status: messageSid ? "SENT" : "PENDING",
              direction: "OUTBOUND",
              phoneNumber: lead.phone,
              provider: "twilio",
              messageId: messageSid || undefined,
              cost: messageSid ? 0.0075 : undefined
            }
          });
          results.push(message);
        } catch (error) {
          console.error(`Failed to send SMS to lead ${lead.id}:`, error);
          // Create message record with FAILED status
          const message = await prisma.sMSMessage.create({
            data: {
              tenantId: req.user!.tenantId,
              leadId: lead.id,
              sentBy: req.user!.id,
              message: parsed.data.message,
              status: "FAILED",
              direction: "OUTBOUND",
              phoneNumber: lead.phone,
              provider: "twilio"
            }
          });
          results.push(message);
        }
      }
    } else {
      if (!dryRun && !emailService.isConfigured()) {
        return res.status(400).json({
          message: "SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM."
        });
      }

      const leadsWithEmail = leads.filter((lead) => Boolean(lead.email && lead.email.trim().length > 0));
      const skippedNoEmail = leads.length - leadsWithEmail.length;
      const validEmailLeads = leadsWithEmail.filter((lead) =>
        z.string().email().safeParse((lead.email ?? "").trim()).success
      );
      const skippedInvalidEmail = leadsWithEmail.length - validEmailLeads.length;
      const maxRecipients = Math.max(1, env.EMAIL_BULK_MAX_RECIPIENTS);
      const sendDelayMs = Math.max(0, env.EMAIL_BULK_DELAY_MS);

      if (validEmailLeads.length > maxRecipients) {
        return res.status(400).json({
          message: `Email bulk limit exceeded. Selected ${validEmailLeads.length} valid email leads, but current server cap is ${maxRecipients}.`,
          maxRecipients
        });
      }

      if (!dryRun && validEmailLeads.length > 0) {
        try {
          await emailService.verifyConnection();
        } catch (error) {
          return res.status(400).json({
            message: "SMTP connection failed. Check Brevo SMTP key, authorized IP, and sender verification.",
            error: error instanceof Error ? error.message : "Unknown SMTP connection error"
          });
        }
      }

      for (let index = 0; index < validEmailLeads.length; index += 1) {
        const lead = validEmailLeads[index];
        try {
          const leadContext = {
            name: lead.name,
            course: lead.course,
            phone: lead.phone,
            email: lead.email!,
            district: lead.city,
            locality: lead.locality,
            state: lead.region,
            pincode: lead.pincode
          };

          if (dryRun) {
            const preview = emailService.renderLeadTemplate({
              subject: parsed.data.subject!,
              message: parsed.data.message,
              lead: leadContext
            });

            results.push({
              leadId: lead.id,
              email: lead.email,
              status: "DRY_RUN",
              previewSubject: preview.subject,
              previewBody: preview.text.slice(0, 200)
            });
            continue;
          }

          const sent = await emailService.sendLeadEmail({
            to: lead.email!,
            subject: parsed.data.subject!,
            message: parsed.data.message,
            lead: leadContext
          });

          results.push({
            leadId: lead.id,
            email: lead.email,
            status: "SENT",
            messageId: sent.messageId
          });
        } catch (error) {
          results.push({
            leadId: lead.id,
            email: lead.email,
            status: "FAILED",
            error: error instanceof Error ? error.message : "Unknown email send error"
          });
        }

        if (!dryRun && sendDelayMs > 0 && index < validEmailLeads.length - 1) {
          // Local throttle keeps SMTP usage and app load under control.
          // eslint-disable-next-line no-await-in-loop
          await sleep(sendDelayMs);
        }
      }

      const sentCount = results.filter((entry) => entry.status === "SENT").length;
      const failedCount = results.filter((entry) => entry.status === "FAILED").length;
      const dryRunCount = results.filter((entry) => entry.status === "DRY_RUN").length;

      return res.status(201).json({
        type: parsed.data.type,
        dryRun,
        totalMessages: results.length,
        selectedLeads: leads.length,
        skippedNoEmail,
        skippedInvalidEmail,
        sentCount,
        failedCount,
        dryRunCount,
        maxRecipients,
        sendDelayMs,
        messages: results
      });
    }

    return res.status(201).json({
      type: parsed.data.type,
      totalMessages: results.length,
      messages: results
    });
  })
);

// Message Statistics
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const [whatsappCount, smsCount, whatsappDelivered, smsDelivered] = await Promise.all([
      prisma.whatsAppMessage.count({ where: { tenantId: req.user!.tenantId } }),
      prisma.sMSMessage.count({ where: { tenantId: req.user!.tenantId } }),
      prisma.whatsAppMessage.count({
        where: { tenantId: req.user!.tenantId, status: "DELIVERED" }
      }),
      prisma.sMSMessage.count({
        where: { tenantId: req.user!.tenantId, status: "DELIVERED" }
      })
    ]);

    const stats = {
      whatsapp: {
        total: whatsappCount,
        delivered: whatsappDelivered,
        failed: whatsappCount - whatsappDelivered,
        deliveryRate: whatsappCount > 0 ? (whatsappDelivered / whatsappCount) * 100 : 0
      },
      sms: {
        total: smsCount,
        delivered: smsDelivered,
        failed: smsCount - smsDelivered,
        deliveryRate: smsCount > 0 ? (smsDelivered / smsCount) * 100 : 0
      }
    };

    return res.json(stats);
  })
);

// Check SMS delivery status
router.get(
  "/sms/status/:messageSid",
  asyncHandler(async (req, res) => {
    const { messageSid } = req.params;

    if (!messageSid) {
      return res.status(400).json({ message: "Message SID is required" });
    }

    try {
      // Get message from database
      const message = await prisma.sMSMessage.findFirst({
        where: {
          tenantId: req.user!.tenantId,
          messageId: messageSid
        },
        include: { user: { select: { id: true, name: true, email: true } } }
      });

      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      // Check status with Twilio
      const twilioStatus = await twilioService.getMessageStatus(messageSid);

      // Map Twilio status to our status enum
      const statusMap: Record<string, string> = {
        queued: "PENDING",
        sending: "PENDING",
        sent: "SENT",
        failed: "FAILED",
        delivered: "DELIVERED",
        read: "READ"
      };

      if (twilioStatus && statusMap[twilioStatus]) {
        // Update status in database if different
        const newStatus = statusMap[twilioStatus] as MessageStatus;
        if (message.status !== newStatus) {
          const updated = await prisma.sMSMessage.update({
            where: { id: message.id },
            data: { status: newStatus },
            include: { user: { select: { id: true, name: true, email: true } } }
          });
          return res.json({
            message: updated,
            twilioStatus,
            updatedFromTwilio: true
          });
        }
      }

      return res.json({
        message,
        twilioStatus,
        updatedFromTwilio: false
      });
    } catch (error) {
      return res.status(500).json({
        message: "Failed to check message status",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  })
);

// Webhook handler for SMS delivery receipts
router.post(
  "/webhooks/sms-status",
  asyncHandler(async (req, res) => {
    const signature = req.header("x-twilio-signature");
    const requestUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const shouldVerifySignature = process.env.NODE_ENV === "production" && Boolean(env.TWILIO_AUTH_TOKEN);

    if (shouldVerifySignature) {
      const isValidTwilioRequest = twilio.validateRequest(
        env.TWILIO_AUTH_TOKEN!,
        signature ?? "",
        requestUrl,
        req.body ?? {}
      );

      if (!isValidTwilioRequest) {
        return res.status(403).json({ message: "Invalid webhook signature" });
      }
    }

    // Webhook payload from Twilio contains:
    // MessageSid, AccountSid, From, To, MessageStatus, ErrorCode, etc.
    const { MessageSid, MessageStatus, To, ErrorCode } = req.body;

    // Validate Twilio request (optional but recommended for security)
    // In production, verify Twilio signature using twilio-lib
    if (!MessageSid || !MessageStatus) {
      return res.status(400).json({ message: "Invalid webhook payload" });
    }

    try {
      // Map Twilio status to our status enum
      const statusMap: Record<string, string> = {
        queued: "PENDING",
        sending: "PENDING",
        sent: "SENT",
        failed: "FAILED",
        delivered: "DELIVERED",
        read: "READ",
        undelivered: "FAILED"
      };

      const mappedStatus = statusMap[MessageStatus] || MessageStatus;

      // Find message by Twilio SID
      const message = await prisma.sMSMessage.findFirst({
        where: { messageId: MessageSid },
        include: { lead: true, user: true }
      });

      if (!message) {
        console.warn(`SMS message with SID ${MessageSid} not found in database`);
        // Still return 200 to acknowledge receipt to Twilio
        return res.status(200).json({ acknowledged: true });
      }

      // Update message status
      const updated = await prisma.sMSMessage.update({
        where: { id: message.id },
        data: {
          status: mappedStatus as MessageStatus,
          ...(ErrorCode && { errorCode: ErrorCode })
        }
      });

      // Log delivery status
      console.log(
        `SMS delivery status updated: ${MessageSid} -> ${mappedStatus} (To: ${To})`
      );

      // Optional: Send notification or trigger other actions
      // e.g., update lead status, send email notification, etc.
      if (mappedStatus === "FAILED") {
        console.error(
          `SMS delivery failed for ${To}. Error Code: ${ErrorCode || "Unknown"}`
        );
        // Could trigger retry logic or alert here
      }

      // Return 200 to acknowledge to Twilio
      return res.status(200).json({
        acknowledged: true,
        messageSid: MessageSid,
        status: mappedStatus
      });
    } catch (error) {
      console.error("Error processing SMS webhook:", error);
      // Still return 200 to prevent Twilio from retrying
      return res.status(200).json({
        acknowledged: true,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  })
);

export default router;
