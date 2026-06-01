import { LeadStatus, Prisma, Priority } from "@prisma/client";
import { createHash } from "crypto";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Request, Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { invalidateDashboardSummaryCache } from "../services/dashboardSummaryCache.js";
import { asyncHandler } from "../utils/asyncHandler.js";

type DuplicateBy = "phone" | "email";

interface PartnerLeadIntegrationConfig {
  partnerCode: string;
  leadSource: string;
  rateLimitPerMin: number;
  aliasLeadPaths?: string[];
  aliasHealthPaths?: string[];
}

interface IntegrationAuthContext {
  tenantId: number;
  tenantSlug: string;
  integrationApiKeyId: number;
}

const tenantSlugSchema = z.string().trim().regex(/^[a-z0-9-]+$/, "Invalid tenant slug");

const partnerLeadSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    phone: z.string().trim().min(1, "Phone is required"),
    email: z.string().trim().email("Invalid email format").optional().or(z.literal("")),
    address: z.string().trim().optional().or(z.literal("")),
    region: z.string().trim().optional().or(z.literal("")),
    city: z.string().trim().optional().or(z.literal("")),
    locality: z.string().trim().optional().or(z.literal("")),
    pincode: z.string().trim().optional().or(z.literal("")),
    course: z.string().trim().optional().or(z.literal("")),
    campaign: z.string().trim().optional().or(z.literal("")),
    source: z.string().trim().optional().or(z.literal("")),
    externalLeadId: z.string().trim().optional().or(z.literal(""))
  })
  .strip();

const toNullable = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const extractApiKey = (req: Request) => {
  const apiKeyHeader = req.headers["x-api-key"];
  if (typeof apiKeyHeader === "string" && apiKeyHeader.trim()) {
    return apiKeyHeader.trim();
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  return null;
};

const hashApiKey = (apiKey: string) => createHash("sha256").update(apiKey).digest("hex");

const normalizePhoneForMatch = (phone: string) => phone.replace(/\D/g, "");

const pickString = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
};

const resolveTenantSlug = (req: Request) => {
  const headerSlug = req.headers["x-tenant-slug"];
  if (typeof headerSlug === "string" && headerSlug.trim()) {
    return headerSlug.trim().toLowerCase();
  }

  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    const bodySlug = (req.body as Record<string, unknown>).tenantSlug;
    if (typeof bodySlug === "string" && bodySlug.trim()) {
      return bodySlug.trim().toLowerCase();
    }
  }

  const querySlug = req.query.tenantSlug;
  if (typeof querySlug === "string" && querySlug.trim()) {
    return querySlug.trim().toLowerCase();
  }

  return null;
};

const mapInboundLeadPayload = (body: unknown) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return body;
  }

  const raw = body as Record<string, unknown>;

  return {
    name: pickString(raw, ["name", "student_name", "studentName", "full_name", "fullName"]),
    phone: pickString(raw, ["phone", "mobile", "mobile_number", "phone_number", "contact_number"]),
    email: pickString(raw, ["email", "email_id", "emailId"]),
    address: pickString(raw, ["address"]),
    region: pickString(raw, ["region", "state"]),
    city: pickString(raw, ["city"]),
    locality: pickString(raw, ["locality", "area"]),
    pincode: pickString(raw, ["pincode", "pin", "postal_code"]),
    course: pickString(raw, ["course", "program", "interested_course"]),
    campaign: pickString(raw, ["campaign", "campaign_name", "utm_campaign"]),
    source: pickString(raw, ["source", "lead_source", "utm_source"]),
    externalLeadId: pickString(raw, ["externalLeadId", "external_lead_id", "lead_id"])
  };
};

const findDuplicateByPhone = async (tenantId: number, rawPhone: string) => {
  const trimmedPhone = rawPhone.trim();
  const normalizedPhone = normalizePhoneForMatch(trimmedPhone);
  const lastTenDigits = normalizedPhone.length > 10 ? normalizedPhone.slice(-10) : normalizedPhone;

  const conditions: Prisma.LeadWhereInput[] = [];
  conditions.push({ phone: trimmedPhone });

  if (normalizedPhone) {
    conditions.push({ phone: normalizedPhone });
    conditions.push({ phone: { endsWith: normalizedPhone } });
  }

  if (lastTenDigits && lastTenDigits !== normalizedPhone) {
    conditions.push({ phone: { endsWith: lastTenDigits } });
  }

  return prisma.lead.findFirst({
    where: {
      tenantId,
      OR: conditions
    },
    select: { id: true, phone: true, email: true },
    orderBy: { createdAt: "desc" }
  });
};

const findDuplicateByEmail = async (tenantId: number, email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  return prisma.lead.findFirst({
    where: {
      tenantId,
      email: {
        equals: normalizedEmail,
        mode: "insensitive"
      }
    },
    select: { id: true, phone: true, email: true },
    orderBy: { createdAt: "desc" }
  });
};

