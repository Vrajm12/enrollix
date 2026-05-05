"use client";

import { FormEvent, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { ApiError, api } from "@/lib/api";
import { clearSession, getUser, hasSession } from "@/lib/auth";
import { useRouter } from "next/navigation";

type TeamUser = {
  id: number;
  name: string;
  email: string;
  role: "TENANT_ADMIN" | "ADMIN" | "COUNSELOR";
  createdAt: string;
};

export default function TeamsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [form, setForm] = useState({ name: "", email: "", role: "COUNSELOR" as "ADMIN" | "COUNSELOR" });
  const [allocating, setAllocating] = useState(false);
  const [allocationForm, setAllocationForm] = useState({
    userId: "",
    startLeadNumber: "",
    endLeadNumber: ""
  });

  const loadUsers = async () => {
    try {
      const result = await api.getTeamUsers();
      setUsers(result.users);
      setError("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setError("Only tenant admins and admins can access the Teams page.");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to load team users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasSession()) {
      router.replace("/login");
      return;
    }
    const user = getUser();
    if (!user || !["TENANT_ADMIN", "ADMIN"].includes(user.role)) {
      router.replace("/dashboard");
      return;
    }
    void loadUsers();
  }, [router]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setTempPassword("");

    try {
      const created = await api.createTeamUser(form);
      setUsers((current) => [created.user, ...current]);
      setTempPassword(created.temporaryPassword);
      setSuccess(`User created for ${created.user.email}. Share the temporary password securely.`);
      setForm({ name: "", email: "", role: "COUNSELOR" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create user");
    }
  };

  const onAllocate = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const userId = Number(allocationForm.userId);
    const startLeadNumber = Number(allocationForm.startLeadNumber);
    const endLeadNumber = Number(allocationForm.endLeadNumber);

    if (!userId || !startLeadNumber || !endLeadNumber) {
      setError("User and lead range are required.");
      return;
    }

    try {
      setAllocating(true);
      const result = await api.allocateLeadRange({ userId, startLeadNumber, endLeadNumber });
      setSuccess(
        `${result.message}. Tenant lead range: ${result.range.startLeadNumber}-${result.range.endLeadNumber}.`
      );
      setAllocationForm({ userId: "", startLeadNumber: "", endLeadNumber: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to allocate leads");
    } finally {
      setAllocating(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-slate-600">Loading team...</div>;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 md:ml-60 p-4 md:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Teams</h1>
        <p className="mt-2 text-slate-600">Create tenant users with temporary passwords. New users must reset password from Settings.</p>
        {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {success ? <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}
        {tempPassword ? <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Temporary password: <span className="font-semibold">{tempPassword}</span></div> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
          <div className="space-y-6">
            <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold">Create User</h2>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Full name" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required />
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} required />
              <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.role} onChange={(e) => setForm((c) => ({ ...c, role: e.target.value as "ADMIN" | "COUNSELOR" }))}>
                <option value="COUNSELOR">Counselor</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button className="w-full rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800" type="submit">Create User</button>
            </form>

            <form onSubmit={onAllocate} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold">Allocate Leads (Tenant Admin)</h2>
              <p className="text-sm text-slate-600">Assign a tenant lead number range to one user. Example: 1 to 100.</p>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={allocationForm.userId}
                onChange={(e) => setAllocationForm((c) => ({ ...c, userId: e.target.value }))}
                required
              >
                <option value="">Select user</option>
                {users
                  .filter((user) => user.role === "ADMIN" || user.role === "COUNSELOR")
                  .map((user) => (
                    <option key={user.id} value={String(user.id)}>
                      {user.name} ({user.role})
                    </option>
                  ))}
              </select>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Start lead number"
                  value={allocationForm.startLeadNumber}
                  onChange={(e) => setAllocationForm((c) => ({ ...c, startLeadNumber: e.target.value }))}
                  required
                />
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="End lead number"
                  value={allocationForm.endLeadNumber}
                  onChange={(e) => setAllocationForm((c) => ({ ...c, endLeadNumber: e.target.value }))}
                  required
                />
              </div>
              <button
                className="w-full rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                type="submit"
                disabled={allocating}
              >
                {allocating ? "Allocating..." : "Assign Lead Range"}
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3">Tenant Users</h2>
            <table className="min-w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b"><th className="py-2">Name</th><th className="py-2">Email</th><th className="py-2">Role</th><th className="py-2">Created</th></tr></thead>
              <tbody>{users.map((user) => (<tr key={user.id} className="border-b border-slate-100"><td className="py-2">{user.name}</td><td className="py-2">{user.email}</td><td className="py-2">{user.role}</td><td className="py-2">{new Date(user.createdAt).toLocaleDateString()}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
