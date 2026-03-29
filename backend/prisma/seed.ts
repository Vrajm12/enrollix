import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "../src/prisma.js";

async function seed() {
  const defaultPassword = await bcrypt.hash("Password@123", 10);

  await prisma.user.upsert({
    where: { email: "admin@crm.local" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@crm.local",
      password: defaultPassword,
      role: Role.ADMIN
    }
  });

  await prisma.user.upsert({
    where: { email: "counselor@crm.local" },
    update: {},
    create: {
      name: "Counselor User",
      email: "counselor@crm.local",
      password: defaultPassword,
      role: Role.COUNSELOR
    }
  });

  // eslint-disable-next-line no-console
  console.log("Seed complete.");
  // eslint-disable-next-line no-console
  console.log("Admin: admin@crm.local / Password@123");
  // eslint-disable-next-line no-console
  console.log("Counselor: counselor@crm.local / Password@123");
}

seed()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
