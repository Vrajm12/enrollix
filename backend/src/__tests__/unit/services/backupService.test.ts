describe("backupService safety helpers", () => {
  const loadService = async () => {
    process.env.DATABASE_URL ||= "postgresql://postgres:postgres@localhost:5432/test?schema=public";
    process.env.JWT_SECRET ||= "test_jwt_secret_value_with_more_than_32_chars";
    process.env.BACKUP_DIR ||= "/tmp/guruverse-test-backups";
    return import("../../../services/backupService");
  };

  it("requires the exact restore confirmation phrase", async () => {
    const { getRestoreConfirmationText } = await loadService();

    expect(getRestoreConfirmationText()).toBe("RESTORE GURUVERSE DATABASE");
  });

  it("does not expose backup file paths in safe metadata", async () => {
    const { toSafeBackupRecord } = await loadService();

    const safeRecord = toSafeBackupRecord({
      id: 1,
      filename: "guruverse_backup_2026-06-06_02-00-00.sql",
      fileSize: BigInt(1024),
      status: "CREATED" as any,
      createdByUserId: 7,
      restoredByUserId: null,
      createdAt: new Date("2026-06-06T02:00:00.000Z"),
      restoredAt: null,
      notes: null,
      checksum: "abc123"
    });

    expect(safeRecord).not.toHaveProperty("filePath");
    expect(safeRecord.fileSize).toBe(1024);
  });
});
