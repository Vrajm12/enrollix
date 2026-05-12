import "dotenv/config";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "../src/prisma.js";

const getRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const SUPERADMIN_EMAIL = process.env.SEED_SUPERADMIN_EMAIL?.trim() ?? "superadmin@crm.local";
const SUPERADMIN_PASSWORD = getRequiredEnv("SEED_SUPERADMIN_PASSWORD");
const SUPERADMIN_NAME = process.env.SEED_SUPERADMIN_NAME?.trim() ?? "Super Admin";
const DEFAULT_ADMIN_EMAIL = process.env.SEED_DEFAULT_ADMIN_EMAIL?.trim() ?? "admin@crm.local";
const DEFAULT_COUNSELOR_EMAIL = process.env.SEED_DEFAULT_COUNSELOR_EMAIL?.trim() ?? "counselor@crm.local";
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD?.trim();

async function seed() {
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: "default-tenant" },
    update: {
      isActive: true,
    },
    create: {
      name: "Default Tenant",
      slug: "default-tenant",
      description: "Default local tenant",
      maxUsers: 100,
      isActive: true,
      courseOptions: [],
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: "platform" },
    update: {
      isActive: true,
    },
    create: {
      name: "Platform",
      slug: "platform",
      description: "System tenant for platform administration",
      maxUsers: 100,
      isActive: true,
      courseOptions: [],
    },
  });

  const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
  const hashedDefaultPassword = DEFAULT_PASSWORD
    ? await bcrypt.hash(DEFAULT_PASSWORD, 10)
    : null;

  const superadmin = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: SUPERADMIN_EMAIL.toLowerCase(),
      },
    },
    update: {
      name: SUPERADMIN_NAME,
      role: Role.SUPER_ADMIN,
      password: hashedPassword,
    },
    create: {
      tenantId: tenant.id,
      name: SUPERADMIN_NAME,
      email: SUPERADMIN_EMAIL.toLowerCase(),
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
    },
  });

  let adminUser: { email: string; role: Role } | null = null;
  let counselorUser: { email: string; role: Role } | null = null;

  if (hashedDefaultPassword) {
    adminUser = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: defaultTenant.id,
          email: DEFAULT_ADMIN_EMAIL,
        },
      },
      update: {
        name: "Default Admin",
        role: Role.TENANT_ADMIN,
        password: hashedDefaultPassword,
      },
      create: {
        tenantId: defaultTenant.id,
        name: "Default Admin",
        email: DEFAULT_ADMIN_EMAIL,
        password: hashedDefaultPassword,
        role: Role.TENANT_ADMIN,
      },
      select: {
        email: true,
        role: true
      }
    });

    counselorUser = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: defaultTenant.id,
          email: DEFAULT_COUNSELOR_EMAIL,
        },
      },
      update: {
        name: "Default Counselor",
        role: Role.COUNSELOR,
        password: hashedDefaultPassword,
      },
      create: {
        tenantId: defaultTenant.id,
        name: "Default Counselor",
        email: DEFAULT_COUNSELOR_EMAIL,
        password: hashedDefaultPassword,
        role: Role.COUNSELOR,
      },
      select: {
        email: true,
        role: true
      }
    });
  }

  // eslint-disable-next-line no-console
  console.log("Seed complete:");
  // eslint-disable-next-line no-console
  console.log(`- Tenant: ${defaultTenant.name} (${defaultTenant.slug})`);
  // eslint-disable-next-line no-console
  if (adminUser && counselorUser) {
    // eslint-disable-next-line no-console
    console.log(`- Admin: ${adminUser.email} (${adminUser.role})`);
    // eslint-disable-next-line no-console
    console.log(`- Counselor: ${counselorUser.email} (${counselorUser.role})`);
  } else {
    // eslint-disable-next-line no-console
    console.log("- Default tenant users skipped (set SEED_DEFAULT_PASSWORD to create admin/counselor)");
  }
  // eslint-disable-next-line no-console
  console.log(`- Tenant: ${tenant.name} (${tenant.slug})`);
  // eslint-disable-next-line no-console
  console.log(`- Superadmin: ${superadmin.email} (${superadmin.role})`);
}

seed()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
