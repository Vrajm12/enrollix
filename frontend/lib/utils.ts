import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function isOverdue(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

export function getPriorityColor(priority: string | undefined): string {
  if (!priority) return "bg-blue-100 text-blue-700";
  switch (priority) {
    case "HOT":
      return "bg-red-100 text-red-700";
    case "WARM":
      return "bg-yellow-100 text-yellow-700";
    case "COLD":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function getStatusColor(status: string | undefined): string {
  if (!status) return "bg-gray-100 text-gray-700";
  switch (status) {
    case "Lead":
      return "bg-blue-100 text-blue-700";
    case "Contacted":
      return "bg-purple-100 text-purple-700";
    case "Qualified":
      return "bg-green-100 text-green-700";
    case "Proposal":
      return "bg-orange-100 text-orange-700";
    case "Negotiation":
      return "bg-yellow-100 text-yellow-700";
    case "Closed":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
