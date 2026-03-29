"use client";

import { Lead, Priority } from "@/lib/types";
import { getPriorityColor, getStatusColor, formatDate, isOverdue } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

interface LeadDetailPanelProps {
  lead: Lead | null;
  onClose: () => void;
  loading?: boolean;
}

export function LeadDetailPanel({ lead, onClose, loading }: LeadDetailPanelProps) {
  const [showFullDetails, setShowFullDetails] = useState(false);

  if (!lead) {
    return (
      <div className="w-96 border-l border-slate-200 bg-white hidden lg:flex flex-col items-center justify-center text-slate-400">
        <span className="text-4xl mb-2">👤</span>
        <p>Select a lead to view details</p>
      </div>
    );
  }

  return (
    <div className="w-96 border-l border-slate-200 bg-white flex flex-col max-h-screen hidden lg:flex">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-slate-900">{lead.name}</h3>
          <p className="text-sm text-slate-500">{lead.phone}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-xl"
        >
          ✕
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Quick Stats */}
        <div className="p-4 space-y-3 border-b border-slate-200">
          {/* Priority Badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase">Priority</span>
            <span
              className={`px-2 py-1 rounded text-xs font-bold text-white ${
                lead.priority === "COLD"
                  ? "bg-blue-600"
                  : lead.priority === "WARM"
                    ? "bg-yellow-500"
                    : "bg-red-600"
              }`}
            >
              {lead.priority}
            </span>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase">Status</span>
            <span className="px-2 py-1 rounded text-xs font-bold bg-slate-200 text-slate-700">
              {lead.status}
            </span>
          </div>

          {/* Next Follow-up */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase">Follow-up</span>
            {lead.nextFollowUp ? (
              <span
                className={`text-xs font-semibold ${
                  isOverdue(lead.nextFollowUp) ? "text-red-600" : "text-slate-700"
                }`}
              >
                {formatDate(lead.nextFollowUp)}
              </span>
            ) : (
              <span className="text-xs text-slate-400">Not set</span>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="p-4 border-b border-slate-200">
          <h4 className="text-xs font-semibold text-slate-600 uppercase mb-3">Contact Info</h4>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <a
                href={`mailto:${lead.email}`}
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {lead.email || "—"}
              </a>
            </div>
            <div>
              <p className="text-xs text-slate-500">Phone</p>
              <a href={`tel:${lead.phone}`} className="text-sm font-medium text-slate-900">
                {lead.phone}
              </a>
            </div>
            <div>
              <p className="text-xs text-slate-500">Address</p>
              <p className="text-sm text-slate-700">{lead.address || "—"}</p>
            </div>
          </div>
        </div>

        {/* Lead Information */}
        <div className="p-4 border-b border-slate-200">
          <h4 className="text-xs font-semibold text-slate-600 uppercase mb-3">Lead Info</h4>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500">Course</p>
              <p className="text-sm font-medium text-slate-900">{lead.course || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Source</p>
              <p className="text-sm font-medium text-slate-900">{lead.source || "—"}</p>
            </div>
            {lead.parentContact && (
              <div>
                <p className="text-xs text-slate-500">Parent Contact</p>
                <p className="text-sm font-medium text-slate-900">{lead.parentContact}</p>
              </div>
            )}
          </div>
        </div>

        {/* Assigned Counselor */}
        {lead.assignedCounselor && (
          <div className="p-4 border-b border-slate-200">
            <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Assigned To</h4>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {lead.assignedCounselor.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{lead.assignedCounselor.name}</p>
                <p className="text-xs text-slate-500">{lead.assignedCounselor.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Created Date */}
        <div className="p-4 border-b border-slate-200">
          <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Lead Age</h4>
          <p className="text-sm text-slate-900">
            {lead.createdAt
              ? new Date(lead.createdAt).toLocaleDateString()
              : "—"}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="p-4 space-y-2">
          <Link
            href={`/leads/${lead.id}`}
            className="w-full block text-center px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            Open Full Details
          </Link>
          <a
            href={`tel:${lead.phone}`}
            className="w-full block text-center px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            📞 Call
          </a>
          <a
            href={`https://wa.me/${lead.phone.replace(/[^\d+]/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="w-full block text-center px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            💬 WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
