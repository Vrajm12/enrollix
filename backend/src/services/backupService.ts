import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BackupStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { env } from "../config.js";

const execFileAsync = promisify(execFile);
const BACKUP_FILENAME_PATTERN = /^(guruverse_backup|pre_restore_backup)_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.sql$/;
const RESTORE_CONFIRMATION = "RESTORE GURUVERSE DATABASE";

export const getRestoreConfirmationText = () => RESTORE_CONFIRMATION;

const timestampForFilename = () => {
  const value = new Date().toISOString().replace("T", "_").replace(/\..+$/, "");
  return value.replace(/:/g, "-");
};

const safeBackupDir = () => path.resolve(env.BACKUP_DIR);

const buildBackupPath = (filename: string) => {
  if (!BACKUP_FILENAME_PATTERN.test(filename)) {
    throw new Error("Invalid backup filename");
  }
  const backupDir = safeBackupDir();
  const resolved = path.resolve(backupDir, filename);
  if (!resolved.startsWith(`${backupDir}${path.sep}`)) {
    throw new Error("Invalid backup path");
  }
  return resolved;
};

const sanitizeRecord = (record: {
  id: number;
  filename: string;
  fileSize: bigint | number;
  status: BackupStatus;
  createdByUserId: number | null;
  restoredByUserId: number | null;
  createdAt: Date;
  restoredAt: Date | null;
  notes: string | null;
  checksum: string | null;
}) => ({
  id: record.id,
  filename: record.filename,
  fileSize: Number(record.fileSize),
  status: record.status,
  createdByUserId: record.createdByUserId,
  restoredByUserId: record.restoredByUserId,
  createdAt: record.createdAt,
  restoredAt: record.restoredAt,
  notes: record.notes,
  checksum: record.checksum
});

export type SafeBackupRecord = ReturnType<typeof sanitizeRecord>;

export const toSafeBackupRecord = sanitizeRecord;

