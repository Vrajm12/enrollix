'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { clearSession, getToken, getUser, hasSession } from '@/lib/auth';
import { User } from '@/lib/types';
import { api } from '@/lib/api';

interface Tenant {
  id: number;
  name: string;
  slug: string;
  description?: string;
  courseOptions: string[];
  maxUsers: number;
  isActive: boolean;
  createdAt: string;
  userCount?: number;
}

interface CreateTenantPayload {
  name: string;
  slug: string;
  description?: string;
  maxUsers: number;
  courseOptions: string[];
}

interface TenantUser {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface MonitoringOverview {
  windowHours: number;
  totalRequests: number;
  totalErrors: number;
  errorRatePercent: number;
  avgDurationMs: number;
}

interface TenantUsage {
  tenantId: number | null;
  tenantName: string;
  tenantSlug: string | null;
  isActive: boolean;
  requestCount: number;
}

interface EndpointUsage {
  path: string;
  requestCount: number;
  avgDurationMs: number;
}

interface RequestLog {
  id: string;
  tenantId: number | null;
  userId: number | null;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  requestSize: number | null;
  responseSize: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  errorMessage: string | null;
  createdAt: string;
  tenantName?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function authFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined)
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

async function fetchTenants(): Promise<Tenant[]> {
  const data = await authFetch('/admin/tenants');
  return data.tenants;
}

async function createTenant(tenantData: CreateTenantPayload) {
  const data = await authFetch('/admin/tenants', {
    method: 'POST',
    body: JSON.stringify(tenantData)
  });
  return data.tenant;
}

async function updateTenant(tenantId: number, payload: Partial<Tenant>) {
  const data = await authFetch(`/admin/tenants/${tenantId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  return data.tenant as Tenant;
}

async function deactivateTenant(tenantId: number) {
  await authFetch(`/admin/tenants/${tenantId}`, { method: 'DELETE' });
}

async function deleteTenantPermanently(tenantId: number) {
  await authFetch(`/admin/tenants/${tenantId}/permanent`, { method: 'DELETE' });
}

async function fetchTenantUsers(tenantId: number): Promise<TenantUser[]> {
  const data = await authFetch(`/admin/tenants/${tenantId}/users`);
  return data.users;
}

async function createTenantUser(
  tenantId: number,
  userData: { email: string; name: string; password?: string; role: string }
) {
  return authFetch(`/admin/tenants/${tenantId}/users`, {
    method: 'POST',
    body: JSON.stringify(userData)
  }) as Promise<{ user: TenantUser; temporaryPassword?: string }>;
}

async function updateTenantUser(
  tenantId: number,
  userId: number,
  payload: { name?: string; role?: string }
) {
  const data = await authFetch(`/admin/tenants/${tenantId}/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  return data.user as TenantUser;
}

async function fetchMonitoring(hours = 24) {
  return authFetch(`/admin/monitoring/overview?hours=${hours}`) as Promise<{
    overview: MonitoringOverview;
    mostUsedTenants: TenantUsage[];
    topEndpoints: EndpointUsage[];
    latestErrors: RequestLog[];
  }>;
}

async function fetchRequestLogs(hours = 24, limit = 150) {
  try {
    const data = await authFetch(`/admin/monitoring/requests?hours=${hours}&limit=${limit}`);
    return data.requests as RequestLog[];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('/admin/monitoring/requests') || message.toLowerCase().includes('route not found')) {
      return [];
    }
    throw error;
  }
}

export default function AdminPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [creating, setCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [monitoringHours, setMonitoringHours] = useState(24);
  const [monitoringOverview, setMonitoringOverview] = useState<MonitoringOverview | null>(null);
  const [tenantUsage, setTenantUsage] = useState<TenantUsage[]>([]);
  const [endpointUsage, setEndpointUsage] = useState<EndpointUsage[]>([]);
  const [latestErrors, setLatestErrors] = useState<RequestLog[]>([]);
  const [requestLogs, setRequestLogs] = useState<RequestLog[]>([]);
  const [requestLogsUnavailable, setRequestLogsUnavailable] = useState(false);

  const [tenantEditName, setTenantEditName] = useState<Record<number, string>>({});
  const [tenantEditMaxUsers, setTenantEditMaxUsers] = useState<Record<number, number>>({});
  const [userEditName, setUserEditName] = useState<Record<number, string>>({});
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const [newTenant, setNewTenant] = useState({
    name: '',
    slug: '',
    description: '',
    courseOptions: [] as string[],
    courseInput: '',
    maxUsers: 10
  });

  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    password: '',
    role: 'COUNSELOR'
  });

  const isBusy = creating || monitoringLoading;

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== 'SUPER_ADMIN' || !hasSession()) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
    void initialize();
  }, [router]);

  const initialize = async () => {
    try {
      setLoading(true);
      const [tenantData, monitoringData, logsResult] = await Promise.all([
        fetchTenants(),
        fetchMonitoring(monitoringHours),
        fetchRequestLogs(monitoringHours).then((logs) => ({ logs, unavailable: false })).catch((err) => {
          const message = err instanceof Error ? err.message : '';
          if (message.includes('/admin/monitoring/requests') || message.toLowerCase().includes('route not found')) {
            return { logs: [] as RequestLog[], unavailable: true };
          }
          throw err;
        })
      ]);
      setTenants(tenantData);
      setMonitoringOverview(monitoringData.overview);
      setTenantUsage(monitoringData.mostUsedTenants);
      setEndpointUsage(monitoringData.topEndpoints);
      setLatestErrors(monitoringData.latestErrors);
      setRequestLogs(logsResult.logs);
      setRequestLogsUnavailable(logsResult.unavailable);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to initialize superadmin dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadTenantUsers = async (tenant: Tenant) => {
    try {
      setSelectedTenant(tenant);
      const users = await fetchTenantUsers(tenant.id);
      setTenantUsers(users);
      setUserEditName(Object.fromEntries(users.map((u) => [u.id, u.name])));
    } catch (err: any) {
      setError(err.message || 'Failed to load tenant users');
    }
  };

  const refreshMonitoring = async () => {
    try {
      setMonitoringLoading(true);
      const [monitoringData, logsResult] = await Promise.all([
        fetchMonitoring(monitoringHours),
        fetchRequestLogs(monitoringHours).then((logs) => ({ logs, unavailable: false })).catch((err) => {
          const message = err instanceof Error ? err.message : '';
          if (message.includes('/admin/monitoring/requests') || message.toLowerCase().includes('route not found')) {
            return { logs: [] as RequestLog[], unavailable: true };
          }
          throw err;
        })
      ]);
      setMonitoringOverview(monitoringData.overview);
      setTenantUsage(monitoringData.mostUsedTenants);
      setEndpointUsage(monitoringData.topEndpoints);
      setLatestErrors(monitoringData.latestErrors);
      setRequestLogs(logsResult.logs);
      setRequestLogsUnavailable(logsResult.unavailable);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load monitoring data');
    } finally {
      setMonitoringLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const tenant = await createTenant({
        name: newTenant.name,
        slug: newTenant.slug,
        description: newTenant.description,
        maxUsers: newTenant.maxUsers,
        courseOptions: newTenant.courseOptions
      });
      setTenants([tenant, ...tenants]);
      setTenantEditName((prev) => ({ ...prev, [tenant.id]: tenant.name }));
      setNewTenant({ name: '', slug: '', description: '', courseOptions: [], courseInput: '', maxUsers: 10 });
      setSuccessMessage('Tenant created successfully.');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

  const handleTenantUpdate = async (tenant: Tenant) => {
    const name = (tenantEditName[tenant.id] ?? '').trim();
    const maxUsers = tenantEditMaxUsers[tenant.id] ?? tenant.maxUsers;
    if (!name) return false;
    if (!Number.isFinite(maxUsers) || maxUsers < 1) {
      setError('User limit must be at least 1.');
      return false;
    }
    if (name === tenant.name && maxUsers === tenant.maxUsers) return true;
    try {
      const updated = await updateTenant(tenant.id, { name, maxUsers });
      setTenants((prev) =>
        prev.map((t) =>
          t.id === tenant.id ? { ...t, name: updated.name, maxUsers: updated.maxUsers } : t
        )
      );
      if (selectedTenant?.id === tenant.id) {
      setSelectedTenant({ ...selectedTenant, name: updated.name, maxUsers: updated.maxUsers });
      }
      setSuccessMessage('Tenant details updated.');
      setError('');
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update tenant');
      return false;
    }
  };

  const handleTenantToggle = async (tenant: Tenant) => {
    try {
      const updated = await updateTenant(tenant.id, { isActive: !tenant.isActive });
      setTenants((prev) => prev.map((t) => (t.id === tenant.id ? updated : t)));
      if (selectedTenant?.id === tenant.id) {
        setSelectedTenant(updated);
      }
      setSuccessMessage(`Tenant ${updated.isActive ? 'enabled' : 'disabled'} successfully.`);
    } catch (err: any) {
      setError(err.message || 'Failed to update tenant status');
    }
  };

  const handleTenantDeactivate = async (tenant: Tenant) => {
    try {
      await deactivateTenant(tenant.id);
      setTenants((prev) => prev.map((t) => (t.id === tenant.id ? { ...t, isActive: false } : t)));
      setSuccessMessage('Tenant disabled successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to disable tenant');
    }
  };

  const handleTenantPermanentDelete = async (tenant: Tenant) => {
    const confirmed = window.confirm(`Delete tenant "${tenant.name}" permanently? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteTenantPermanently(tenant.id);
      setTenants((prev) => prev.filter((t) => t.id !== tenant.id));
      if (selectedTenant?.id === tenant.id) {
        setSelectedTenant(null);
        setTenantUsers([]);
      }
      setSuccessMessage('Tenant deleted permanently.');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to delete tenant permanently');
    }
  };

  const addCourseOption = () => {
    const normalized = newTenant.courseInput.trim();
    if (!normalized) return;
    if (newTenant.courseOptions.includes(normalized)) {
      setNewTenant({ ...newTenant, courseInput: '' });
      return;
    }
    setNewTenant({
      ...newTenant,
      courseOptions: [...newTenant.courseOptions, normalized],
      courseInput: ''
    });
  };

  const removeCourseOption = (course: string) => {
    setNewTenant({
      ...newTenant,
      courseOptions: newTenant.courseOptions.filter((value) => value !== course)
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    try {
      const payload = {
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        ...(newUser.password.trim() ? { password: newUser.password } : {})
      };
      const response = await createTenantUser(selectedTenant.id, payload);
      setTenantUsers([...tenantUsers, response.user]);
      setUserEditName((prev) => ({ ...prev, [response.user.id]: response.user.name }));
      setNewUser({ email: '', name: '', password: '', role: 'COUNSELOR' });
      setSuccessMessage(
        response.temporaryPassword
          ? `User created. Temporary password: ${response.temporaryPassword}`
          : 'User created successfully.'
      );
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
      setSuccessMessage('');
    }
  };

  const handleUserRename = async (user: TenantUser) => {
    if (!selectedTenant) return;
    const name = (userEditName[user.id] ?? '').trim();
    if (!name || name === user.name) return;
    try {
      const updated = await updateTenantUser(selectedTenant.id, user.id, { name });
      setTenantUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      setSuccessMessage('Profile name updated successfully.');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile name');
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await api.logout();
    } catch {
    } finally {
      clearSession();
      router.replace('/login');
    }
  };

  const statusColor = useMemo(
    () => (statusCode: number) => {
      if (statusCode >= 500) return 'text-red-700';
      if (statusCode >= 400) return 'text-amber-700';
      return 'text-emerald-700';
    },
    []
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Superadmin Command Center</h1>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Logged in as: {currentUser?.name} ({currentUser?.role})
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">{successMessage}</div>
        )}

        <section className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Monitoring</h2>
            <div className="flex items-center gap-2">
              <select
                value={monitoringHours}
                onChange={(e) => setMonitoringHours(parseInt(e.target.value, 10))}
                className="border border-gray-300 rounded px-2 py-2 text-sm"
              >
                <option value={6}>Last 6h</option>
                <option value={24}>Last 24h</option>
                <option value={72}>Last 72h</option>
                <option value={168}>Last 7d</option>
              </select>
              <button
                type="button"
                onClick={refreshMonitoring}
                disabled={isBusy}
                className="rounded-md bg-gray-900 text-white px-3 py-2 text-sm disabled:opacity-60"
              >
                {monitoringLoading ? 'Refreshing...' : 'Refresh Monitoring'}
              </button>
            </div>
          </div>

          {monitoringOverview && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded p-3"><p className="text-xs text-blue-700">Requests</p><p className="text-xl font-semibold">{monitoringOverview.totalRequests}</p></div>
              <div className="bg-red-50 rounded p-3"><p className="text-xs text-red-700">Errors</p><p className="text-xl font-semibold">{monitoringOverview.totalErrors}</p></div>
              <div className="bg-amber-50 rounded p-3"><p className="text-xs text-amber-700">Error Rate</p><p className="text-xl font-semibold">{monitoringOverview.errorRatePercent}%</p></div>
              <div className="bg-emerald-50 rounded p-3"><p className="text-xs text-emerald-700">Avg Latency</p><p className="text-xl font-semibold">{monitoringOverview.avgDurationMs}ms</p></div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold mb-2">Top Tenants By Usage</h3>
              <div className="space-y-2">
                {tenantUsage.map((item) => (
                  <div key={`${item.tenantId}-${item.tenantSlug}`} className="border rounded p-2 flex items-center justify-between text-sm">
                    <span>{item.tenantName} {item.tenantSlug ? `(${item.tenantSlug})` : ''}</span>
                    <span className="font-semibold">{item.requestCount}</span>
                  </div>
                ))}
                {tenantUsage.length === 0 && <p className="text-sm text-gray-500">No usage data in this window.</p>}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Top Endpoints</h3>
              <div className="space-y-2">
                {endpointUsage.map((item) => (
                  <div key={item.path} className="border rounded p-2 text-sm">
                    <div className="font-medium text-gray-900">{item.path}</div>
                    <div className="text-gray-600">Hits: {item.requestCount} | Avg: {item.avgDurationMs}ms</div>
                  </div>
                ))}
                {endpointUsage.length === 0 && <p className="text-sm text-gray-500">No endpoint activity in this window.</p>}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2">Latest Errors</h3>
            <div className="overflow-x-auto border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">Tenant</th>
                    <th className="px-3 py-2 text-left">Path</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {latestErrors.map((row) => (
                    <tr key={`${row.id}`} className="border-t">
                      <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2">{row.tenantName || row.tenantId || 'Unknown'}</td>
                      <td className="px-3 py-2">{row.method} {row.path}</td>
                      <td className={`px-3 py-2 font-medium ${statusColor(row.statusCode)}`}>{row.statusCode}</td>
                      <td className="px-3 py-2">{row.errorMessage || '-'}</td>
                    </tr>
                  ))}
                  {latestErrors.length === 0 && (
                    <tr><td className="px-3 py-3 text-gray-500" colSpan={5}>No errors in this window.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Tenant</h2>
              <form onSubmit={handleCreateTenant} className="space-y-4">
                <input type="text" required value={newTenant.name} onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })} className="w-full px-3 py-2 border rounded-md text-gray-900" placeholder="Tenant Name" />
                <input type="text" required value={newTenant.slug} onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })} className="w-full px-3 py-2 border rounded-md text-gray-900" placeholder="Slug" />
                <textarea value={newTenant.description} onChange={(e) => setNewTenant({ ...newTenant, description: e.target.value })} className="w-full px-3 py-2 border rounded-md text-gray-900" rows={2} placeholder="Description" />
                <div>
                  <div className="flex gap-2">
                    <input type="text" value={newTenant.courseInput} onChange={(e) => setNewTenant({ ...newTenant, courseInput: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCourseOption(); } }} className="w-full px-3 py-2 border rounded-md text-gray-900" placeholder="Course option" />
                    <button type="button" onClick={addCourseOption} className="px-3 py-2 rounded-md bg-gray-900 text-white text-sm">+</button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {newTenant.courseOptions.map((course) => (
                      <span key={course} className="inline-flex items-center gap-2 px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">{course}<button type="button" onClick={() => removeCourseOption(course)} className="text-blue-900">x</button></span>
                    ))}
                  </div>
                </div>
                <label className="block text-sm font-medium text-gray-700">
                  User limit
                  <input type="number" min="1" value={newTenant.maxUsers} onChange={(e) => setNewTenant({ ...newTenant, maxUsers: parseInt(e.target.value, 10) || 1 })} className="mt-1 w-full px-3 py-2 border rounded-md text-gray-900" />
                </label>
                <button type="submit" disabled={creating} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium">{creating ? 'Creating...' : 'Create Tenant'}</button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="space-y-4">
              {tenants.map((tenant) => (
                <div key={tenant.id} className={`bg-white rounded-lg shadow p-6 ${selectedTenant?.id === tenant.id ? 'ring-2 ring-blue-600' : ''}`}>
                  <div className="flex flex-wrap gap-2 justify-between">
                    <div className="space-y-2 flex-1 min-w-[220px]">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-2">
                        <label className="block text-xs font-medium text-gray-600">
                          Tenant name
                          <input
                            value={tenantEditName[tenant.id] ?? tenant.name}
                            onChange={(e) => setTenantEditName((prev) => ({ ...prev, [tenant.id]: e.target.value }))}
                            readOnly={editingTenantId !== tenant.id}
                            className={`mt-1 w-full border rounded px-2 py-2 text-sm ${editingTenantId === tenant.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'}`}
                          />
                        </label>
                        <label className="block text-xs font-medium text-gray-600">
                          User limit
                          <input
                            type="number"
                            min="1"
                            value={tenantEditMaxUsers[tenant.id] ?? tenant.maxUsers}
                            onChange={(e) =>
                              setTenantEditMaxUsers((prev) => ({
                                ...prev,
                                [tenant.id]: parseInt(e.target.value, 10) || 1
                              }))
                            }
                            readOnly={editingTenantId !== tenant.id}
                            className={`mt-1 w-full border rounded px-2 py-2 text-sm ${editingTenantId === tenant.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'}`}
                          />
                        </label>
                      </div>
                      <p className="text-sm text-gray-600">Slug: <code className="bg-gray-100 px-2 py-1 rounded">{tenant.slug}</code></p>
                    </div>
                    <div className="flex items-start gap-2">
                      <button type="button" onClick={() => void loadTenantUsers(tenant)} className="px-3 py-2 bg-gray-100 text-sm rounded">Profiles</button>
                      {editingTenantId === tenant.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleTenantUpdate(tenant).then((saved) => {
                              if (saved) setEditingTenantId(null);
                            })}
                            className="px-3 py-2 bg-blue-600 text-white text-sm rounded"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTenantEditName((prev) => ({ ...prev, [tenant.id]: tenant.name }));
                              setTenantEditMaxUsers((prev) => ({ ...prev, [tenant.id]: tenant.maxUsers }));
                              setEditingTenantId(null);
                            }}
                            className="px-3 py-2 bg-gray-500 text-white text-sm rounded"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTenantEditName((prev) => ({ ...prev, [tenant.id]: tenant.name }));
                            setTenantEditMaxUsers((prev) => ({ ...prev, [tenant.id]: tenant.maxUsers }));
                            setEditingTenantId(tenant.id);
                          }}
                          className="px-3 py-2 bg-blue-600 text-white text-sm rounded inline-flex items-center gap-1"
                        >
                          <Pencil size={14} /> Edit
                        </button>
                      )}
                      <button type="button" onClick={() => void handleTenantToggle(tenant)} className="px-3 py-2 bg-amber-600 text-white text-sm rounded">{tenant.isActive ? 'Disable' : 'Enable'}</button>
                      <button type="button" onClick={() => void handleTenantDeactivate(tenant)} className="px-3 py-2 bg-orange-600 text-white text-sm rounded">Soft Disable</button>
                      <button type="button" onClick={() => void handleTenantPermanentDelete(tenant)} className="px-3 py-2 bg-red-700 text-white text-sm rounded">Delete</button>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-600 flex flex-wrap gap-4">
                    <span>Users: {tenant.userCount || 0}/{tenant.maxUsers}</span>
                    <span>Status: {tenant.isActive ? 'Active' : 'Inactive'}</span>
                    <span>Created: {new Date(tenant.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {tenants.length === 0 && <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">No tenants yet.</div>}
            </div>
          </div>
        </div>

        {selectedTenant && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profiles in "{selectedTenant.name}"</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Add New User</h3>
                <form onSubmit={handleCreateUser} className="space-y-3">
                  <input type="email" required value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="w-full px-2 py-2 border rounded text-sm" placeholder="Email" />
                  <input type="text" required value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="w-full px-2 py-2 border rounded text-sm" placeholder="Name" />
                  <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="w-full px-2 py-2 border rounded text-sm" minLength={12} placeholder="Optional password" />
                  <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full px-2 py-2 border rounded text-sm">
                    <option value="COUNSELOR">Counselor</option>
                    <option value="ADMIN">Admin</option>
                    <option value="TENANT_ADMIN">Tenant Admin</option>
                  </select>
                  <button type="submit" className="w-full bg-green-600 text-white py-2 rounded text-sm">Add User</button>
                </form>
              </div>

              <div className="lg:col-span-2 space-y-3">
                {tenantUsers.map((user) => (
                  <div key={user.id} className="border rounded p-3">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                      <input
                        value={userEditName[user.id] ?? user.name}
                        onChange={(e) => setUserEditName((prev) => ({ ...prev, [user.id]: e.target.value }))}
                        readOnly={editingUserId !== user.id}
                        className={`md:col-span-2 border rounded px-2 py-2 text-sm ${editingUserId === user.id ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'}`}
                      />
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-sm text-gray-700">{user.role}</p>
                      {editingUserId === user.id ? (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => void handleUserRename(user).then(() => setEditingUserId(null))} className="px-3 py-2 bg-blue-600 text-white rounded text-sm">Save</button>
                          <button type="button" onClick={() => { setUserEditName((prev) => ({ ...prev, [user.id]: user.name })); setEditingUserId(null); }} className="px-3 py-2 bg-gray-500 text-white rounded text-sm">Cancel</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setEditingUserId(user.id)} className="px-3 py-2 bg-blue-600 text-white rounded text-sm inline-flex items-center gap-1"><Pencil size={14} /> Edit</button>
                      )}
                    </div>
                  </div>
                ))}
                {tenantUsers.length === 0 && <p className="text-sm text-gray-500">No users in this tenant.</p>}
              </div>
            </div>
          </div>
        )}

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Request Logs</h2>
          {requestLogsUnavailable ? (
            <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Detailed request log endpoint is not available on this backend version.
            </div>
          ) : null}
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-2 py-2 text-left">Time</th>
                  <th className="px-2 py-2 text-left">Tenant</th>
                  <th className="px-2 py-2 text-left">Request</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-left">Latency</th>
                  <th className="px-2 py-2 text-left">Error</th>
                </tr>
              </thead>
              <tbody>
                {requestLogs.map((row) => (
                  <tr key={`${row.id}`} className="border-t">
                    <td className="px-2 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="px-2 py-2">{row.tenantName || row.tenantId || 'Unknown'}</td>
                    <td className="px-2 py-2">{row.method} {row.path}</td>
                    <td className={`px-2 py-2 font-medium ${statusColor(row.statusCode)}`}>{row.statusCode}</td>
                    <td className="px-2 py-2">{row.durationMs}ms</td>
                    <td className="px-2 py-2">{row.errorMessage || '-'}</td>
                  </tr>
                ))}
                {requestLogs.length === 0 && <tr><td className="px-2 py-3 text-gray-500" colSpan={6}>No request logs for this window.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
