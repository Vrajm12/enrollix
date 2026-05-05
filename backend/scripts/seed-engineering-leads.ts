import { LeadStatus, Priority, Role } from "@prisma/client";
import { prisma } from "../src/prisma.js";

type Args = {
  tenantId?: number;
  count: number;
};

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Arjun", "Ishaan", "Krishna", "Rohan", "Kunal", "Priya", "Ananya",
  "Aditi", "Sneha", "Neha", "Kavya", "Ira", "Saanvi", "Meera", "Diya", "Nisha", "Ritika"
];

const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Gupta", "Iyer", "Reddy", "Nair", "Mehta", "Singh", "Kumar",
  "Joshi", "Chopra", "Bose", "Kapoor", "Mishra", "Agarwal", "Tiwari", "Das", "Saxena", "Bhat"
];

const COURSES = [
  "B.Tech Computer Science",
  "B.Tech Information Technology",
  "B.Tech Electronics and Communication",
  "B.Tech Electrical Engineering",
  "B.Tech Mechanical Engineering",
  "B.Tech Civil Engineering",
  "B.Tech Artificial Intelligence & Data Science",
  "B.Tech Cyber Security",
  "B.Tech Robotics and Automation",
  "B.Tech Biotechnology"
];

const SOURCES = [
  "Google Ads",
  "Instagram Campaign",
  "Facebook Lead Form",
  "Education Fair",
  "School Seminar",
  "Referral",
  "WhatsApp Campaign",
  "Website Inquiry",
  "YouTube Ad",
  "Walk-in"
];

function parseArgs(argv: string[]): Args {
  let count = 500;
  let tenantId: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--count") {
      const value = Number(argv[i + 1]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error("Invalid --count value. Use a positive number.");
      }
      count = Math.floor(value);
      i++;
    } else if (arg === "--tenantId") {
      const value = Number(argv[i + 1]);
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error("Invalid --tenantId value. Use a positive integer.");
      }
      tenantId = value;
      i++;
    }
  }

  return { count, tenantId };
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedStatus(): LeadStatus {
  const r = Math.random();
  if (r < 0.40) return LeadStatus.LEAD;
  if (r < 0.63) return LeadStatus.CONTACTED;
  if (r < 0.78) return LeadStatus.INTERESTED;
  if (r < 0.90) return LeadStatus.QUALIFIED;
  if (r < 0.97) return LeadStatus.APPLIED;
  return LeadStatus.ENROLLED;
}

function weightedPriority(): Priority {
  const r = Math.random();
  if (r < 0.50) return Priority.COLD;
  if (r < 0.85) return Priority.WARM;
  return Priority.HOT;
}

function randomDateInLastDays(days: number): Date {
  const now = Date.now();
  const offset = Math.floor(Math.random() * days * 24 * 60 * 60 * 1000);
  return new Date(now - offset);
}

function randomFollowUpAroundNow(): Date {
  const now = Date.now();
  const windowMs = 30 * 24 * 60 * 60 * 1000;
  const offset = Math.floor((Math.random() * 2 - 1) * windowMs);
  return new Date(now + offset);
}

function makeLead(index: number, tenantId: number, assignedTo: number | null) {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  const createdAt = randomDateInLastDays(180);

  return {
    tenantId,
    name,
    phone: `9${String(100000000 + index).slice(-9)}`,
    email: `${firstName}.${lastName}.${index}@studentmail.in`.toLowerCase(),
    address: `Sector ${1 + (index % 50)}, City Campus Zone`,
    parentContact: `8${String(200000000 + index).slice(-9)}`,
    course: pick(COURSES),
    source: pick(SOURCES),
    status: weightedStatus(),
    priority: weightedPriority(),
    nextFollowUp: randomFollowUpAroundNow(),
    assignedTo,
    createdAt,
    updatedAt: new Date(createdAt.getTime() + Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000)
  };
}

async function resolveTenantId(explicitTenantId?: number): Promise<number> {
  if (explicitTenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: explicitTenantId } });
    if (!tenant) {
      throw new Error(`Tenant ${explicitTenantId} not found.`);
    }
    return tenant.id;
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug: { not: "platform" }, isActive: true },
    orderBy: { id: "asc" }
  });

  if (tenant) return tenant.id;

  const fallback = await prisma.tenant.findFirst({ orderBy: { id: "asc" } });
  if (!fallback) {
    throw new Error("No tenant found. Create a tenant first.");
  }

  return fallback.id;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tenantId = await resolveTenantId(args.tenantId);

  const assignableUsers = await prisma.user.findMany({
    where: {
      tenantId,
      role: { in: [Role.COUNSELOR, Role.ADMIN, Role.TENANT_ADMIN] }
    },
    select: { id: true }
  });

  const leads = Array.from({ length: args.count }, (_, i) => {
    const assigned = assignableUsers.length > 0 ? pick(assignableUsers).id : null;
    return makeLead(i + 1, tenantId, assigned);
  });

  const batchSize = 200;
  let inserted = 0;

  for (let i = 0; i < leads.length; i += batchSize) {
    const chunk = leads.slice(i, i + batchSize);
    const result = await prisma.lead.createMany({ data: chunk });
    inserted += result.count;
  }

  const totalLeadsForTenant = await prisma.lead.count({ where: { tenantId } });

  console.log(`Inserted ${inserted} simulated engineering leads for tenant ${tenantId}.`);
  console.log(`Tenant ${tenantId} now has ${totalLeadsForTenant} total leads.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