const runCommand = async (command: string, args: string[]) => {
  try {
    await execFileAsync(command, args, {
      env: process.env,
      windowsHide: true,
      maxBuffer: 1024 * 1024
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${command} failed: ${message}`);
  }
};

const fileChecksum = async (filePath: string) =>
  new Promise<string>((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });

const logBackupAudit = async (params: {
  action: string;
  userId: number | null;
  tenantId: number;
  recordId?: number | null;
  status: "SUCCESS" | "FAILURE";
  details?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}) => {
  await prisma.securityEvent.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.action,
      resource: "DatabaseBackup",
      resourceId: params.recordId ?? null,
      status: params.status,
      details: params.details ?? {},
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null
    }
  }).catch((error) => {
    console.error("Failed to write backup audit log:", error);
  });
};

export const createDatabaseBackup = async (params: {
  createdByUserId: number | null;
  auditTenantId: number;
  prefix?: "guruverse_backup" | "pre_restore_backup";
  notes?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) => {
  const backupDir = safeBackupDir();
  await mkdir(backupDir, { recursive: true, mode: 0o700 });

  const prefix = params.prefix ?? "guruverse_backup";
  const filename = `${prefix}_${timestampForFilename()}.sql`;
  const filePath = buildBackupPath(filename);

  const record = await prisma.backupRecord.create({
    data: {
      filename,
      filePath,
      fileSize: 0,
      status: BackupStatus.FAILED,
      createdByUserId: params.createdByUserId,
      notes: params.notes ?? null
    }
  });

  try {
    await runCommand("pg_dump", [
      "--dbname",
      env.DATABASE_URL,
      "--file",
      filePath,
      "--format",
      "p",
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-privileges"
    ]);

    const info = await stat(filePath);
    const checksum = await fileChecksum(filePath);
    const updated = await prisma.backupRecord.update({
      where: { id: record.id },
      data: {
        fileSize: info.size,
        checksum,
        status: BackupStatus.CREATED
      }
    });

    await logBackupAudit({
      action: "BACKUP_CREATED",
      userId: params.createdByUserId,
      tenantId: params.auditTenantId,
      recordId: updated.id,
      status: "SUCCESS",
      details: { filename: updated.filename, fileSize: Number(updated.fileSize), checksum },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });

    return sanitizeRecord(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed";
    const failed = await prisma.backupRecord.update({
      where: { id: record.id },
      data: {
        status: BackupStatus.FAILED,
        notes: params.notes ? `${params.notes}\n${message}` : message
      }
    });

    await logBackupAudit({
      action: "BACKUP_FAILED",
      userId: params.createdByUserId,
      tenantId: params.auditTenantId,
      recordId: failed.id,
      status: "FAILURE",
      details: { filename: failed.filename, error: message },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });

    throw error;
  }
};

export const listBackups = async () => {
  const records = await prisma.backupRecord.findMany({
    where: { status: { not: BackupStatus.DELETED } },
    orderBy: { createdAt: "desc" }
  });
  return records.map(sanitizeRecord);
};

export const getBackupForFileAccess = async (id: number) => {
  const record = await prisma.backupRecord.findUnique({ where: { id } });
  if (!record || record.status === BackupStatus.DELETED) return null;
  const backupDir = safeBackupDir();
  const resolved = path.resolve(record.filePath);
  if (!BACKUP_FILENAME_PATTERN.test(record.filename) || !resolved.startsWith(`${backupDir}${path.sep}`)) {
    throw new Error("Backup file path failed safety validation");
  }
  return record;
};

export const restoreDatabaseBackup = async (params: {
  backupId: number;
  restoredByUserId: number;
  auditTenantId: number;
  confirmationText: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) => {
  if (params.confirmationText !== RESTORE_CONFIRMATION) {
    throw new Error(`Confirmation text must be exactly: ${RESTORE_CONFIRMATION}`);
  }

  const record = await getBackupForFileAccess(params.backupId);
  if (!record) {
    throw new Error("Backup not found");
  }
  if (record.status !== BackupStatus.CREATED && record.status !== BackupStatus.RESTORED) {
    throw new Error("Only created backups can be restored");
  }

  const preRestoreBackup = await createDatabaseBackup({
    createdByUserId: params.restoredByUserId,
    auditTenantId: params.auditTenantId,
    prefix: "pre_restore_backup",
    notes: `Automatic pre-restore backup before restoring ${record.filename}`,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent
  });

  try {
    await runCommand("psql", [
      env.DATABASE_URL,
      "--set",
      "ON_ERROR_STOP=on",
      "--file",
      record.filePath
    ]);

    const restored = await prisma.backupRecord.upsert({
      where: { id: record.id },
      create: {
        id: record.id,
        filename: record.filename,
        filePath: record.filePath,
        fileSize: record.fileSize,
        checksum: record.checksum,
        status: BackupStatus.RESTORED,
        createdByUserId: record.createdByUserId,
        restoredByUserId: params.restoredByUserId,
        restoredAt: new Date(),
        notes: "Restored after database reload"
      },
      update: {
        status: BackupStatus.RESTORED,
        restoredByUserId: params.restoredByUserId,
        restoredAt: new Date()
      }
    });

    await logBackupAudit({
      action: "BACKUP_RESTORED",
      userId: params.restoredByUserId,
      tenantId: params.auditTenantId,
      recordId: restored.id,
      status: "SUCCESS",
      details: { filename: record.filename, preRestoreBackupId: preRestoreBackup.id },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });

    return {
      restored: sanitizeRecord(restored),
      preRestoreBackup,
      restartRequired: true,
      message: "Restore completed. Backend restart may be required."
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Restore failed";
    await prisma.backupRecord.update({
      where: { id: record.id },
      data: {
        status: BackupStatus.RESTORE_FAILED,
        restoredByUserId: params.restoredByUserId,
        restoredAt: new Date(),
        notes: message
      }
    }).catch(() => undefined);

    await logBackupAudit({
      action: "BACKUP_RESTORE_FAILED",
      userId: params.restoredByUserId,
      tenantId: params.auditTenantId,
      recordId: record.id,
      status: "FAILURE",
      details: { filename: record.filename, error: message, preRestoreBackupId: preRestoreBackup.id },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });

    throw error;
  }
};

export const deleteBackup = async (params: {
  backupId: number;
  deletedByUserId: number;
  auditTenantId: number;
  forceLatest: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}) => {
  const record = await getBackupForFileAccess(params.backupId);
  if (!record) throw new Error("Backup not found");

  const latest = await prisma.backupRecord.findFirst({
    where: { status: { in: [BackupStatus.CREATED, BackupStatus.RESTORED] } },
    orderBy: { createdAt: "desc" }
  });
  if (latest?.id === record.id && !params.forceLatest) {
    throw new Error("Latest backup cannot be deleted unless forceLatest is true");
  }

  await unlink(record.filePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
  const deleted = await prisma.backupRecord.update({
    where: { id: record.id },
    data: {
      status: BackupStatus.DELETED,
      notes: record.notes ? `${record.notes}\nDeleted by user ${params.deletedByUserId}` : `Deleted by user ${params.deletedByUserId}`
    }
  });

  await logBackupAudit({
    action: "BACKUP_DELETED",
    userId: params.deletedByUserId,
    tenantId: params.auditTenantId,
    recordId: deleted.id,
    status: "SUCCESS",
    details: { filename: deleted.filename },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent
  });

  return sanitizeRecord(deleted);
};

export const logBackupDownloaded = async (params: {
  recordId: number;
  filename: string;
  userId: number;
  tenantId: number;
  ipAddress?: string | null;
  userAgent?: string | null;
}) => {
  await logBackupAudit({
    action: "BACKUP_DOWNLOADED",
    userId: params.userId,
    tenantId: params.tenantId,
    recordId: params.recordId,
    status: "SUCCESS",
    details: { filename: params.filename },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent
  });
};

export const pruneOldBackups = async (keep = 180) => {
  const records = await prisma.backupRecord.findMany({
    where: {
      status: { in: [BackupStatus.CREATED, BackupStatus.RESTORED] },
      filename: { startsWith: "guruverse_backup_" }
    },
    orderBy: { createdAt: "desc" },
    skip: keep
  });

  for (const record of records) {
    await unlink(record.filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
    await prisma.backupRecord.update({
      where: { id: record.id },
      data: {
        status: BackupStatus.DELETED,
        notes: record.notes ? `${record.notes}\nPruned by retention policy.` : "Pruned by retention policy."
      }
    });
  }

  return records.length;
};
