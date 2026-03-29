import { ActivityType, LeadStatus } from "./types";

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "LEAD", label: "Lead" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "INTERESTED", label: "Interested" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "APPLIED", label: "Applied" },
  { value: "ENROLLED", label: "Enrolled" }
];

export const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "CALL", label: "Call" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
  { value: "NOTE", label: "Note" }
];
