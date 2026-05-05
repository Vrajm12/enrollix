'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function fetchTenants(): Promise<Tenant[]> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/admin/tenants`, {
    headers,
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch tenants');
  const data = await response.json();
  return data.tenants;
}

async function createTenant(tenantData: CreateTenantPayload) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/admin/tenants`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(tenantData)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create tenant');
  }
  const data = await response.json();
  return data.tenant;
}

async function fetchTenantUsers(tenantId: number): Promise<TenantUser[]> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/admin/tenants/${tenantId}/users`, {
    headers,
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch tenant users');
  const data = await response.json();
  return data.users;
}

async function createTenantUser(
  tenantId: number,
  userData: { email: string; name: string; password?: string; role: string }
) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/admin/tenants/${tenantId}/users`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(userData)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create user');
  }
  const data = await response.json();
  return data as { user: TenantUser; temporaryPassword?: string };
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
  const [successMessage, setSuccessMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

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

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== 'SUPER_ADMIN' || !hasSession()) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
    loadTenants();
  }, [router]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const data = await fetchTenants();
      setTenants(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const loadTenantUsers = async (tenant: Tenant) => {
    try {
      setSelectedTenant(tenant);
      const users = await fetchTenantUsers(tenant.id);
      setTenantUsers(users);
    } catch (err: any) {
      setError(err.message || 'Failed to load tenant users');
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
      setTenants([...tenants, tenant]);
      setNewTenant({ name: '', slug: '', description: '', courseOptions: [], courseInput: '', maxUsers: 10 });
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to create tenant');
    } finally {
      setCreating(false);
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
      setNewUser({ email: '', name: '', password: '', role: 'COUNSELOR' });
      setSuccessMessage(
        response.temporaryPassword
          ? `User created. Temporary password: ${response.temporaryPassword}`
          : "User created successfully."
      );
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
      setSuccessMessage("");
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await api.logout();
    } catch {
      // Ignore API logout errors and clear local session anyway.
    } finally {
      clearSession();
      router.replace('/login');
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Tenant Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Tenant</h2>
              <form onSubmit={handleCreateTenant} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tenant Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newTenant.name}
                    onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400"
                    placeholder="e.g., Acme University"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug (URL-friendly)
                  </label>
                  <input
                    type="text"
                    required
                    value={newTenant.slug}
                    onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400"
                    placeholder="e.g., acme-university"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newTenant.description}
                    onChange={(e) => setNewTenant({ ...newTenant, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400"
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course Dropdown Options
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTenant.courseInput}
                      onChange={(e) => setNewTenant({ ...newTenant, courseInput: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCourseOption();
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400"
                      placeholder="e.g., BBA Management"
                    />
                    <button
                      type="button"
                      onClick={addCourseOption}
                      className="px-3 py-2 rounded-md bg-gray-900 text-white text-sm"
                    >
                      +
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {newTenant.courseOptions.map((course) => (
                      <span key={course} className="inline-flex items-center gap-2 px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">
                        {course}
                        <button type="button" onClick={() => removeCourseOption(course)} className="text-blue-900">x</button>
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Users
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newTenant.maxUsers}
                    onChange={(e) => setNewTenant({ ...newTenant, maxUsers: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {creating ? 'Creating...' : 'Create Tenant'}
                </button>
              </form>
            </div>
          </div>

          {/* Tenants List */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {tenants.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                  No tenants yet. Create one to get started.
                </div>
              ) : (
                tenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className={`bg-white rounded-lg shadow p-6 cursor-pointer transition hover:shadow-lg ${
                      selectedTenant?.id === tenant.id ? 'ring-2 ring-blue-600' : ''
                    }`}
                    onClick={() => loadTenantUsers(tenant)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{tenant.name}</h3>
                        <p className="text-sm text-gray-600">
                          Slug: <code className="bg-gray-100 px-2 py-1 rounded">{tenant.slug}</code>
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          tenant.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {tenant.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {tenant.description && (
                      <p className="text-sm text-gray-600 mb-3">{tenant.description}</p>
                    )}
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Users: {tenant.userCount || 0} / {tenant.maxUsers}</span>
                      <span>
                        Created: {new Date(tenant.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-600">
                      Course options: {tenant.courseOptions?.length ?? 0}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Tenant Users Management */}
        {selectedTenant && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Users in "{selectedTenant.name}"
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Create User Form */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Add New User</h3>
                <form onSubmit={handleCreateUser} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full px-2 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="w-full px-2 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                      placeholder="Full Name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Password (optional)
                    </label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full px-2 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                      minLength={12}
                      placeholder="Leave blank to auto-generate temp password"
                    />
                    <p className="mt-1 text-xs text-gray-500">If provided, password must be at least 12 characters.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="w-full px-2 py-2 border border-gray-300 rounded text-gray-900 text-sm"
                    >
                      <option value="COUNSELOR">Counselor</option>
                      <option value="ADMIN">Admin</option>
                      <option value="TENANT_ADMIN">Tenant Admin</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-green-600 text-white py-2 rounded text-sm hover:bg-green-700 font-medium"
                  >
                    Add User
                  </button>
                </form>
              </div>

              {/* Users List */}
              <div className="lg:col-span-2">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                          Email
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                          Role
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {tenantUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">{user.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{user.email}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tenantUsers.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      No users in this tenant yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
