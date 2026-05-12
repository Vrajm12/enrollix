import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const emailArg = process.argv[2];
  if (!emailArg?.trim()) {
    throw new Error("Usage: npm run promote:superadmin -- <email>");
  }
  const email = emailArg.toLowerCase().trim();

  const user = await prisma.user.findFirst({
    where: { email }
  });

  if (!user) {
    throw new Error(`No user found with email: ${email}`);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: "SUPER_ADMIN" }
  });

  console.log(`Promoted ${updated.email} to SUPER_ADMIN (user id: ${updated.id})`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
