import { getToken } from "./auth";
import { Activity, ActivityType, Lead, LeadStatus, Priority, User } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH";
  body?: unknown;
  authenticated?: boolean;
};

const request = async <T>(
  path: string,
  { method = "GET", body, authenticated = true }: RequestOptions = {}
): Promise<T> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (authenticated) {
    const token = getToken();
    if (!token) {
      throw new ApiError("Session expired. Please log in again.", 401);
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });

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
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
      authenticated: false
    }),

  // Dashboard
  getTodayFollowups: () => request<Lead[]>("/dashboard/followups/today"),
  getMissedFollowups: () => request<Lead[]>("/dashboard/followups/missed"),
  getLeadsByStatus: () => request<Record<string, Lead[]>>("/dashboard/leads/by-status"),

  // Leads
  getLeads: () => request<Lead[]>("/leads"),
  getLead: (id: number) => request<Lead>(`/leads/${id}`),
  createLead: (payload: Partial<Lead>) =>
    request<Lead>("/leads", {
      method: "POST",
      body: payload
    }),
  updateLead: (id: number, payload: Partial<Lead>) =>
    request<Lead>(`/leads/${id}`, {
      method: "PUT",
      body: payload
    }),
  updateLeadStatus: (id: number, status: LeadStatus) =>
    request<Lead>(`/leads/${id}/status`, {
      method: "PATCH",
      body: { status }
    }),
  updateLeadPriority: (id: number, priority: Priority) =>
    request<Lead>(`/leads/${id}/priority`, {
      method: "PATCH",
      body: { priority }
    }),
  updateLeadFollowup: (id: number, nextFollowUp: string) =>
    request<Lead>(`/leads/${id}/followup`, {
      method: "PATCH",
      body: { nextFollowUp }
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
      body: payload
    }),

  // Users
  getCounselors: () =>
    request<
      {
        id: number;
        name: string;
        email: string;
        role: "ADMIN" | "COUNSELOR";
      }[]
    >("/users/counselors"),

  // Messaging - WhatsApp
  sendWhatsApp: (leadId: number, message: string, mediaUrl?: string) =>
    request("/messaging/whatsapp/send", {
      method: "POST",
      body: { leadId, message, mediaUrl }
    }),
  getWhatsAppThread: (leadId: number) =>
    request(`/messaging/whatsapp/thread/${leadId}`),

  // Messaging - SMS
  sendSMS: (leadId: number, message: string) =>
    request("/messaging/sms/send", {
      method: "POST",
      body: { leadId, message }
    }),
  getSMSThread: (leadId: number) =>
    request(`/messaging/sms/thread/${leadId}`),

  // Bulk Messaging
  sendBulkMessage: (leadIds: number[], message: string, type: "whatsapp" | "sms") =>
    request("/messaging/bulk/send", {
      method: "POST",
      body: { leadIds, message, type }
    }),

  // Messaging Statistics
  getMessagingStats: () =>
    request("/messaging/stats"),

  // Reporting - Funnel
  getFunnelReport: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return request(`/reports/funnel?${params.toString()}`);
  },

  // Reporting - Revenue
  getRevenueReport: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return request(`/reports/revenue?${params.toString()}`);
  },

  // Reporting - Team Performance
  getTeamPerformanceReport: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return request(`/reports/team-performance?${params.toString()}`);
  },

  // Reporting - Lead Sources
  getLeadSourcesReport: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return request(`/reports/lead-sources?${params.toString()}`);
  },

  // Reporting - Priority Distribution
  getPriorityDistributionReport: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return request(`/reports/priority-distribution?${params.toString()}`);
  },

  // Save Report
  saveReport: (reportType: string, data: any, filters?: any) =>
    request("/reports/save", {
      method: "POST",
      body: { reportType, data, filters }
    }),

  // Get Saved Reports
  getSavedReports: () =>
    request("/reports/saved"),

  // Get Specific Saved Report
  getSavedReport: (id: number) =>
    request(`/reports/saved/${id}`)
};

export { ApiError };