const logIntegrationLeadAudit = async (params: {
  tenantId: number;
  status: "SUCCESS" | "FAILURE" | "DUPLICATE";
  ipAddress: string;
  userAgent: string | null;
  details: Record<string, unknown>;
}) => {
  await prisma.securityEvent
    .create({
      data: {
        tenantId: params.tenantId,
        userId: null,
        action: "INTEGRATION_LEAD_RECEIVED",
        resource: "LEAD_INTEGRATION",
        status: params.status,
        details: params.details as Prisma.InputJsonValue,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent
      }
    })
    .catch(() => {
      // Do not block ingestion when audit logging fails.
    });
};

const authenticateIntegrationRequest = async (
  req: Request,
  config: PartnerLeadIntegrationConfig
): Promise<{ context: IntegrationAuthContext | null; response?: { status: number; body: Record<string, unknown> } }> => {
  const apiKey = extractApiKey(req);
  if (!apiKey) {
    return {
      context: null,
      response: {
        status: 401,
        body: {
          success: false,
          error: {
            code: "MISSING_API_KEY",
            message: "API key is required"
          }
        }
      }
    };
  }

  const tenantSlugRaw = resolveTenantSlug(req);
  const tenantSlugParsed = tenantSlugSchema.safeParse(tenantSlugRaw);
  if (!tenantSlugParsed.success) {
    return {
      context: null,
      response: {
        status: 400,
        body: {
          success: false,
          error: {
            code: "INVALID_TENANT_SLUG",
            message: "Valid tenant slug is required"
          }
        }
      }
    };
  }

  const tenantSlug = tenantSlugParsed.data;
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug, isActive: true },
    select: { id: true, slug: true }
  });

  if (!tenant) {
    return {
      context: null,
      response: {
        status: 401,
        body: {
          success: false,
          error: {
            code: "TENANT_NOT_FOUND",
            message: "Tenant not found or inactive"
          }
        }
      }
    };
  }

  const apiKeyHash = hashApiKey(apiKey);
  const apiKeyPrefix = apiKey.slice(0, 8);

  const integrationKey = await prisma.integrationApiKey.findFirst({
    where: {
      tenantId: tenant.id,
      partner: config.partnerCode,
      isActive: true,
      apiKeyHash,
      apiKeyPrefix
    },
    select: {
      id: true,
      tenantId: true
    }
  });

  if (!integrationKey) {
    await logIntegrationLeadAudit({
      tenantId: tenant.id,
      status: "FAILURE",
      ipAddress: req.ip || req.socket.remoteAddress || "UNKNOWN",
      userAgent: req.headers["user-agent"] ?? null,
      details: {
        reason: "Invalid API key",
        partner: config.partnerCode,
        tenantSlug
      }
    });

    return {
      context: null,
      response: {
        status: 401,
        body: {
          success: false,
          error: {
            code: "INVALID_API_KEY",
            message: "Invalid API key"
          }
        }
      }
    };
  }

  void prisma.integrationApiKey
    .update({
      where: { id: integrationKey.id },
      data: { lastUsedAt: new Date() }
    })
    .catch(() => {
      // Silent update failure should not block valid API requests.
    });

  return {
    context: {
      tenantId: integrationKey.tenantId,
      tenantSlug,
      integrationApiKeyId: integrationKey.id
    }
  };
};

const createPartnerRateLimiter = (config: PartnerLeadIntegrationConfig) =>
  rateLimit({
    windowMs: 60 * 1000,
    max: config.rateLimitPerMin,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const apiKey = extractApiKey(req);
      const apiFingerprint = apiKey
        ? hashApiKey(apiKey).slice(0, 16)
        : ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? "unknown");
      const tenantSlug = resolveTenantSlug(req) ?? "unknown";
      return `${config.partnerCode}:${tenantSlug}:${apiFingerprint}`;
    },
    handler: (_req, res) => {
      return res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded. Please retry after a minute."
        }
      });
    }
  });

