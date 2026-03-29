"use client";

import { Lead } from "@/lib/types";
import { formatDate, getPriorityColor } from "@/lib/utils";

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  showFollowup?: boolean;
}

export function LeadCard({ lead, onClick, showFollowup = true }: LeadCardProps) {
  return (
    <div
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
    >
      {/* Name and Phone */}
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900 truncate">{lead.name}</h3>
        <p className="text-sm text-slate-600 truncate">{lead.phone}</p>
      </div>

      {/* Course and Priority Row */}
      <div className="mb-3 flex items-center justify-between gap-2">
        {lead.course && (
          <p className="text-xs text-slate-600 truncate bg-slate-50 rounded px-2 py-1">
            {lead.course}
          </p>
        )}
        <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getPriorityColor(lead.priority)}`}>
          {lead.priority}
        </span>
      </div>

      {/* Follow-up Date */}
      {showFollowup && lead.nextFollowUp && (
        <div className="pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">Next Follow-up</p>
          <p className="text-sm font-medium text-slate-900">
            {formatDate(lead.nextFollowUp)}
          </p>
        </div>
      )}

      {/* Assigned Counselor */}
      {lead.assignedCounselor && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">Assigned to</p>
          <p className="text-sm text-slate-900">{lead.assignedCounselor.name}</p>
        </div>
      )}
    </div>
  );
}
