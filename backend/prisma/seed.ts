import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "../src/prisma.js";

const SUPERADMIN_EMAIL = "veerajmatnale@gmail.com";
const SUPERADMIN_PASSWORD = "Veeraj@2026!CRM";
const SUPERADMIN_NAME = "Veeraj Super Admin";

async function seed() {
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

  // eslint-disable-next-line no-console
  console.log("Seed complete:");
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
