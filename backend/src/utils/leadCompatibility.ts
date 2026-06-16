import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

let remarksColumnExists: boolean | null = null;
let remarksColumnCheck: Promise<boolean> | null = null;

export const hasLeadRemarksColumn = async () => {
  if (remarksColumnExists !== null) {
    return remarksColumnExists;
  }

  if (!remarksColumnCheck) {
    remarksColumnCheck = prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'leads'
          AND column_name = 'remarks'
      ) AS "exists"
    `
      .then((rows) => Boolean(rows[0]?.exists))
      .catch(() => false);
  }

  remarksColumnExists = await remarksColumnCheck;
  return remarksColumnExists;
};

const leadBaseSelect = {
  id: true,
  tenantId: true,
  name: true,
  phone: true,
  email: true,
  address: true,
  region: true,
  city: true,
  locality: true,
  pincode: true,
  studentCasteCategory: true,
  parentContact: true,
  course: true,
  source: true,
  campaign: true,
  medium: true,
  partnerSource: true,
  status: true,
  priority: true,
  nextFollowUp: true,
  assignedTo: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.LeadSelect;

type LeadSelectOptions = {
  includeAssignedCounselor?: boolean;
  includeRemarks?: boolean;
};

export const buildLeadSelect = async ({
  includeAssignedCounselor = false,
  includeRemarks = false
}: LeadSelectOptions = {}) => {
  const remarksSupported = includeRemarks ? await hasLeadRemarksColumn() : false;

  return {
    ...leadBaseSelect,
    ...(remarksSupported ? { remarks: true } : {}),
    ...(includeAssignedCounselor
      ? {
          assignedCounselor: {
            select: { id: true, name: true, email: true }
          }
        }
      : {})
  } satisfies Prisma.LeadSelect;
};

