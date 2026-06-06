import "dotenv/config";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/prisma.js";

type Options = {
  tenantSlug: string;
  email: string;
  startLeadNumber: number;
  endLeadNumber: number;
  pincode?: string;
  source?: string;
  onlyUnassigned: boolean;
  apply: boolean;
};

const readOption = (args: string[], name: string) => {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();

  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1]?.trim();
  return undefined;
};

const readPositiveInt = (args: string[], name: string, fallback?: number) => {
  const raw = readOption(args, name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${name} must be a positive integer`);
  }
  return value;
};

const parseOptions = (): Options => {
  const args = process.argv.slice(2);
  const tenantSlug = readOption(args, "tenantSlug")?.toLowerCase();
  const email = readOption(args, "email")?.toLowerCase();
  const count = readPositiveInt(args, "count");
  const startLeadNumber = readPositiveInt(args, "start", 1)!;
  const endLeadNumber = readPositiveInt(args, "end", count ? startLeadNumber + count - 1 : undefined);

  if (!tenantSlug) throw new Error("--tenantSlug is required");
  if (!email) throw new Error("--email is required");
  if (!endLeadNumber) throw new Error("--end or --count is required");
  if (endLeadNumber < startLeadNumber) {
    throw new Error("--end must be greater than or equal to --start");
  }

  return {
    tenantSlug,
    email,
    startLeadNumber,
    endLeadNumber,
    pincode: readOption(args, "pincode"),
    source: readOption(args, "source"),
    onlyUnassigned: !args.includes("--includeAssigned"),
    apply: args.includes("--apply")
  };
};

const main = async () => {
  const options = parseOptions();

  const tenant = await prisma.tenant.findUnique({
    where: { slug: options.tenantSlug },
    select: { id: true, name: true, slug: true }
  });
  if (!tenant) throw new Error(`Tenant not found for slug ${options.tenantSlug}`);

  const user = await prisma.user.findFirst({
    where: {
      tenantId: tenant.id,
      email: { equals: options.email, mode: "insensitive" }
    },
    select: { id: true, name: true, email: true, role: true }
  });
  if (!user) throw new Error(`User ${options.email} not found in tenant ${tenant.slug}`);

  const scopeWhere: Prisma.LeadWhereInput = {
    tenantId: tenant.id,
    ...(options.pincode ? { pincode: options.pincode } : {}),
    ...(options.source ? { source: options.source } : {}),
    ...(options.onlyUnassigned ? { assignedTo: null } : {})
  };

  const [currentlyAssigned, scopedLeads] = await Promise.all([
    prisma.lead.count({
      where: {
        tenantId: tenant.id,
        assignedTo: user.id
      }
    }),
    prisma.lead.count({ where: scopeWhere })
  ]);

  if (options.startLeadNumber > scopedLeads) {
    throw new Error(`Start lead number exceeds scoped lead count (${scopedLeads})`);
  }

  const normalizedEnd = Math.min(options.endLeadNumber, scopedLeads);
  const targetLeads = await prisma.lead.findMany({
    where: scopeWhere,
    select: { id: true },
    orderBy: { id: "asc" },
    skip: options.startLeadNumber - 1,
    take: normalizedEnd - options.startLeadNumber + 1
  });
  const targetLeadIds = targetLeads.map((lead) => lead.id);

  console.log("Lead assignment repair");
  console.log(`- Tenant: ${tenant.name} (${tenant.slug}, id ${tenant.id})`);
  console.log(`- User: ${user.name} <${user.email}> (${user.role}, id ${user.id})`);
  console.log(`- Currently assigned to user: ${currentlyAssigned}`);
  console.log(`- Scoped leads: ${scopedLeads}`);
  console.log(`- Scope filters: pincode=${options.pincode ?? "any"}, source=${options.source ?? "any"}, onlyUnassigned=${options.onlyUnassigned}`);
  console.log(`- Requested range: ${options.startLeadNumber}-${options.endLeadNumber}`);
  console.log(`- Normalized range: ${options.startLeadNumber}-${normalizedEnd}`);
  console.log(`- Target leads selected: ${targetLeadIds.length}`);

  if (!options.apply) {
    console.log("- Dry run only. Re-run with --apply to update these leads.");
    return;
  }

  const result = targetLeadIds.length === 0
    ? { count: 0 }
    : await prisma.lead.updateMany({
        where: {
          tenantId: tenant.id,
          id: { in: targetLeadIds }
        },
        data: { assignedTo: user.id }
      });

  console.log(`- Updated leads: ${result.count}`);
};

main()
  .catch((error) => {
    console.error("Repair failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
