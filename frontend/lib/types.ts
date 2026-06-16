export type UserRole = "SUPER_ADMIN" | "TENANT_ADMIN" | "ADMIN" | "COUNSELOR";

export type LeadStatus =
  | "LEAD"
  | "CONTACTED"
  | "NOT_INTERESTED"
  | "INTERESTED"
  | "QUALIFIED"
  | "APPLIED"
  | "ENROLLED";

export type ActivityType = "CALL" | "WHATSAPP" | "EMAIL" | "NOTE";

export type Priority = "COLD" | "WARM" | "HOT";

export interface User {
  id: number;
  tenantId: number;
  name: string;
  email: string;
  role: UserRole;
  tenantName?: string;
}

export interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  pincode: string | null;
  studentCasteCategory?: string | null;
  region: string | null;
  city: string | null;
  locality: string | null;
  parentContact: string | null;
  course: string | null;
  source: string | null;
  remarks: string | null;
  status: LeadStatus;
  priority: Priority;
  nextFollowUp: string | null;
  assignedTo: number | null;
  assignedCounselor?: {
    id: number;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: number;
  tenantId?: number;
  leadId: number;
  type: ActivityType;
  notes: string;
  createdAt: string;
  nextFollowUp: string;
  lead?: {
    id: number;
    name: string;
  };
}
