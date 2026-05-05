"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { clearSession, getUser } from "@/lib/auth";
import { Lead, LeadStatus } from "@/lib/types";
import { LEAD_STATUSES } from "@/lib/constants";
import Sidebar from "@/components/Sidebar";
import { LeadDetailPanel } from "@/components/LeadDetailPanel";
import { getPriorityColor } from "@/lib/utils";
import { formatDate, isOverdue } from "@/lib/utils";

export function LeadListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [activeTab, setActiveTab] = useState<LeadStatus | "ALL">(
    (searchParams.get("status") as LeadStatus) || "ALL"
  );
  const [canBulkDelete, setCanBulkDelete] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const user = getUser();
    setCanBulkDelete(user?.role === "TENANT_ADMIN");
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const response = await api.getLeads({
        region: regionFilter || undefined,
        city: cityFilter || undefined,
        course: courseFilter || undefined
      });
      setLeads(response || []);
      setSelectedLeadIds([]);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        window.location.href = "/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLeads();
  }, [regionFilter, cityFilter, courseFilter]);

  useEffect(() => {
    let filtered = leads;

    // Filter by status
    if (activeTab !== "ALL") {
      filtered = filtered.filter((lead) => lead.status === activeTab);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.name.toLowerCase().includes(term) ||
          lead.phone.toLowerCase().includes(term) ||
          lead.email?.toLowerCase().includes(term) ||
          lead.course?.toLowerCase().includes(term)
      );
    }

    setFilteredLeads(filtered);

  }, [leads, activeTab, searchTerm, selectedLead]);

  const toggleLeadSelection = (leadId: number) => {
    setSelectedLeadIds((current) =>
      current.includes(leadId) ? current.filter((id) => id !== leadId) : [...current, leadId]
    );
  };

  const allFilteredSelected =
    filteredLeads.length > 0 && filteredLeads.every((lead) => selectedLeadIds.includes(lead.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredLeads.map((lead) => lead.id));
      setSelectedLeadIds((current) => current.filter((id) => !filteredIds.has(id)));
      return;
    }

    setSelectedLeadIds((current) => {
      const merged = new Set(current);
      filteredLeads.forEach((lead) => merged.add(lead.id));
      return Array.from(merged);
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedLeadIds.length === 0 || isDeleting) return;

    const shouldDelete = window.confirm(
      `Delete ${selectedLeadIds.length} selected lead${selectedLeadIds.length > 1 ? "s" : ""}? This cannot be undone.`
    );
    if (!shouldDelete) return;

    try {
      setIsDeleting(true);
      await api.deleteLeadsBulk(selectedLeadIds);
      await loadLeads();
      setSelectedLead(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete selected leads");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f3f8ff]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-1 md:ml-60">
        {/* Lead List */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="border-b border-slate-200 bg-white p-4 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Lead List</h1>
                <p className="text-sm text-slate-600">
                  Manage and track all your leads
                </p>
              </div>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 transition-colors self-start"
              >
                ← Dashboard
              </Link>
            </div>
          </header>

          {/* Search Bar */}
          <div className="px-4 md:px-6 py-4 bg-white border-b border-slate-200">
            <div className="grid gap-3 md:grid-cols-4">
              <input
                type="text"
                placeholder="Search by name, phone, email, or course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="md:col-span-2 w-full px-4 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input placeholder="Filter region" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Filter city" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <input placeholder="Filter course" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="mt-3 w-full px-4 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200 bg-white overflow-x-auto">
            <div className="flex gap-2 px-4 md:px-6 py-3 min-w-min">
              <button
                onClick={() => {
                  setActiveTab("ALL");
                  setSelectedLead(null);
                }}
                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${
                  activeTab === "ALL"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                All ({leads.length})
              </button>

              {LEAD_STATUSES.map((status) => {
                const count = leads.filter((l) => l.status === status.value).length;
                return (
                  <button
                    key={status.value}
                    onClick={() => {
                      setActiveTab(status.value);
                      setSelectedLead(null);
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${
                      activeTab === status.value
                        ? "bg-blue-600 text-white"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    {status.label} ({count})
                  </button>
                );
              })}
            </div>
            {canBulkDelete && (
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 md:px-6 py-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Select all in current view
                </label>
                <button
                  type="button"
                  disabled={selectedLeadIds.length === 0 || isDeleting}
                  onClick={() => void handleDeleteSelected()}
                  className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? "Deleting..." : `Delete Selected (${selectedLeadIds.length})`}
                </button>
              </div>
            )}
          </div>

          {/* Lead List Content */}
          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="m-4 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-slate-500">Loading leads...</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <span className="text-4xl mb-2">📭</span>
                <p>
                  {searchTerm ? "No leads match your search" : "No leads found"}
                </p>
              </div>
            ) : (
              <div className="p-4 md:p-6 space-y-2">
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => {
                      if (typeof window !== "undefined" && window.innerWidth < 1024) {
                        router.push(`/leads/${lead.id}`);
                        return;
                      }
                      setSelectedLead(lead);
                    }}
                    className={`p-4 rounded-lg border border-slate-200 cursor-pointer transition-all hover:shadow-md ${
                      selectedLead?.id === lead.id
                        ? "bg-blue-50 border-blue-400 shadow-lg"
                        : "bg-white hover:bg-blue-50"
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {canBulkDelete && (
                        <div className="md:col-span-5">
                          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.includes(lead.id)}
                              onChange={() => toggleLeadSelection(lead.id)}
                              onClick={(event) => event.stopPropagation()}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Select lead
                          </label>
                        </div>
                      )}
                      {/* Name & Contact */}
                      <div className="md:col-span-2">
                        <h3 className="font-bold text-slate-900">{lead.name}</h3>
                        <p className="text-sm text-slate-600">{lead.phone}</p>
                        <p className="text-xs text-slate-500">{lead.email}</p>
                      </div>

                      {/* Course */}
                      <div className="hidden md:block">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Course</p>
                        <p className="text-sm text-slate-900">{lead.course || "—"}</p>
                      </div>

                      {/* Priority Badge */}
                      <div className="hidden md:block">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Priority</p>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-bold text-white ${
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

                      {/* Follow-up Date */}
                      <div className="hidden md:block">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Follow-up</p>
                        {lead.nextFollowUp ? (
                          <p
                            className={`text-sm font-semibold ${
                              isOverdue(lead.nextFollowUp)
                                ? "text-red-600"
                                : "text-slate-900"
                            }`}
                          >
                            {formatDate(lead.nextFollowUp)}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400">—</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Panel */}
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          loading={loading}
        />
      </div>
    </div>
  );
}
