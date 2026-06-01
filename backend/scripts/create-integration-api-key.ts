import { randomBytes, createHash } from "crypto";
import { prisma } from "../src/prisma.js";

const args = process.argv.slice(2);

const getArg = (name: string) => {
  const direct = args.find((item) => item.startsWith(`--${name}=`));
  if (direct) return direct.split("=")[1];

  const index = args.findIndex((item) => item === `--${name}`);
  if (index >= 0 && args[index + 1]) return args[index + 1];

  return undefined;
};

const tenantSlug = getArg("tenantSlug");
const partner = getArg("partner")?.toLowerCase();
const name = getArg("name") ?? null;
const rateLimitPerMinRaw = getArg("rateLimitPerMin");
const plainKeyInput = getArg("plainKey");

if (!tenantSlug || !partner) {
  console.error("Usage: tsx scripts/create-integration-api-key.ts --tenantSlug=<tenant-slug> --partner=<partner> [--name=Label] [--rateLimitPerMin=60] [--plainKey=<custom key>]");
  process.exit(1);
}

const rateLimitPerMin = Number(rateLimitPerMinRaw ?? "60");
if (!Number.isFinite(rateLimitPerMin) || rateLimitPerMin <= 0) {
  console.error("rateLimitPerMin must be a positive number");
  process.exit(1);
}

const isValidSlug = /^[a-z0-9-]+$/.test(tenantSlug);
if (!isValidSlug) {
  console.error("tenantSlug must match /^[a-z0-9-]+$/");
  process.exit(1);
}

const isValidPartner = /^[a-z0-9-]+$/.test(partner);
if (!isValidPartner) {
  console.error("partner must match /^[a-z0-9-]+$/");
  process.exit(1);
}

const plainKey = plainKeyInput?.trim() || `gv_${partner}_${randomBytes(24).toString("hex")}`;
const apiKeyHash = createHash("sha256").update(plainKey).digest("hex");
const apiKeyPrefix = plainKey.slice(0, 8);

const run = async () => {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug, isActive: true },
    select: { id: true, name: true, slug: true }
  });

  if (!tenant) {
    console.error(`Active tenant not found for slug: ${tenantSlug}`);
    process.exit(1);
  }

  const created = await prisma.integrationApiKey.create({
    data: {
      tenantId: tenant.id,
      partner,
      name,
      apiKeyHash,
      apiKeyPrefix,
      rateLimitPerMin
    },
    select: {
      id: true,
      tenantId: true,
      partner: true,
      name: true,
      apiKeyPrefix: true,
      rateLimitPerMin: true,
      createdAt: true
    }
  });

  console.log("Integration API key created successfully");
  console.log(JSON.stringify({
    tenant,
    keyId: created.id,
    partner: created.partner,
    name: created.name,
    apiKeyPrefix: created.apiKeyPrefix,
    rateLimitPerMin: created.rateLimitPerMin,
    plainApiKey: plainKey,
    createdAt: created.createdAt
  }, null, 2));
};

run()
  .catch((error) => {
    console.error("Failed to create integration API key", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
