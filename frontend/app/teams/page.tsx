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

type TeamInsight = {
  user: TeamUser;
  session: {
    status: "ACTIVE" | "OFFLINE";
    lastSeenAt: string | null;
    lastLoginAt: string | null;
    lastLogoutAt: string | null;
    requestsLast24h: number;
  };
  dashboardData: {
    assignedLeads: number;
    todayFollowups: number;
    missedFollowups: number;
    statusBifurcation: Record<string, number>;
    priorityBifurcation: Record<string, number>;
    communication: {
      whatsappMessages: number;
      smsMessages: number;
    };
  };
};

export default function TeamsPage() {
  const router = useRouter();
  const [canAllocateLeads, setCanAllocateLeads] = useState(false);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [insights, setInsights] = useState<TeamInsight[]>([]);
  const [tenantSummary, setTenantSummary] = useState({
    totalUsers: 0,
    totalLeads: 0,
    totalActivities: 0,
    activeUsers: 0,
    offlineUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [form, setForm] = useState({ name: "", email: "", role: "COUNSELOR" as "ADMIN" | "COUNSELOR" });
  const [allocating, setAllocating] = useState(false);
  const [allocationPincodes, setAllocationPincodes] = useState<string[]>([]);
  const [availableLeadsForPincode, setAvailableLeadsForPincode] = useState<number | null>(null);
  const [loadingPincodeSummary, setLoadingPincodeSummary] = useState(false);
  const [allocationForm, setAllocationForm] = useState({
    userId: "",
    pincode: "",
    startLeadNumber: "",
    endLeadNumber: ""
  });

  const loadUsers = async (includePincodes: boolean) => {
    try {
      const [result, teamInsights, pincodeData] = await Promise.all([
        api.getTeamUsers(),
        api.getTeamInsights(),
        includePincodes ? api.getLeadPincodes() : Promise.resolve({ pincodes: [] })
      ]);
      setUsers(result.users);
      setInsights(teamInsights.users);
      setTenantSummary(teamInsights.tenantSummary);
      setAllocationPincodes(pincodeData.pincodes);
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
    const isTenantAdmin = user.role === "TENANT_ADMIN";
    setCanAllocateLeads(isTenantAdmin);
    void loadUsers(isTenantAdmin);
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
      await loadUsers(canAllocateLeads);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create user");
    }
  };

  const onAllocate = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!canAllocateLeads) {
      setError("Only tenant admins can allocate leads.");
      return;
    }

    const userId = Number(allocationForm.userId);
    const startLeadNumber = Number(allocationForm.startLeadNumber);
    const endLeadNumber = Number(allocationForm.endLeadNumber);

    if (!userId || !allocationForm.pincode || !startLeadNumber || !endLeadNumber) {
      setError("User, pincode, and lead range are required.");
      return;
    }

    if (availableLeadsForPincode === null) {
      setError("Lead availability is still loading for the selected pincode.");
      return;
    }

    if (startLeadNumber > availableLeadsForPincode) {
      setError(`Start lead number exceeds available leads for pincode ${allocationForm.pincode} (${availableLeadsForPincode}).`);
      return;
    }

    try {
      setAllocating(true);
      const result = await api.allocateLeadRange({
        userId,
        pincode: allocationForm.pincode,
        startLeadNumber,
        endLeadNumber
      });
      setSuccess(
        `${result.message}. Pincode lead range: ${result.range.startLeadNumber}-${result.range.endLeadNumber}.`
      );
      setAllocationForm({ userId: "", pincode: "", startLeadNumber: "", endLeadNumber: "" });
      setAvailableLeadsForPincode(null);
      await loadUsers(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to allocate leads");
    } finally {
      setAllocating(false);
    }
  };

  useEffect(() => {
    if (!canAllocateLeads) {
      return;
    }

    if (!allocationForm.pincode) {
      setAvailableLeadsForPincode(null);
      return;
    }

    let ignore = false;
    const loadPincodeSummary = async () => {
      try {
        setLoadingPincodeSummary(true);
        const result = await api.getLeadAllocationPincodeSummary(allocationForm.pincode);
        if (!ignore) {
          setAvailableLeadsForPincode(result.availableLeads);
        }
      } catch (err) {
        if (!ignore) {
          setAvailableLeadsForPincode(null);
          setError(err instanceof Error ? err.message : "Unable to load pincode lead availability");
        }
      } finally {
        if (!ignore) {
          setLoadingPincodeSummary(false);
        }
      }
    };

    void loadPincodeSummary();
    return () => {
      ignore = true;
    };
  }, [allocationForm.pincode, canAllocateLeads]);

  if (loading) return <div className="p-6 text-sm text-slate-600">Loading team...</div>;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 md:ml-60 p-4 md:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Teams</h1>
        <p className="mt-2 text-slate-600">Create tenant users with temporary passwords and monitor session/data insights from this page.</p>
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

            {canAllocateLeads ? (
              <form onSubmit={onAllocate} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <h2 className="text-lg font-semibold">Allocate Leads (Tenant Admin)</h2>
                <p className="text-sm text-slate-600">Select user and pincode, then assign a range from available leads in that pincode.</p>
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
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={allocationForm.pincode}
                  onChange={(e) =>
                    setAllocationForm((current) => ({
                      ...current,
                      pincode: e.target.value,
                      startLeadNumber: "",
                      endLeadNumber: ""
                    }))
                  }
                  required
                >
                  <option value="">Select pincode</option>
                  {allocationPincodes.map((pincode) => (
                    <option key={pincode} value={pincode}>
                      {pincode}
                    </option>
                  ))}
                </select>
                {allocationForm.pincode ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {loadingPincodeSummary
                      ? "Loading leads available..."
                      : `Available leads in ${allocationForm.pincode}: ${availableLeadsForPincode ?? 0}`}
                  </div>
                ) : null}
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
                  disabled={allocating || loadingPincodeSummary || !allocationForm.pincode}
                >
                  {allocating ? "Allocating..." : "Assign Lead Range"}
                </button>
              </form>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3">Tenant Users</h2>
            <table className="min-w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b"><th className="py-2">Name</th><th className="py-2">Email</th><th className="py-2">Role</th><th className="py-2">Created</th></tr></thead>
              <tbody>{users.map((user) => (<tr key={user.id} className="border-b border-slate-100"><td className="py-2">{user.name}</td><td className="py-2">{user.email}</td><td className="py-2">{user.role}</td><td className="py-2">{new Date(user.createdAt).toLocaleDateString()}</td></tr>))}</tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Team Insights</h2>
          <p className="mt-1 text-sm text-slate-600">Session status, login session history, and user dashboard data bifurcation.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3"><p className="text-xs text-blue-700">Users</p><p className="text-xl font-bold text-blue-900">{tenantSummary.totalUsers}</p></div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Active</p><p className="text-xl font-bold text-emerald-900">{tenantSummary.activeUsers}</p></div>
            <div className="rounded-lg border border-slate-200 bg-slate-100 p-3"><p className="text-xs text-slate-700">Offline</p><p className="text-xl font-bold text-slate-900">{tenantSummary.offlineUsers}</p></div>
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3"><p className="text-xs text-indigo-700">Tenant Leads</p><p className="text-xl font-bold text-indigo-900">{tenantSummary.totalLeads}</p></div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3"><p className="text-xs text-amber-700">Activities</p><p className="text-xl font-bold text-amber-900">{tenantSummary.totalActivities}</p></div>
          </div>

          <div className="mt-6 space-y-4">
            {insights.map((item) => (
              <div key={item.user.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{item.user.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span>{item.user.email}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{item.user.role}</span>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.session.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>{item.session.status}</span>
                </div>

                <div className="mt-4 grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm md:grid-cols-4">
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Seen</p><p className="mt-1 font-medium text-slate-900">{item.session.lastSeenAt ? new Date(item.session.lastSeenAt).toLocaleString() : "-"}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Login</p><p className="mt-1 font-medium text-slate-900">{item.session.lastLoginAt ? new Date(item.session.lastLoginAt).toLocaleString() : "-"}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Logout</p><p className="mt-1 font-medium text-slate-900">{item.session.lastLogoutAt ? new Date(item.session.lastLogoutAt).toLocaleString() : "-"}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Requests (24h)</p><p className="mt-1 font-medium text-slate-900">{item.session.requestsLast24h}</p></div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Dashboard Totals</p>
                    <p className="mt-2 text-slate-700">Assigned Leads: <span className="font-semibold">{item.dashboardData.assignedLeads}</span></p>
                    <p className="text-slate-700">Today Followups: <span className="font-semibold">{item.dashboardData.todayFollowups}</span></p>
                    <p className="text-slate-700">Missed Followups: <span className="font-semibold">{item.dashboardData.missedFollowups}</span></p>
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Status Bifurcation</p>
                    {Object.keys(item.dashboardData.statusBifurcation).length === 0 ? <p className="mt-2 text-slate-500">No leads assigned</p> : Object.entries(item.dashboardData.statusBifurcation).map(([status, count]) => (<p key={status} className="mt-1 text-slate-700">{status}: <span className="font-semibold">{count}</span></p>))}
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Priority + Communication</p>
                    {Object.keys(item.dashboardData.priorityBifurcation).length === 0 ? <p className="mt-2 text-slate-500">No priorities yet</p> : Object.entries(item.dashboardData.priorityBifurcation).map(([priority, count]) => (<p key={priority} className="mt-1 text-slate-700">{priority}: <span className="font-semibold">{count}</span></p>))}
                    <p className="mt-2 text-slate-700">WhatsApp: <span className="font-semibold">{item.dashboardData.communication.whatsappMessages}</span></p>
                    <p className="text-slate-700">SMS: <span className="font-semibold">{item.dashboardData.communication.smsMessages}</span></p>
                  </div>
                </div>
              </div>
            ))}
            {insights.length === 0 ? <p className="text-sm text-slate-500">No team insight data yet.</p> : null}
          </div>
        </div>
      </main>
    </div>
  );
}
