import { prisma } from "../src/prisma.js";

async function seed() {
  // No demo data - use setup-superadmin.js to create real users
  // eslint-disable-next-line no-console
  console.log("✅ Database ready. Run: node setup-superadmin.js");
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
