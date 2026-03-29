export type UserRole = "ADMIN" | "COUNSELOR";

export type LeadStatus =
  | "LEAD"
  | "CONTACTED"
  | "INTERESTED"
  | "QUALIFIED"
  | "APPLIED"
  | "ENROLLED";

export type ActivityType = "CALL" | "WHATSAPP" | "EMAIL" | "NOTE";

export type Priority = "COLD" | "WARM" | "HOT";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface Lead {
  id: number;
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
  leadId: number;
  type: ActivityType;
  notes: string;
  createdAt: string;
  nextFollowUp: string;
}
