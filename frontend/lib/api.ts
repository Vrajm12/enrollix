import { clearStoredToken, getToken } from "./auth";
import { Activity, ActivityType, Lead, LeadStatus, Priority, User } from "./types";
import { getTenantSlugFromHost } from "./tenant";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  authenticated?: boolean;
};

const request = async <T>(
  path: string,
  { method = "GET", body, authenticated = true }: RequestOptions = {}
): Promise<T> => {
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const tenantSlug = getTenantSlugFromHost();
  if (tenantSlug) {
    baseHeaders["X-Tenant-Slug"] = tenantSlug;
  }

  const token = authenticated ? getToken() : null;
  const headers: Record<string, string> = { ...baseHeaders };

  if (authenticated && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const execute = async (requestHeaders: Record<string, string>) =>
    fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
      cache: "no-store",
    });

  let response = await execute(headers);

  // Retry once without Authorization header in case local token is stale.
  if (authenticated && token && response.status === 401) {
    response = await execute(baseHeaders);
    if (response.ok) {
      clearStoredToken();
    }
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message ?? "API request failed";
    throw new ApiError(message, response.status);
  }

  return data as T;
};

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token?: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password, tenantSlug: getTenantSlugFromHost() ?? undefined },
      authenticated: false,
    }),
  me: () => request<{ user: User }>("/auth/me"),
  logout: () =>
    request<{ success: boolean; message: string }>("/auth/logout", {
      method: "POST",
    }),

  // Dashboard
  getFollowupsByDate: (date: string, page = 1, pageSize = 25) =>
    request<{
      items: Lead[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      counts: {
        selectedDate: number;
        today: number;
        missed: number;
      };
    }>(`/dashboard/followups?date=${encodeURIComponent(date)}&page=${page}&pageSize=${pageSize}`),
  getTodayFollowups: () => request<Lead[]>("/dashboard/followups/today"),
  getMissedFollowups: () => request<Lead[]>("/dashboard/followups/missed"),
  getLeadsByStatus: () => request<Record<string, Lead[]>>("/dashboard/leads/by-status"),
  getRecentActivities: () => request<Activity[]>("/dashboard/activities/recent"),

  // Leads
  getLeads: (filters?: { region?: string; city?: string; course?: string }) => {
    const params = new URLSearchParams();
    if (filters?.region) params.append("region", filters.region);
    if (filters?.city) params.append("city", filters.city);
    if (filters?.course) params.append("course", filters.course);
    const query = params.toString();
    return request<Lead[]>(`/leads${query ? `?${query}` : ""}`);
  },
  getLead: (id: number) => request<Lead>(`/leads/${id}`),
  createLead: (payload: Partial<Lead>) =>
    request<Lead>("/leads", {
      method: "POST",
      body: payload,
    }),
  updateLead: (id: number, payload: Partial<Lead>) =>
    request<Lead>(`/leads/${id}`, {
      method: "PUT",
      body: payload,
    }),
  updateLeadStatus: (id: number, status: LeadStatus) =>
    request<Lead>(`/leads/${id}/status`, {
      method: "PATCH",
      body: { status },
    }),
  updateLeadPriority: (id: number, priority: Priority) =>
    request<Lead>(`/leads/${id}/priority`, {
      method: "PATCH",
      body: { priority },
    }),
  updateLeadFollowup: (id: number, nextFollowUp: string) =>
    request<Lead>(`/leads/${id}/followup`, {
      method: "PATCH",
      body: { nextFollowUp },
    }),
  deleteLeadsBulk: (leadIds: number[]) =>
    request<{
      message: string;
      deletedCount: number;
      requestedCount: number;
    }>("/leads/bulk-delete", {
      method: "DELETE",
      body: { leadIds },
    }),

  // Bulk actions
  previewCsvImport: (csv: string) =>
    request<{
      headers: string[];
      rows: {
        rowNumber: number;
        original: Record<string, string>;
        normalized: {
          name: string;
          phone: string;
          email: string | null;
          address: string | null;
          parentContact: string | null;
          course: string | null;
          source: string | null;
          status: LeadStatus;
          priority: Priority;
          nextFollowUp: string | null;
        } | null;
        status: "ready" | "duplicate" | "error";
        reasons: string[];
      }[];
      summary: {
        totalRows: number;
        readyRows: number;
        duplicateRows: number;
        errorRows: number;
      };
      rowsTruncated?: boolean;
      maxPreviewRows?: number;
    }>("/bulk/import/csv/preview", {
      method: "POST",
      body: { csv },
    }),
  commitCsvImport: (csv: string) =>
    request<{
      message: string;
      createdCount: number;
      skippedCount: number;
      duplicateCount: number;
      errorCount: number;
      created: Array<{
        id: number;
        name: string;
        phone: string;
        email: string | null;
        status: LeadStatus;
        priority: Priority;
      }>;
      skipped: Array<{
        rowNumber: number;
        name: string;
        reason: string;
      }>;
      rowsTruncated?: boolean;
      maxPreviewRows?: number;
    }>("/bulk/import/csv/commit", {
      method: "POST",
      body: { csv },
    }),
  bulkUpdateLeads: (payload: {
    leadIds: number[];
    updates: {
      status?: LeadStatus;
      priority?: Priority;
      assignedTo?: number | null;
      nextFollowUp?: string | null;
    };
  }) =>
    request<{
      message: string;
      updatedCount: number;
      requestedCount: number;
      ignoredCount: number;
    }>("/bulk/leads", {
      method: "PATCH",
      body: payload,
    }),
  exportLeads: (payload: {
    filters?: {
      status?: LeadStatus;
      priority?: Priority;
      assignedTo?: number | null;
    };
    columns: string[];
  }) =>
    request<{
      filename: string;
      totalRows: number;
      csv: string;
    }>("/bulk/export", {
      method: "POST",
      body: payload,
    }),

  // Activities
  getActivities: (leadId: number) => request<Activity[]>(`/activities/${leadId}`),
  createActivity: (payload: {
    leadId: number;
    type: ActivityType;
    notes: string;
    nextFollowUp: string;
  }) =>
    request<Activity>("/activities", {
      method: "POST",
      body: payload,
    }),

  // Users
  getCourseOptions: () =>
    request<{
      courseOptions: string[];
    }>("/users/course-options"),
  getCounselors: () =>
    request<
      {
        id: number;
        name: string;
        email: string;
        role: "TENANT_ADMIN" | "ADMIN" | "COUNSELOR";
      }[]
    >("/users/counselors"),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean; message: string }>("/users/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
    }),
  getTeamUsers: () =>
    request<{
      users: {
        id: number;
        name: string;
        email: string;
        role: "TENANT_ADMIN" | "ADMIN" | "COUNSELOR";
        createdAt: string;
      }[];
    }>("/users/team"),
  createTeamUser: (payload: { email: string; name: string; role: "ADMIN" | "COUNSELOR" }) =>
    request<{
      user: {
        id: number;
        name: string;
        email: string;
        role: "ADMIN" | "COUNSELOR";
        createdAt: string;
      };
      temporaryPassword: string;
    }>("/users/team", { method: "POST", body: payload }),
  allocateLeadRange: (payload: { userId: number; startLeadNumber: number; endLeadNumber: number }) =>
    request<{
      success: boolean;
      message: string;
      allocatedCount: number;
      range: { startLeadNumber: number; endLeadNumber: number };
      totalTenantLeads: number;
      assignee: { id: number; name: string; email: string; role: "ADMIN" | "COUNSELOR" };
    }>("/users/team/allocate-leads", {
      method: "POST",
      body: payload
    }),

  // Messaging - WhatsApp
  sendWhatsApp: (leadId: number, message: string, mediaUrl?: string) =>
    request("/messaging/whatsapp/send", {
      method: "POST",
      body: { leadId, message, mediaUrl },
    }),
  getWhatsAppThread: (leadId: number) => request(`/messaging/whatsapp/thread/${leadId}`),

  // Messaging - SMS
  sendSMS: (leadId: number, message: string) =>
    request("/messaging/sms/send", {
      method: "POST",
      body: { leadId, message },
    }),
  getSMSThread: (leadId: number) => request(`/messaging/sms/thread/${leadId}`),
  sendBulkMessage: (leadIds: number[], message: string, type: "whatsapp" | "sms") =>
    request("/messaging/bulk/send", {
      method: "POST",
      body: { leadIds, message, type },
    }),
  getMessagingStats: () => request("/messaging/stats"),

  // Reporting
  getFunnelReport: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return request(`/reports/funnel?${params.toString()}`);
  },
  getRevenueReport: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return request(`/reports/revenue?${params.toString()}`);
  },
  getTeamPerformanceReport: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return request(`/reports/team-performance?${params.toString()}`);
  },
  getLeadSourcesReport: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return request(`/reports/lead-sources?${params.toString()}`);
  },
  getPriorityDistributionReport: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return request(`/reports/priority-distribution?${params.toString()}`);
  },
  saveReport: (reportType: string, data: unknown, filters?: unknown) =>
    request("/reports/save", {
      method: "POST",
      body: { reportType, data, filters },
    }),
  getSavedReports: () => request("/reports/saved"),
  getSavedReport: (id: number) => request(`/reports/saved/${id}`),
};

export { ApiError };
