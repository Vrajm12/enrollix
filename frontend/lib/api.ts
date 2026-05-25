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
  const isFormDataBody = typeof FormData !== "undefined" && body instanceof FormData;
  const baseHeaders: Record<string, string> = {};
  const tenantSlug = getTenantSlugFromHost();
  if (tenantSlug) {
    baseHeaders["X-Tenant-Slug"] = tenantSlug;
  }
  if (body !== undefined && !isFormDataBody) {
    baseHeaders["Content-Type"] = "application/json";
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
      body:
        body == null
          ? undefined
          : isFormDataBody
            ? (body as FormData)
            : JSON.stringify(body),
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
  getFollowupsByDate: (date: string, page = 1, pageSize = 25, scope: "selected" | "today" | "missed" | "all" = "selected") =>
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
        totalRecords: number;
      };
      scope: "selected" | "today" | "missed" | "all";
    }>(`/dashboard/followups?date=${encodeURIComponent(date)}&page=${page}&pageSize=${pageSize}&scope=${scope}`),
  getTodayFollowups: () => request<Lead[]>("/dashboard/followups/today"),
  getMissedFollowups: () => request<Lead[]>("/dashboard/followups/missed"),
  getLeadsByStatus: () => request<Record<string, Lead[]>>("/dashboard/leads/by-status"),
  getRecentActivities: () => request<Activity[]>("/dashboard/activities/recent"),
  getDashboardSummary: () =>
    request<{
      totalLeads: number;
      enrolledCount: number;
      hotCount: number;
      todayFollowups: number;
      missedFollowups: number;
      upcomingFollowups: number;
      closedThisWeek: number;
      statusCounts: Record<string, number>;
      priorityCounts: Record<string, number>;
    }>("/dashboard/summary"),

  // Leads
  getLeads: (filters?: { state?: string; city?: string; course?: string }) => {
    const params = new URLSearchParams();
    if (filters?.state) params.append("state", filters.state);
    if (filters?.city) params.append("city", filters.city);
    if (filters?.course) params.append("course", filters.course);
    const query = params.toString();
    return request<Lead[]>(`/leads${query ? `?${query}` : ""}`);
  },
  getLeadsPage: (filters?: {
    state?: string;
    city?: string;
    course?: string;
    status?: LeadStatus;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.state) params.append("state", filters.state);
    if (filters?.city) params.append("city", filters.city);
    if (filters?.course) params.append("course", filters.course);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.pageSize) params.append("pageSize", String(filters.pageSize));
    params.append("paginated", "true");
    const query = params.toString();
    return request<{
      items: Lead[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      counts: Record<string, number>;
    }>(`/leads${query ? `?${query}` : ""}`);
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
    (async () => {
      try {
        return await request<{
          message: string;
          deletedCount: number;
          requestedCount: number;
        }>("/leads/bulk-delete", {
          method: "DELETE",
          body: { leadIds },
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return request<{
            message: string;
            deletedCount: number;
            requestedCount: number;
          }>("/bulk/leads/delete", {
            method: "DELETE",
            body: { leadIds },
          });
        }
        throw error;
      }
    })(),

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
          pincode: string | null;
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
  previewCsvImportUpload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{
      headers: string[];
      rows: {
        rowNumber: number;
        original: Record<string, string>;
        normalized: {
          name: string;
          phone: string;
          email: string | null;
          address: string | null;
          pincode: string | null;
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
      body: form
    });
  },
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
  commitCsvImportUpload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{
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
      body: form
    });
  },
  commitCsvChunk: (rows: Array<{
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    pincode: string | null;
    parentContact: string | null;
    course: string | null;
    source: string | null;
    status: LeadStatus;
    priority: Priority;
    nextFollowUp: string | null;
  }>) =>
    request<{
      message: string;
      createdCount: number;
      skippedCount: number;
      created: Array<{ id: number; name: string; phone: string; email: string | null; status: LeadStatus; priority: Priority }>;
      skipped: Array<{ rowNumber: number; name: string; reason: string }>;
    }>("/bulk/import/csv/chunk", {
      method: "POST",
      body: { rows },
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
  getTeamInsights: () =>
    request<{
      tenantSummary: {
        totalUsers: number;
        totalLeads: number;
        totalActivities: number;
        activeUsers: number;
        offlineUsers: number;
      };
      users: Array<{
        user: {
          id: number;
          name: string;
          email: string;
          role: "TENANT_ADMIN" | "ADMIN" | "COUNSELOR";
          createdAt: string;
        };
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
      }>;
    }>("/users/team/insights"),

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
  getFunnelReport: (startDate?: string, endDate?: string, state?: string, city?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (state) params.append("state", state);
    if (city) params.append("city", city);
    return request(`/reports/funnel?${params.toString()}`);
  },
  getRevenueReport: (startDate?: string, endDate?: string, state?: string, city?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (state) params.append("state", state);
    if (city) params.append("city", city);
    return request(`/reports/revenue?${params.toString()}`);
  },
  getTeamPerformanceReport: (startDate?: string, endDate?: string, state?: string, city?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (state) params.append("state", state);
    if (city) params.append("city", city);
    return request(`/reports/team-performance?${params.toString()}`);
  },
  getLeadSourcesReport: (startDate?: string, endDate?: string, state?: string, city?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (state) params.append("state", state);
    if (city) params.append("city", city);
    return request(`/reports/lead-sources?${params.toString()}`);
  },
  getPriorityDistributionReport: (startDate?: string, endDate?: string, state?: string, city?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (state) params.append("state", state);
    if (city) params.append("city", city);
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
