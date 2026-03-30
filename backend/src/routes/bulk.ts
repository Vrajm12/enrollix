import { LeadStatus, Priority, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const importCsvSchema = z.object({
  csv: z.string().min(1, "CSV content is required")
});

const bulkUpdateSchema = z.object({
  leadIds: z.array(z.number().int().positive()).min(1, "Select at least one lead"),
  updates: z
    .object({
      status: z.nativeEnum(LeadStatus).optional(),
      priority: z.nativeEnum(Priority).optional(),
      assignedTo: z.number().int().positive().nullable().optional(),
      nextFollowUp: z.string().datetime().nullable().optional()
    })
    .refine(
      (value) => Object.values(value).some((field) => field !== undefined),
      "At least one update must be provided"
    )
});

const exportSchema = z.object({
  filters: z
    .object({
      status: z.nativeEnum(LeadStatus).optional(),
      priority: z.nativeEnum(Priority).optional(),
      assignedTo: z.number().int().positive().nullable().optional()
    })
    .optional(),
  columns: z.array(z.string().min(1)).min(1, "Choose at least one column")
});

type CanonicalHeader =
  | "sr_no"
  | "name"
  | "phone"
  | "email"
  | "address"
  | "parent_contact"
  | "course"
  | "source"
  | "status"
  | "priority"
  | "next_follow_up";

type PreviewStatus = "ready" | "duplicate" | "error";

type ParsedImportRow = {
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  parentContact: string | null;
  course: string | null;
  source: string | null;
  status: LeadStatus;
  priority: Priority;
  nextFollowUp: string | null;
};

type PreviewRow = {
  rowNumber: number;
  original: Record<string, string>;
  normalized: ParsedImportRow | null;
  status: PreviewStatus;
  reasons: string[];
};

type ImportAnalysis = {
  headers: CanonicalHeader[];
  rows: PreviewRow[];
  summary: {
    totalRows: number;
    readyRows: number;
    duplicateRows: number;
    errorRows: number;
  };
};

const headerAliases: Record<string, CanonicalHeader> = {
  sr_no: "sr_no",
  srno: "sr_no",
  serial_no: "sr_no",
  serialnumber: "sr_no",
  serial_number: "sr_no",
  name: "name",
  full_name: "name",
  fullname: "name",
  student_name: "name",
  phone: "phone",
  mobile: "phone",
  mobile_no: "phone",
  mobile_number: "phone",
  phone_no: "phone",
  phone_number: "phone",
  contact_number: "phone",
  email: "email",
  email_id: "email",
  mail: "email",
  address: "address",
  parent_contact: "parent_contact",
  parent_phone: "parent_contact",
  parent_mobile: "parent_contact",
  guardian_contact: "parent_contact",
  course: "course",
  branch: "course",
  program: "course",
  source: "source",
  lead_source: "source",
  vendor: "source",
  status: "status",
  priority: "priority",
  next_follow_up: "next_follow_up",
  nextfollowup: "next_follow_up",
  follow_up: "next_follow_up",
  followup: "next_follow_up"
};

const requiredHeaders: CanonicalHeader[] = ["name", "phone"];

const exportableColumns = [
  "sr_no",
  "name",
  "phone",
  "email",
  "address",
  "parent_contact",
  "course",
  "source",
  "status",
  "priority",
  "next_follow_up",
  "assigned_counselor",
  "created_at",
  "updated_at"
] as const;

const nonEmpty = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeHeader = (header: string): CanonicalHeader | null => {
  const canonical = header
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/[.\s/-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  return headerAliases[canonical] ?? null;
};

const parseCsv = (input: string): string[][] => {
  const csv = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (char === "\r") {
      if (nextChar === "\n") {
        continue;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    if (char === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    currentField += char;
  }

  currentRow.push(currentField);
  rows.push(currentRow);

  return rows
    .map((row) => row.map((field) => field.trim()))
    .filter((row) => row.some((field) => field.length > 0));
};

const toCsvValue = (value: string | number | null | undefined) => {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const buildCsv = (rows: Array<Array<string | number | null | undefined>>) =>
  rows.map((row) => row.map((value) => toCsvValue(value)).join(",")).join("\n");

const parseStatus = (value: string | null) => {
  if (!value) return { value: LeadStatus.LEAD, reason: null };
  const normalized = value.trim().toUpperCase();
  return Object.values(LeadStatus).includes(normalized as LeadStatus)
    ? { value: normalized as LeadStatus, reason: null }
    : { value: null, reason: `Unsupported status "${value}"` };
};

const parsePriority = (value: string | null) => {
  if (!value) return { value: Priority.COLD, reason: null };
  const normalized = value.trim().toUpperCase();
  return Object.values(Priority).includes(normalized as Priority)
    ? { value: normalized as Priority, reason: null }
    : { value: null, reason: `Unsupported priority "${value}"` };
};

const parseNextFollowUp = (value: string | null) => {
  if (!value) return { value: null, reason: null };
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? { value: null, reason: `Invalid next_follow_up "${value}"` }
    : { value: date.toISOString(), reason: null };
};

const analyzeCsvImport = async (csv: string): Promise<ImportAnalysis> => {
  const rows = parseCsv(csv);
  if (rows.length === 0) {
    throw new Error("CSV file is empty");
  }

  const rawHeaders = rows[0];
  const headers = rawHeaders
    .map((header) => normalizeHeader(header))
    .filter((header): header is CanonicalHeader => header !== null);

  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required header(s): ${missingHeaders.join(", ")}`);
  }

  const headerMap = new Map<CanonicalHeader, number>();
  rawHeaders.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (normalized && !headerMap.has(normalized)) {
      headerMap.set(normalized, index);
    }
  });

  const previewRows: PreviewRow[] = rows.slice(1).map((row, rowIndex) => {
    const getCell = (header: CanonicalHeader) => {
      const cellIndex = headerMap.get(header);
      return cellIndex == null ? "" : row[cellIndex] ?? "";
    };

    const original = rawHeaders.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = row[index] ?? "";
      return accumulator;
    }, {});

    const reasons: string[] = [];
    const name = getCell("name").trim();
    const phone = getCell("phone").trim();
    const email = nonEmpty(getCell("email"));

    if (!name) reasons.push("Name is required");
    if (!phone) reasons.push("Phone is required");

    if (email && !z.string().email().safeParse(email).success) {
      reasons.push(`Invalid email "${email}"`);
    }

    const parsedStatus = parseStatus(nonEmpty(getCell("status")));
    const parsedPriority = parsePriority(nonEmpty(getCell("priority")));
    const parsedNextFollowUp = parseNextFollowUp(nonEmpty(getCell("next_follow_up")));

    if (parsedStatus.reason) reasons.push(parsedStatus.reason);
    if (parsedPriority.reason) reasons.push(parsedPriority.reason);
    if (parsedNextFollowUp.reason) reasons.push(parsedNextFollowUp.reason);

    const normalized =
      reasons.length === 0
        ? {
            name,
            phone,
            email,
            address: nonEmpty(getCell("address")),
            parentContact: nonEmpty(getCell("parent_contact")),
            course: nonEmpty(getCell("course")),
            source: nonEmpty(getCell("source")),
            status: parsedStatus.value ?? LeadStatus.LEAD,
            priority: parsedPriority.value ?? Priority.COLD,
            nextFollowUp: parsedNextFollowUp.value
          }
        : null;

    return {
      rowNumber: rowIndex + 2,
      original,
      normalized,
      status: reasons.length > 0 ? "error" : "ready",
      reasons
    };
  });

  const readyRows = previewRows.filter((row) => row.normalized);
  const phoneCounts = new Map<string, number>();
  const emailCounts = new Map<string, number>();

  readyRows.forEach((row) => {
    if (!row.normalized) return;
    phoneCounts.set(row.normalized.phone, (phoneCounts.get(row.normalized.phone) ?? 0) + 1);
    if (row.normalized.email) {
      emailCounts.set(row.normalized.email, (emailCounts.get(row.normalized.email) ?? 0) + 1);
    }
  });

  const duplicateChecks: Array<{ phone: { in: string[] } } | { email: { in: string[] } }> = [];

  if (phoneCounts.size > 0) {
    duplicateChecks.push({ phone: { in: [...phoneCounts.keys()] } });
  }

  if (emailCounts.size > 0) {
    duplicateChecks.push({ email: { in: [...emailCounts.keys()] } });
  }

  const existingLeads =
    duplicateChecks.length > 0
      ? await prisma.lead.findMany({
          where: { OR: duplicateChecks },
          select: { id: true, name: true, phone: true, email: true }
        })
      : [];

  const existingByPhone = new Map(existingLeads.map((lead) => [lead.phone, lead]));
  const existingByEmail = new Map(
    existingLeads
      .filter((lead) => lead.email)
      .map((lead) => [lead.email as string, lead])
  );

  previewRows.forEach((row) => {
    if (!row.normalized || row.status === "error") return;

    if ((phoneCounts.get(row.normalized.phone) ?? 0) > 1) {
      row.reasons.push("Duplicate phone found in uploaded file");
    }

    if (row.normalized.email && (emailCounts.get(row.normalized.email) ?? 0) > 1) {
      row.reasons.push("Duplicate email found in uploaded file");
    }

    const existingPhoneLead = existingByPhone.get(row.normalized.phone);
    if (existingPhoneLead) {
      row.reasons.push(`Phone already exists in CRM (${existingPhoneLead.name})`);
    }

    const existingEmailLead =
      row.normalized.email ? existingByEmail.get(row.normalized.email) : null;
    if (existingEmailLead) {
      row.reasons.push(`Email already exists in CRM (${existingEmailLead.name})`);
    }

    if (row.reasons.length > 0) {
      row.status = "duplicate";
    }
  });

  return {
    headers,
    rows: previewRows,
    summary: {
      totalRows: previewRows.length,
      readyRows: previewRows.filter((row) => row.status === "ready").length,
      duplicateRows: previewRows.filter((row) => row.status === "duplicate").length,
      errorRows: previewRows.filter((row) => row.status === "error").length
    }
  };
};

const buildAccessibleLeadWhere = (
  leadIds: number[] | null,
  reqUser: Express.UserPayload
) => {
  const baseWhere =
    reqUser.role === Role.COUNSELOR
      ? {
          OR: [{ assignedTo: reqUser.id }, { assignedTo: null }]
        }
      : {};

  return leadIds
    ? {
        ...baseWhere,
        id: { in: leadIds }
      }
    : baseWhere;
};

router.post(
  "/import/csv/preview",
  asyncHandler(async (req, res) => {
    const parsed = importCsvSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid CSV import payload",
        errors: parsed.error.flatten()
      });
    }

    try {
      const analysis = await analyzeCsvImport(parsed.data.csv);
      return res.json(analysis);
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : "Unable to parse CSV"
      });
    }
  })
);

router.post(
  "/import/csv/commit",
  asyncHandler(async (req, res) => {
    const parsed = importCsvSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid CSV import payload",
        errors: parsed.error.flatten()
      });
    }

    try {
      const analysis = await analyzeCsvImport(parsed.data.csv);
      const readyRows = analysis.rows.filter(
        (row): row is PreviewRow & { normalized: ParsedImportRow } =>
          row.status === "ready" && row.normalized !== null
      );

      if (readyRows.length === 0) {
        return res.status(400).json({
          message: "No valid leads available to import",
          ...analysis.summary
        });
      }

      const created = [];
      const skipped = [];

      for (const row of readyRows) {
        try {
          const lead = await prisma.lead.create({
            data: {
              name: row.normalized.name,
              phone: row.normalized.phone,
              email: row.normalized.email,
              address: row.normalized.address,
              parentContact: row.normalized.parentContact,
              course: row.normalized.course,
              source: row.normalized.source,
              status: row.normalized.status,
              priority: row.normalized.priority,
              nextFollowUp: row.normalized.nextFollowUp ? new Date(row.normalized.nextFollowUp) : null,
              assignedTo: req.user?.role === Role.COUNSELOR ? req.user.id : null
            },
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              status: true,
              priority: true
            }
          });
          created.push(lead);
        } catch (error) {
          skipped.push({
            rowNumber: row.rowNumber,
            name: row.normalized.name,
            reason: error instanceof Error ? error.message : "Unknown import error"
          });
        }
      }

      return res.status(201).json({
        message: `Imported ${created.length} lead${created.length === 1 ? "" : "s"}`,
        createdCount: created.length,
        skippedCount: skipped.length,
        duplicateCount: analysis.summary.duplicateRows,
        errorCount: analysis.summary.errorRows,
        created,
        skipped
      });
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : "Unable to import CSV"
      });
    }
  })
);

router.patch(
  "/leads",
  asyncHandler(async (req, res) => {
    const parsed = bulkUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid bulk update payload",
        errors: parsed.error.flatten()
      });
    }

    const { leadIds, updates } = parsed.data;

    if (
      req.user?.role === Role.COUNSELOR &&
      updates.assignedTo !== undefined &&
      updates.assignedTo !== req.user.id
    ) {
      return res.status(403).json({
        message: "Counselors can only assign leads to themselves"
      });
    }

    if (updates.assignedTo !== undefined && updates.assignedTo !== null) {
      const assignee = await prisma.user.findUnique({
        where: { id: updates.assignedTo },
        select: { id: true, role: true }
      });

      if (!assignee || ![Role.ADMIN, Role.COUNSELOR].includes(assignee.role)) {
        return res.status(400).json({ message: "Assigned user is invalid" });
      }
    }

    const accessibleWhere = buildAccessibleLeadWhere(leadIds, req.user!);
    const matchedLeadIds = await prisma.lead.findMany({
      where: accessibleWhere,
      select: { id: true }
    });

    if (matchedLeadIds.length === 0) {
      return res.status(404).json({ message: "No matching leads found" });
    }

    const updateData = {
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
      ...(updates.assignedTo !== undefined ? { assignedTo: updates.assignedTo } : {}),
      ...(updates.nextFollowUp !== undefined
        ? { nextFollowUp: updates.nextFollowUp ? new Date(updates.nextFollowUp) : null }
        : {})
    };

    const result = await prisma.lead.updateMany({
      where: {
        id: { in: matchedLeadIds.map((lead) => lead.id) }
      },
      data: updateData
    });

    return res.json({
      message: `Updated ${result.count} lead${result.count === 1 ? "" : "s"}`,
      updatedCount: result.count,
      requestedCount: leadIds.length,
      ignoredCount: leadIds.length - matchedLeadIds.length
    });
  })
);

router.post(
  "/export",
  asyncHandler(async (req, res) => {
    const parsed = exportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid export payload",
        errors: parsed.error.flatten()
      });
    }

    const validColumns = parsed.data.columns.filter((column): column is (typeof exportableColumns)[number] =>
      exportableColumns.includes(column as (typeof exportableColumns)[number])
    );

    if (validColumns.length === 0) {
      return res.status(400).json({ message: "No valid export columns selected" });
    }

    const where = {
      ...buildAccessibleLeadWhere(null, req.user!),
      ...(parsed.data.filters?.status ? { status: parsed.data.filters.status } : {}),
      ...(parsed.data.filters?.priority ? { priority: parsed.data.filters.priority } : {}),
      ...(parsed.data.filters?.assignedTo !== undefined
        ? { assignedTo: parsed.data.filters.assignedTo }
        : {})
    };

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedCounselor: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const headerLabels: Record<(typeof exportableColumns)[number], string> = {
      sr_no: "sr_no",
      name: "name",
      phone: "phone",
      email: "email",
      address: "address",
      parent_contact: "parent_contact",
      course: "course",
      source: "source",
      status: "status",
      priority: "priority",
      next_follow_up: "next_follow_up",
      assigned_counselor: "assigned_counselor",
      created_at: "created_at",
      updated_at: "updated_at"
    };

    const csvRows: Array<Array<string | number | null | undefined>> = [
      validColumns.map((column) => headerLabels[column])
    ];

    leads.forEach((lead, index) => {
      csvRows.push(
        validColumns.map((column) => {
          switch (column) {
            case "sr_no":
              return index + 1;
            case "name":
              return lead.name;
            case "phone":
              return lead.phone;
            case "email":
              return lead.email;
            case "address":
              return lead.address;
            case "parent_contact":
              return lead.parentContact;
            case "course":
              return lead.course;
            case "source":
              return lead.source;
            case "status":
              return lead.status;
            case "priority":
              return lead.priority;
            case "next_follow_up":
              return lead.nextFollowUp?.toISOString() ?? null;
            case "assigned_counselor":
              return lead.assignedCounselor?.name ?? null;
            case "created_at":
              return lead.createdAt.toISOString();
            case "updated_at":
              return lead.updatedAt.toISOString();
            default:
              return null;
          }
        })
      );
    });

    return res.json({
      filename: `enrollix-leads-${new Date().toISOString().slice(0, 10)}.csv`,
      totalRows: leads.length,
      csv: buildCsv(csvRows)
    });
  })
);

export default router;
