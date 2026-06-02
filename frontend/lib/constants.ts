import { ActivityType, LeadStatus } from "./types";

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "LEAD", label: "Lead" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "NOT_INTERESTED", label: "Not Interested" },
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

export const COURSES = [
  "B.Tech Computer Science",
  "B.Tech Electronics",
  "BCA",
  "B.Sc Mathematics",
  "MBA"
];

export const SOURCES = [
  "Website",
  "Social Media",
  "Referral",
  "Advertisement",
  "Walk-in",
  "Collegedunia"
];

export const STUDENT_CASTE_CATEGORIES = [
  "DT/VJ",
  "NT-B",
  "NT-C",
  "NT-D",
  "OBC",
  "SBC",
  "SEBC",
  "OPEN",
  "SC",
  "ST"
] as const;
