"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Filter } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { clearSession, getUser } from "@/lib/auth";
import { Lead, LeadStatus } from "@/lib/types";
import { LEAD_STATUSES } from "@/lib/constants";
import { CITIES_BY_STATE, INDIA_STATES } from "@/lib/indiaLocations";
import Sidebar from "@/components/Sidebar";
import { LeadDetailPanel } from "@/components/LeadDetailPanel";
import { formatDate, isOverdue } from "@/lib/utils";

export function LeadListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [pincodeFilter, setPincodeFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [draftStateFilter, setDraftStateFilter] = useState("");
  const [draftCityFilter, setDraftCityFilter] = useState("");
  const [draftPincodeFilter, setDraftPincodeFilter] = useState("");
  const [draftCourseFilter, setDraftCourseFilter] = useState("");
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [activeTab, setActiveTab] = useState<LeadStatus | "ALL">(
    (searchParams.get("status") as LeadStatus) || "ALL"
  );
  const [canBulkDelete, setCanBulkDelete] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tenantCourseOptions, setTenantCourseOptions] = useState<string[]>([]);
  const [tenantPincodes, setTenantPincodes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const user = getUser();
    setCanBulkDelete(user?.role === "TENANT_ADMIN");
  }, []);

  useEffect(() => {
    void api
      .getCourseOptions()
      .then((response) => setTenantCourseOptions(response.courseOptions))
      .catch(() => setTenantCourseOptions([]));
  }, []);

  useEffect(() => {
    void api
      .getLeadPincodes()
      .then((response) => setTenantPincodes(response.pincodes))
      .catch(() => setTenantPincodes([]));
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const response = await api.getLeadsPage({
        state: stateFilter || undefined,
        city: cityFilter || undefined,
        pincode: pincodeFilter || undefined,
        course: courseFilter || undefined,
        status: activeTab === "ALL" ? undefined : activeTab,
        search: searchTerm || undefined,
        page,
        pageSize
      });
      setLeads(response.items || []);
      setTotalLeads(response.total || 0);
      setStatusCounts(response.counts || {});
      setTotalPages(response.totalPages || 1);
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
  }, [stateFilter, cityFilter, pincodeFilter, courseFilter, activeTab, searchTerm, page, pageSize]);

  const openFilterPopup = () => {
    setDraftStateFilter(stateFilter);
    setDraftCityFilter(cityFilter);
    setDraftPincodeFilter(pincodeFilter);
    setDraftCourseFilter(courseFilter);
    setShowFilterPopup(true);
  };

  const applyFilters = () => {
    setStateFilter(draftStateFilter.trim());
    setCityFilter(draftCityFilter.trim());
    setPincodeFilter(draftPincodeFilter.trim());
    setCourseFilter(draftCourseFilter.trim());
    setPage(1);
    setShowFilterPopup(false);
  };

  const clearFilters = () => {
    setDraftStateFilter("");
    setDraftCityFilter("");
    setDraftPincodeFilter("");
    setDraftCourseFilter("");
    setStateFilter("");
    setCityFilter("");
    setPincodeFilter("");
    setCourseFilter("");
    setPage(1);
    setShowFilterPopup(false);
  };

  const toggleLeadSelection = (leadId: number) => {
    setSelectedLeadIds((current) =>
      current.includes(leadId) ? current.filter((id) => id !== leadId) : [...current, leadId]
    );
  };

  const allFilteredSelected =
    leads.length > 0 && leads.every((lead) => selectedLeadIds.includes(lead.id));
  const draftCityOptions = draftStateFilter ? (CITIES_BY_STATE[draftStateFilter] ?? []) : [];
  const courseOptions = tenantCourseOptions;

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(leads.map((lead) => lead.id));
      setSelectedLeadIds((current) => current.filter((id) => !filteredIds.has(id)));
      return;
    }

    setSelectedLeadIds((current) => {
      const merged = new Set(current);
      leads.forEach((lead) => merged.add(lead.id));
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
    <div className="flex h-screen overflow-hidden bg-[#f3f8ff]">
      <Sidebar />

      <div className="flex flex-1 overflow-hidden md:ml-60">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="border-b border-slate-200 bg-white p-4 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Lead List</h1>
                <p className="text-sm text-slate-600">Manage and track all your leads</p>
              </div>
              <div className="flex items-center gap-2 self-start">
                <button
                  type="button"
                  onClick={openFilterPopup}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50"
                >
                  <Filter size={16} />
                  Filter
                </button>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 transition-colors"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </header>

          <div className="px-4 md:px-6 py-4 bg-white border-b border-slate-200">
            <input
              type="text"
              placeholder="Search by name, phone, email, or course..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {(stateFilter || cityFilter || pincodeFilter || courseFilter) && (
              <div className="mt-3 text-xs text-slate-600">
                Active filters:
                {stateFilter && <span className="ml-2 rounded bg-blue-100 px-2 py-1 text-blue-700">State: {stateFilter}</span>}
                {cityFilter && <span className="ml-2 rounded bg-blue-100 px-2 py-1 text-blue-700">City: {cityFilter}</span>}
                {pincodeFilter && <span className="ml-2 rounded bg-blue-100 px-2 py-1 text-blue-700">Pincode: {pincodeFilter}</span>}
                {courseFilter && <span className="ml-2 rounded bg-blue-100 px-2 py-1 text-blue-700">Course: {courseFilter}</span>}
              </div>
            )}
          </div>

          {showFilterPopup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
                <h3 className="text-lg font-bold text-slate-900">Apply Filters</h3>
                <p className="mt-1 text-sm text-slate-600">Filter leads by State, City, Pincode, and Course.</p>
                <div className="mt-4 space-y-3">
                  <select
                    value={draftStateFilter}
                    onChange={(e) => {
                      const nextState = e.target.value;
                      setDraftStateFilter(nextState);
                      if (nextState !== draftStateFilter) {
                        setDraftCityFilter("");
                      }
                    }}
                    className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
                  >
                    <option value="">All states</option>
                    {INDIA_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draftCityFilter}
                    onChange={(e) => setDraftCityFilter(e.target.value)}
                    disabled={!draftStateFilter}
                    className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm disabled:opacity-60"
                  >
                    <option value="">{draftStateFilter ? "All cities" : "Select state first"}</option>
                    {draftCityOptions.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draftCourseFilter}
                    onChange={(e) => setDraftCourseFilter(e.target.value)}
                    className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
                  >
                    <option value="">All courses</option>
                    {courseOptions.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draftPincodeFilter}
                    onChange={(e) => setDraftPincodeFilter(e.target.value)}
                    className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
                  >
                    <option value="">All pincodes</option>
                    {tenantPincodes.map((pincode) => (
                      <option key={pincode} value={pincode}>
                        {pincode}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowFilterPopup(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
                  <button type="button" onClick={clearFilters} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700">Clear</button>
                  <button type="button" onClick={applyFilters} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Apply</button>
                </div>
              </div>
            </div>
          )}

          <div className="border-b border-slate-200 bg-white overflow-x-auto">
            <div className="flex gap-2 px-4 md:px-6 py-3 min-w-min">
              <button
                onClick={() => {
                  setActiveTab("ALL");
                  setPage(1);
                  setSelectedLead(null);
                }}
                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${
                  activeTab === "ALL" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                All ({Object.values(statusCounts).reduce((sum, count) => sum + count, 0)})
              </button>

              {LEAD_STATUSES.map((status) => {
                const count = statusCounts[status.value] ?? 0;
                return (
                  <button
                    key={status.value}
                    onClick={() => {
                      setActiveTab(status.value);
                      setPage(1);
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
            ) : leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <span className="text-4xl mb-2">No leads</span>
                <p>{searchTerm ? "No leads match your search" : "No leads found"}</p>
              </div>
            ) : (
              <div className="p-4 md:p-6 space-y-2">
                {leads.map((lead) => (
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
                      selectedLead?.id === lead.id ? "bg-blue-50 border-blue-400 shadow-lg" : "bg-white hover:bg-blue-50"
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
                      <div className="md:col-span-2">
                        <h3 className="font-bold text-slate-900">{lead.name}</h3>
                        <p className="text-sm text-slate-600">{lead.phone}</p>
                        <p className="text-xs text-slate-500">{lead.email}</p>
                      </div>

                      <div className="hidden md:block">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Course</p>
                        <p className="text-sm text-slate-900">{lead.course || "-"}</p>
                      </div>

                      <div className="hidden md:block">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Priority</p>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-bold text-white ${
                            lead.priority === "COLD" ? "bg-blue-600" : lead.priority === "WARM" ? "bg-yellow-500" : "bg-red-600"
                          }`}
                        >
                          {lead.priority}
                        </span>
                      </div>

                      <div className="hidden md:block">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Follow-up</p>
                        {lead.nextFollowUp ? (
                          <p className={`text-sm font-semibold ${isOverdue(lead.nextFollowUp) ? "text-red-600" : "text-slate-900"}`}>
                            {formatDate(lead.nextFollowUp)}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400">-</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loading && totalPages > 1 && (
              <div className="px-4 md:px-6 pb-6">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <p className="text-sm text-slate-600">
                    Page {page} of {totalPages} • {totalLeads} lead(s)
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((value) => Math.max(value - 1, 1))}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <LeadDetailPanel lead={selectedLead} onClose={() => setSelectedLead(null)} loading={loading} />
      </div>
    </div>
  );
}
