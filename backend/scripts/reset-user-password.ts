import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Args = {
  email?: string;
  password?: string;
};

const parseArgs = (argv: string[]): Args => {
  const args: Args = {};

  for (const arg of argv) {
    if (arg.startsWith("--email=")) {
      args.email = arg.slice("--email=".length).trim().toLowerCase();
      continue;
    }
    if (arg.startsWith("--password=")) {
      args.password = arg.slice("--password=".length);
    }
  }

  return args;
};

async function main() {
  const cli = parseArgs(process.argv.slice(2));
  const email = (cli.email ?? process.env.SEED_SUPERADMIN_EMAIL ?? "").trim().toLowerCase();
  const newPassword = cli.password ?? process.env.SEED_SUPERADMIN_PASSWORD ?? "";

  if (!process.env.SEED_SUPERADMIN_EMAIL && !cli.email) {
    throw new Error(
      "Missing SEED_SUPERADMIN_EMAIL in environment. Set it in backend/.env or pass --email=<value>."
    );
  }

  if (!process.env.SEED_SUPERADMIN_PASSWORD && !cli.password) {
    throw new Error(
      "Missing SEED_SUPERADMIN_PASSWORD in environment. Set it in backend/.env or pass --password=<value>."
    );
  }

  if (!email || !newPassword) {
    throw new Error(
      "Usage: npm run reset:user-password OR npm run reset:user-password -- --email=<email> --password=<password>"
    );
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

  console.log(`Password reset successful for ${email} (role unchanged: ${user.role}).`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
