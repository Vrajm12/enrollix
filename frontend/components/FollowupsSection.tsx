"use client";

import { Lead } from "@/lib/types";
import { formatDate, getPriorityColor, isOverdue } from "@/lib/utils";

interface FollowupsSectionProps {
  leads: Lead[];
  title: string;
  onOpenLead: (leadId: number) => void;
  isOverdue?: boolean;
}

export function FollowupsSection({
  leads,
  title,
  onOpenLead,
  isOverdue: highlightOverdue = false
}: FollowupsSectionProps) {
  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{title}</h2>
        <p className="text-sm text-slate-500">No follow-ups</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${highlightOverdue ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"} p-6`}>
      <h2 className={`text-lg font-semibold mb-4 ${highlightOverdue ? "text-red-900" : "text-slate-900"}`}>
        {title}
      </h2>

      <div className="space-y-3">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
              highlightOverdue
                ? "border-red-200 bg-white hover:bg-red-100"
                : "border-slate-200 hover:bg-slate-50"
            }`}
            onClick={() => onOpenLead(lead.id)}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">{lead.name}</p>
              <p className="text-sm text-slate-600">{lead.phone}</p>
              {lead.course && <p className="text-xs text-slate-500">{lead.course}</p>}
            </div>

            <div className="flex items-center gap-3 ml-4">
              <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getPriorityColor(lead.priority)}`}>
                {lead.priority}
              </span>
              <span className="text-xs text-slate-600 whitespace-nowrap">
                {formatDate(lead.nextFollowUp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