const createPartnerLeadIngestionHandler = (config: PartnerLeadIntegrationConfig) =>
  asyncHandler(async (req, res) => {
    const authResult = await authenticateIntegrationRequest(req, config);
    if (!authResult.context) {
      return res.status(authResult.response!.status).json(authResult.response!.body);
    }

    const context = authResult.context;
    const ipAddress = req.ip || req.socket.remoteAddress || "UNKNOWN";
    const userAgent = req.headers["user-agent"] ?? null;

    const payloadToValidate = mapInboundLeadPayload(req.body);
    const parsed = partnerLeadSchema.safeParse(payloadToValidate);

    if (!parsed.success) {
      await logIntegrationLeadAudit({
        tenantId: context.tenantId,
        status: "FAILURE",
        ipAddress,
        userAgent,
        details: {
          partner: config.partnerCode,
          tenantSlug: context.tenantSlug,
          integrationApiKeyId: context.integrationApiKeyId,
          reason: "Invalid lead payload",
          errors: parsed.error.flatten()
        }
      });

      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PAYLOAD",
          message: "Invalid lead payload",
          details: parsed.error.flatten()
        }
      });
    }

    const payload = parsed.data;

    const duplicateByPhone = await findDuplicateByPhone(context.tenantId, payload.phone);
    if (duplicateByPhone) {
      await logIntegrationLeadAudit({
        tenantId: context.tenantId,
        status: "DUPLICATE",
        ipAddress,
        userAgent,
        details: {
          partner: config.partnerCode,
          tenantSlug: context.tenantSlug,
          integrationApiKeyId: context.integrationApiKeyId,
          duplicateBy: "phone",
          duplicateLeadId: duplicateByPhone.id,
          phone: payload.phone,
          campaign: toNullable(payload.campaign),
          partnerSource: toNullable(payload.source)
        }
      });

      return res.status(409).json({
        success: false,
        error: {
          code: "DUPLICATE_LEAD",
          message: "Lead already exists",
          duplicateBy: "phone" as DuplicateBy,
          leadId: duplicateByPhone.id
        }
      });
    }

    const emailValue = toNullable(payload.email);
    if (emailValue) {
      const duplicateByEmail = await findDuplicateByEmail(context.tenantId, emailValue);
      if (duplicateByEmail) {
        await logIntegrationLeadAudit({
          tenantId: context.tenantId,
          status: "DUPLICATE",
          ipAddress,
          userAgent,
          details: {
            partner: config.partnerCode,
            tenantSlug: context.tenantSlug,
            integrationApiKeyId: context.integrationApiKeyId,
            duplicateBy: "email",
            duplicateLeadId: duplicateByEmail.id,
            email: emailValue,
            campaign: toNullable(payload.campaign),
            partnerSource: toNullable(payload.source)
          }
        });

        return res.status(409).json({
          success: false,
          error: {
            code: "DUPLICATE_LEAD",
            message: "Lead already exists",
            duplicateBy: "email" as DuplicateBy,
            leadId: duplicateByEmail.id
          }
        });
      }
    }

    const createdLead = await prisma.lead.create({
      data: {
        tenantId: context.tenantId,
        name: payload.name.trim(),
        phone: payload.phone.trim(),
        email: emailValue,
        address: toNullable(payload.address),
        region: toNullable(payload.region),
        city: toNullable(payload.city),
        locality: toNullable(payload.locality),
        pincode: toNullable(payload.pincode),
        course: toNullable(payload.course),
        source: config.leadSource,
        campaign: toNullable(payload.campaign),
        partnerSource: toNullable(payload.source),
        status: LeadStatus.LEAD,
        priority: Priority.COLD
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        source: true,
        campaign: true,
        partnerSource: true,
        createdAt: true
      }
    });

    invalidateDashboardSummaryCache(context.tenantId);

    await logIntegrationLeadAudit({
      tenantId: context.tenantId,
      status: "SUCCESS",
      ipAddress,
      userAgent,
      details: {
        partner: config.partnerCode,
        tenantSlug: context.tenantSlug,
        integrationApiKeyId: context.integrationApiKeyId,
        leadId: createdLead.id,
        externalLeadId: toNullable(payload.externalLeadId),
        campaign: toNullable(payload.campaign),
        partnerSource: toNullable(payload.source)
      }
    });

    return res.status(201).json({
      success: true,
      data: {
        leadId: createdLead.id,
        status: "CREATED",
        source: createdLead.source
      }
    });
  });

const createPartnerHealthHandler = () =>
  (_req: Request, res: Response) => {
    return res.json({
      success: true,
      status: "OK"
    });
  };

const partnerConfigs: PartnerLeadIntegrationConfig[] = [
  {
    partnerCode: "collegedunia",
    leadSource: "Collegedunia",
    rateLimitPerMin: 60,
    aliasLeadPaths: ["/collegedunia/leads"],
    aliasHealthPaths: ["/collegedunia/health"]
  }
];

const router = Router();

for (const config of partnerConfigs) {
  const leadIngestionHandler = createPartnerLeadIngestionHandler(config);
  const leadRateLimiter = createPartnerRateLimiter(config);
  const canonicalLeadPath = `/partner/${config.partnerCode}/leads`;
  const canonicalHealthPath = `/partner/${config.partnerCode}/health`;

  router.get(canonicalHealthPath, createPartnerHealthHandler());
  router.post(canonicalLeadPath, leadRateLimiter, leadIngestionHandler);

  for (const aliasHealthPath of config.aliasHealthPaths ?? []) {
    router.get(aliasHealthPath, createPartnerHealthHandler());
  }

  for (const aliasLeadPath of config.aliasLeadPaths ?? []) {
    router.post(aliasLeadPath, leadRateLimiter, leadIngestionHandler);
  }
}

export default router;
