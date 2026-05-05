import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] || "").trim().toLowerCase();
  const newPassword = process.argv[3] || "";

  if (!email || !newPassword) {
    throw new Error("Usage: npm run reset:user-password -- <email> <newPassword>");
  }

  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    throw new Error(`User not found for email: ${email}`);
  }

  const password = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password }
  });

  console.log(`Password updated for ${email}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
