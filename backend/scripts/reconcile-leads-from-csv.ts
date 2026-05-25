import fs from "node:fs";
import { Readable } from "node:stream";
import csvParser from "csv-parser";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CanonicalHeader =
  | "name"
  | "phone"
  | "email"
  | "location"
  | "state"
  | "city"
  | "pincode";

const headerAliases: Record<string, CanonicalHeader> = {
  name: "name",
  full_name: "name",
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
  location: "location",
  state: "state",
  region: "state",
  city: "city",
  district: "city",
  town: "city",
  village: "city",
  pincode: "pincode",
  pin: "pincode",
  pin_code: "pincode",
  postal_code: "pincode",
  zip: "pincode",
  zipcode: "pincode"
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

const normalizePhone = (value: string | null | undefined) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length > 10) return digits.slice(-10);
  return null;
};

const normalizePincode = (value: string | null | undefined) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 6 ? digits.slice(0, 6) : null;
};

const nonEmpty = (value: string | null | undefined) => {
  const v = value?.trim();
  return v ? v : null;
};

const toTitle = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const parseArgs = () => {
  const args = process.argv.slice(2);
  const fileArg = args.find((arg) => arg.startsWith("--file="));
  const tenantSlugArg = args.find((arg) => arg.startsWith("--tenantSlug="));
  const tenantIdArg = args.find((arg) => arg.startsWith("--tenantId="));
  const file = fileArg?.split("=")[1];
  const tenantSlug = tenantSlugArg?.split("=")[1];
  const tenantIdRaw = tenantIdArg?.split("=")[1];
  const tenantId = tenantIdRaw ? Number(tenantIdRaw) : undefined;
  if (!file) {
    throw new Error("Missing required argument: --file=/path/to/file.csv");
  }
  return {
    file,
    tenantSlug: tenantSlug?.trim().toLowerCase() || undefined,
    tenantId: Number.isFinite(tenantId) ? tenantId : undefined
  };
};

async function main() {
  const args = parseArgs();
  if (!fs.existsSync(args.file)) {
    throw new Error(`CSV file not found: ${args.file}`);
  }

  let tenantId = args.tenantId;
  if (!tenantId && args.tenantSlug) {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: args.tenantSlug },
      select: { id: true }
    });
    if (!tenant) throw new Error(`Tenant slug "${args.tenantSlug}" not found`);
    tenantId = tenant.id;
  }
  if (!tenantId) throw new Error("Provide --tenantSlug or --tenantId");

  const leads = await prisma.lead.findMany({
    where: { tenantId },
    select: { id: true, phone: true, email: true, name: true, city: true, region: true, pincode: true }
  });

  const byPhone = new Map<string, number>();
  const byEmail = new Map<string, number>();
  for (const lead of leads) {
    const phone = normalizePhone(lead.phone);
    if (phone && !byPhone.has(phone)) byPhone.set(phone, lead.id);
    if (lead.email && !byEmail.has(lead.email.toLowerCase())) byEmail.set(lead.email.toLowerCase(), lead.id);
  }

  const parser = csvParser({ mapHeaders: ({ header }) => header?.trim?.() ?? header });
  const rawCsv = fs.readFileSync(args.file, "utf-8");
  const stream = Readable.from([rawCsv]).pipe(parser);

  let rawHeaders: string[] = [];
  let mapped = new Map<CanonicalHeader, string>();
  let initialized = false;
  let scanned = 0;
  let matched = 0;
  let updated = 0;

  for await (const row of stream as AsyncIterable<Record<string, string>>) {
    if (!initialized) {
      rawHeaders = Object.keys(row);
      mapped = new Map<CanonicalHeader, string>();
      for (const h of rawHeaders) {
        const n = normalizeHeader(h);
        if (n && !mapped.has(n)) mapped.set(n, h);
      }
      initialized = true;
    }

    scanned += 1;
    const get = (h: CanonicalHeader) => {
      const key = mapped.get(h);
      return key ? String(row[key] ?? "").trim() : "";
    };

    const phone = normalizePhone(get("phone"));
    const email = nonEmpty(get("email"))?.toLowerCase() ?? null;
    const pincode = normalizePincode(get("pincode"));
    const state = nonEmpty(get("state"));
    const city = nonEmpty(get("city")) ?? nonEmpty(get("location"));

    let leadId: number | undefined;
    if (phone) leadId = byPhone.get(phone);
    if (!leadId && email) leadId = byEmail.get(email);
    if (!leadId) continue;
    matched += 1;

    const existing = leads.find((l) => l.id === leadId);
    if (!existing) continue;

    const nextCity = city ? toTitle(city) : existing.city;
    const nextRegion = state ? toTitle(state) : existing.region;
    const nextPincode = pincode ?? existing.pincode;

    const changed =
      (nextCity ?? null) !== (existing.city ?? null) ||
      (nextRegion ?? null) !== (existing.region ?? null) ||
      (nextPincode ?? null) !== (existing.pincode ?? null);

    if (!changed) continue;

    // eslint-disable-next-line no-await-in-loop
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        city: nextCity ?? null,
        region: nextRegion ?? null,
        pincode: nextPincode ?? null
      }
    });
    updated += 1;
  }

  console.log(`CSV scanned: ${scanned}`);
  console.log(`Matched leads: ${matched}`);
  console.log(`Updated leads: ${updated}`);
}

main()
  .catch((error) => {
    console.error("CSV reconciliation failed:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

