"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Database, Download, Plus, RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { getToken, getUser, hasSession } from "@/lib/auth";

type BackupRecord = {
  id: number;
  filename: string;
  fileSize: number;
  status: "CREATED" | "FAILED" | "RESTORED" | "RESTORE_FAILED" | "DELETED";
  createdByUserId: number | null;
  restoredByUserId: number | null;
  createdAt: string;
  restoredAt: string | null;
  notes: string | null;
  checksum: string | null;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const RESTORE_CONFIRMATION = "RESTORE GURUVERSE DATABASE";

const authHeaders = (json = true) => {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

async function authJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...authHeaders(true),
      ...(options.headers as Record<string, string> | undefined)
    },
    credentials: "include"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data as T;
}

const formatSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

export default function BackupManagementPage() {
  const router = useRouter();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<BackupRecord | null>(null);
  const [restoreText, setRestoreText] = useState("");

  const restoreReady = restoreText === RESTORE_CONFIRMATION;

  const latestBackupId = useMemo(() => {
    return backups.find((backup) => backup.status === "CREATED" || backup.status === "RESTORED")?.id ?? null;
  }, [backups]);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const data = await authJson<{ backups: BackupRecord[] }>("/admin/backups");
      setBackups(data.backups);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load backups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = getUser();
    if (!hasSession() || user?.role !== "SUPER_ADMIN") {
      router.replace("/login");
      return;
    }
    void loadBackups();
  }, [router]);

  const createBackup = async () => {
    try {
      setCreating(true);
      const data = await authJson<{ backup: BackupRecord }>("/admin/backups/create", { method: "POST" });
      setBackups((current) => [data.backup, ...current]);
      setSuccess("Backup created successfully.");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create backup");
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = async (backup: BackupRecord) => {
    try {
      setBusyId(backup.id);
      const response = await fetch(`${API_BASE_URL}/admin/backups/${backup.id}/download`, {
        headers: authHeaders(false),
        credentials: "include"
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to download backup");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = backup.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setSuccess("Backup download started.");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download backup");
    } finally {
      setBusyId(null);
    }
  };

  const restoreBackup = async () => {
    if (!restoreTarget || !restoreReady) return;
    try {
      setBusyId(restoreTarget.id);
      const data = await authJson<{ restored: BackupRecord; message: string }>(`/admin/backups/${restoreTarget.id}/restore`, {
        method: "POST",
        body: JSON.stringify({ confirmationText: restoreText })
      });
      setBackups((current) => current.map((backup) => (backup.id === data.restored.id ? data.restored : backup)));
      setSuccess(data.message || "Restore completed. Backend restart may be required.");
      setRestoreTarget(null);
      setRestoreText("");
      setError("");
      void loadBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to restore backup");
    } finally {
      setBusyId(null);
    }
  };

  const deleteBackup = async (backup: BackupRecord) => {
    const isLatest = backup.id === latestBackupId;
    const confirmationText = isLatest ? window.prompt('Type "DELETE LATEST BACKUP" to delete the latest backup.') : "";
    if (isLatest && confirmationText !== "DELETE LATEST BACKUP") return;
    if (!isLatest && !window.confirm(`Delete backup ${backup.filename}?`)) return;

    try {
      setBusyId(backup.id);
      await authJson<{ backup: BackupRecord }>(`/admin/backups/${backup.id}`, {
        method: "DELETE",
        body: JSON.stringify({
          forceLatest: isLatest,
          confirmationText: isLatest ? confirmationText : undefined
        })
      });
      setBackups((current) => current.filter((item) => item.id !== backup.id));
      setSuccess("Backup deleted.");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete backup");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="md:ml-60 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                <ArrowLeft size={16} /> Super Admin
              </Link>
              <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-slate-950">
                <Database size={24} /> Database Backups
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadBackups()}
                disabled={loading || creating}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                <RefreshCw size={16} /> Refresh
              </button>
              <button
                type="button"
                onClick={() => void createBackup()}
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
              >
                <Plus size={16} /> {creating ? "Creating..." : "Create Backup"}
              </button>
            </div>
          </div>

          {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {success ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-3">Backup ID</th>
                    <th className="px-3 py-3">Filename</th>
                    <th className="px-3 py-3">Size</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Created At</th>
                    <th className="px-3 py-3">Created By</th>
                    <th className="px-3 py-3">Restored At</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backups.map((backup) => (
                    <tr key={backup.id} className="align-top">
                      <td className="px-3 py-3 font-medium text-slate-900">{backup.id}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-900">{backup.filename}</div>
                        {backup.checksum ? <div className="mt-1 max-w-[220px] truncate text-xs text-slate-500">SHA256 {backup.checksum}</div> : null}
                      </td>
                      <td className="px-3 py-3 text-slate-700">{formatSize(backup.fileSize)}</td>
                      <td className="px-3 py-3">
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{backup.status}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{new Date(backup.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-3 text-slate-700">{backup.createdByUserId ?? "-"}</td>
                      <td className="px-3 py-3 text-slate-700">{backup.restoredAt ? new Date(backup.restoredAt).toLocaleString() : "-"}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void downloadBackup(backup)}
                            disabled={busyId === backup.id || backup.status === "FAILED" || backup.status === "RESTORE_FAILED"}
                            className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                          >
                            <Download size={14} /> Download
                          </button>
                          <button
                            type="button"
                            onClick={() => setRestoreTarget(backup)}
                            disabled={busyId === backup.id || backup.status !== "CREATED"}
                            className="inline-flex items-center gap-1 rounded border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                          >
                            <RotateCcw size={14} /> Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteBackup(backup)}
                            disabled={busyId === backup.id}
                            className="inline-flex items-center gap-1 rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && backups.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-slate-500">No backups found.</td>
                    </tr>
                  ) : null}
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-slate-500">Loading backups...</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {restoreTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Restore Backup</h2>
                <p className="mt-2 text-sm text-red-700">This will replace the current live database with the selected backup.</p>
              </div>
              <button type="button" onClick={() => setRestoreTarget(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="font-medium text-slate-900">{restoreTarget.filename}</div>
              <div>Created {new Date(restoreTarget.createdAt).toLocaleString()}</div>
            </div>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Type confirmation phrase
              <input
                value={restoreText}
                onChange={(event) => setRestoreText(event.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder={RESTORE_CONFIRMATION}
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setRestoreTarget(null)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void restoreBackup()}
                disabled={!restoreReady || busyId === restoreTarget.id}
                className="inline-flex items-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                <RotateCcw size={16} /> {busyId === restoreTarget.id ? "Restoring..." : "Restore Backup"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
