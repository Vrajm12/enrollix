import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createDatabaseBackup,
  deleteBackup,
  getBackupForFileAccess,
  getRestoreConfirmationText,
  listBackups,
  logBackupDownloaded,
  restoreDatabaseBackup
} from "../services/backupService.js";

const router = Router();
const backupAuth = [requireAuth, requireRole(["SUPER_ADMIN"])];

const backupIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});
const restoreBackupSchema = z.object({
  confirmationText: z.string()
});
const deleteBackupSchema = z.object({
  forceLatest: z.boolean().optional().default(false),
  confirmationText: z.string().optional()
});

router.get(
  "/",
  ...backupAuth,
  asyncHandler(async (_req, res) => {
    const backups = await listBackups();
    return res.json({ backups });
  })
);

router.post(
  "/create",
  ...backupAuth,
  asyncHandler(async (req, res) => {
    try {
      const backup = await createDatabaseBackup({
        createdByUserId: req.user!.id,
        auditTenantId: req.user!.tenantId,
        notes: "Manual backup from Super Admin UI",
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null
      });
      return res.status(201).json({ backup });
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Unable to create backup"
      });
    }
  })
);

router.get(
  "/:id/download",
  ...backupAuth,
  asyncHandler(async (req, res) => {
    const parsed = backupIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid backup id" });
    }

    const backup = await getBackupForFileAccess(parsed.data.id);
    if (!backup) {
      return res.status(404).json({ message: "Backup not found" });
    }

    await logBackupDownloaded({
      recordId: backup.id,
      filename: backup.filename,
      userId: req.user!.id,
      tenantId: req.user!.tenantId,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null
    });

    return res.download(backup.filePath, backup.filename);
  })
);

router.post(
  "/:id/restore",
  ...backupAuth,
  asyncHandler(async (req, res) => {
    const idParsed = backupIdParamSchema.safeParse(req.params);
    if (!idParsed.success) {
      return res.status(400).json({ message: "Invalid backup id" });
    }

    const bodyParsed = restoreBackupSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({ message: "Invalid restore payload", errors: bodyParsed.error.flatten() });
    }

    if (bodyParsed.data.confirmationText !== getRestoreConfirmationText()) {
      return res.status(400).json({
        message: `Confirmation text must be exactly: ${getRestoreConfirmationText()}`
      });
    }

    try {
      const result = await restoreDatabaseBackup({
        backupId: idParsed.data.id,
        restoredByUserId: req.user!.id,
        auditTenantId: req.user!.tenantId,
        confirmationText: bodyParsed.data.confirmationText,
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null
      });
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Unable to restore backup"
      });
    }
  })
);

router.delete(
  "/:id",
  ...backupAuth,
  asyncHandler(async (req, res) => {
    const idParsed = backupIdParamSchema.safeParse(req.params);
    if (!idParsed.success) {
      return res.status(400).json({ message: "Invalid backup id" });
    }

    const bodyParsed = deleteBackupSchema.safeParse(req.body ?? {});
    if (!bodyParsed.success) {
      return res.status(400).json({ message: "Invalid delete payload", errors: bodyParsed.error.flatten() });
    }

    if (bodyParsed.data.forceLatest && bodyParsed.data.confirmationText !== "DELETE LATEST BACKUP") {
      return res.status(400).json({ message: "Deleting the latest backup requires confirmationText: DELETE LATEST BACKUP" });
    }

    try {
      const backup = await deleteBackup({
        backupId: idParsed.data.id,
        deletedByUserId: req.user!.id,
        auditTenantId: req.user!.tenantId,
        forceLatest: bodyParsed.data.forceLatest,
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null
      });
      return res.json({ backup });
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : "Unable to delete backup"
      });
    }
  })
);

export default router;
