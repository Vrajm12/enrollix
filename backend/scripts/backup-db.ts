import "dotenv/config";
import { createDatabaseBackup, pruneOldBackups } from "../src/services/backupService.js";
import { prisma } from "../src/prisma.js";

const main = async () => {
  const backup = await createDatabaseBackup({
    createdByUserId: null,
    auditTenantId: 0,
    notes: "Scheduled database backup"
  });
  const prunedCount = await pruneOldBackups(180);

  console.log("Database backup complete");
  console.log(`- Backup ID: ${backup.id}`);
  console.log(`- Filename: ${backup.filename}`);
  console.log(`- Size: ${backup.fileSize} bytes`);
  console.log(`- Checksum: ${backup.checksum ?? "-"}`);
  console.log(`- Pruned old backups: ${prunedCount}`);
};

main()
  .catch((error) => {
    console.error("Database backup failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
