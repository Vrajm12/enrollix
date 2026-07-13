"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  ACTIVITY_TYPES,
  LEAD_STATUSES,
  SOURCES,
  COURSES,
  STUDENT_CASTE_CATEGORIES
} from "@/lib/constants";
import { CITIES_BY_STATE, INDIA_STATES } from "@/lib/indiaLocations";
import { ApiError, api } from "@/lib/api";
import { clearSession, getToken, getUser, hasSession } from "@/lib/auth";
import { Activity, ActivityType, Lead, Priority, User } from "@/lib/types";
import { getPriorityColor, getStatusColor, formatDate, isOverdue } from "@/lib/utils";
import { Download } from "lucide-react";

type Counselor = {
  id: number;
  name: string;
  email: string;
  role: "TENANT_ADMIN" | "ADMIN" | "COUNSELOR";
};

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const leadId = Number(params.id);

  const [user, setUser] = useState<User | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [courseOptions, setCourseOptions] = useState<string[]>(COURSES);
  const [sourceOptions, setSourceOptions] = useState<string[]>(SOURCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingPriority, setSavingPriority] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(false);
  const [savingLeadDetails, setSavingLeadDetails] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [leadForm, setLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    course: "",
    source: "",
    address: "",
    pincode: "",
    studentCasteCategory: "",
    region: "",
    city: "",
    locality: "",
    parentContact: "",
    remarks: ""
  });
  const [activityForm, setActivityForm] = useState<{
    type: ActivityType;
    notes: string;
    nextFollowUp: string;
  }>({
    type: "CALL",
    notes: "",
    nextFollowUp: ""
  });

  const phoneForLinks = useMemo(() => {
    const cleaned = lead?.phone?.replace(/[^\d+]/g, "") ?? "";
    return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
  }, [lead?.phone]);
  const sourceOptionsWithCurrent = useMemo(() => {
    if (leadForm.source && !sourceOptions.includes(leadForm.source)) {
      return [leadForm.source, ...sourceOptions];
    }
    return sourceOptions;
  }, [leadForm.source, sourceOptions]);

  const cityOptions = useMemo(() => {
    if (!leadForm.region) return [];
    const options = CITIES_BY_STATE[leadForm.region] ?? [];
    if (leadForm.city && !options.includes(leadForm.city)) {
      return [leadForm.city, ...options];
    }
    return options;
  }, [leadForm.city, leadForm.region]);

  const loadData = async () => {
    if (!leadId || Number.isNaN(leadId)) {
      setError("Invalid lead id");
      setLoading(false);
      return;
    }

    try {
      const [leadResponse, activitiesResponse, counselorResponse, courseResponse, sourceResponse] = await Promise.all([
        api.getLead(leadId),
        api.getActivities(leadId),
        api.getCounselors(),
        api.getCourseOptions(),
        api.getLeadSources()
      ]);

      setLead(leadResponse);
      setLeadForm({
        name: leadResponse.name ?? "",
        email: leadResponse.email ?? "",
        phone: leadResponse.phone ?? "",
        course: leadResponse.course ?? "",
        source: leadResponse.source ?? "",
        address: leadResponse.address ?? "",
        pincode: leadResponse.pincode ?? "",
        studentCasteCategory: leadResponse.studentCasteCategory ?? "",
        region: leadResponse.region ?? "",
        city: leadResponse.city ?? "",
        locality: leadResponse.locality ?? "",
        parentContact: leadResponse.parentContact ?? "",
        remarks: (leadResponse as any).remarks ?? ""
      });
      if (leadResponse.nextFollowUp) {
        const date = new Date(leadResponse.nextFollowUp);
        setFollowUpDate(date.toISOString().slice(0, 16));
      }
      setActivities(activitiesResponse);
      setCounselors(counselorResponse);
      setCourseOptions(courseResponse.courseOptions.length > 0 ? courseResponse.courseOptions : COURSES);
      setSourceOptions(sourceResponse.sources.length > 0 ? sourceResponse.sources : SOURCES);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        if (!hasSession()) {
          clearSession();
          router.replace("/login");
          return;
        }

        setError("Session verification failed for this request. Please retry; if it persists, sign in again.");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to load lead");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasSession()) {
      router.replace("/login");
      return;
    }
    setUser(getUser());
    void loadData();
  }, [leadId, router]);

  const onUpdatePriority = async (newPriority: Priority) => {
    setSavingPriority(true);
    try {
      const updated = await api.updateLeadPriority(leadId, newPriority);
      setLead(updated);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update priority");
    } finally {
      setSavingPriority(false);
    }
  };

  const onUpdateStatus = async (newStatus: Lead["status"]) => {
    setSavingStatus(true);
    try {
      const updated = await api.updateLeadStatus(leadId, newStatus);
      setLead(updated);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  };

  const onUpdateFollowUp = async () => {
    if (!followUpDate) return;
    setSavingPriority(true);
    try {
      const updated = await api.updateLeadFollowup(leadId, new Date(followUpDate).toISOString());
      setLead(updated);
      setEditingFollowUp(false);
      if (typeof window !== "undefined") {
        localStorage.setItem("followups_refresh_at", String(Date.now()));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update follow-up");
    } finally {
      setSavingPriority(false);
    }
  };

  const onAddActivity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingActivity(true);
    setError(null);

    if (!activityForm.nextFollowUp) {
      setError("Next follow-up date is mandatory before saving activity.");
      setSavingActivity(false);
      return;
    }

    try {
      await api.createActivity({
        leadId,
        type: activityForm.type,
        notes: activityForm.notes,
        nextFollowUp: new Date(activityForm.nextFollowUp).toISOString()
      });
      const refreshed = await api.getActivities(leadId);
      setActivities(refreshed);
      await loadData();
      setActivityForm({
        type: "CALL",
        notes: "",
        nextFollowUp: ""
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save activity");
    } finally {
      setSavingActivity(false);
    }
  };

  const onSaveLeadDetails = async () => {
    if (!lead) return;
    setSavingLeadDetails(true);
    try {
      const updated = await api.updateLead(lead.id, {
        name: leadForm.name.trim(),
        phone: leadForm.phone.trim(),
        email: leadForm.email.trim(),
        course: leadForm.course.trim(),
        source: leadForm.source.trim(),
        address: leadForm.address.trim(),
        pincode: leadForm.pincode.trim(),
        studentCasteCategory: leadForm.studentCasteCategory,
        region: leadForm.region.trim(),
        city: leadForm.city.trim(),
        locality: leadForm.locality.trim(),
        parentContact: leadForm.parentContact.trim(),
        remarks: leadForm.remarks.trim(),
        status: lead.status,
        priority: lead.priority,
        assignedTo: lead.assignedTo,
        nextFollowUp: lead.nextFollowUp
      });
      setLead(updated);
      setLeadForm({
        name: updated.name ?? "",
        email: updated.email ?? "",
        phone: updated.phone ?? "",
        course: updated.course ?? "",
        source: updated.source ?? "",
        address: updated.address ?? "",
        pincode: updated.pincode ?? "",
        studentCasteCategory: updated.studentCasteCategory ?? "",
        region: updated.region ?? "",
        city: updated.city ?? "",
        locality: updated.locality ?? "",
        parentContact: updated.parentContact ?? "",
        remarks: (updated as any).remarks ?? ""
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save lead details");
    } finally {
      setSavingLeadDetails(false);
    }
  };

  const onExportActivityExcel = async () => {
    if (!lead) return;
    try {
      const xlsx = await import("xlsx/xlsx.mjs");
      const rows: Array<Array<string | number>> = [
        ["Lead Activity Log"],
        ["Lead Name", lead.name],
        ["Phone", lead.phone],
        ["Pincode", lead.pincode ?? ""],
        ["Student Caste Category", lead.studentCasteCategory ?? ""],
        ["State", lead.region ?? ""],
        ["District", lead.city ?? ""],
        ["City/Town/Village", lead.locality ?? ""],
        [],
        ["Activity Type", "Notes", "Created At", "Next Follow-up"]
      ];

      activities.forEach((activity) => {
        rows.push([
          activity.type,
          activity.notes,
          new Date(activity.createdAt).toLocaleString("en-IN"),
          new Date(activity.nextFollowUp).toLocaleString("en-IN")
        ]);
      });

      const worksheet = xlsx.utils.aoa_to_sheet(rows);
      worksheet["!cols"] = [{ wch: 18 }, { wch: 45 }, { wch: 24 }, { wch: 24 }];
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "Activity");
      const safeName = lead.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      xlsx.writeFile(workbook, `lead-activity-${safeName}.xlsx`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export activity log");
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Loading lead...</div>;
  }

  if (!lead) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-700">{error ?? "Lead not found"}</p>
        <Link href="/dashboard" className="mt-3 inline-block text-sm text-slate-700 underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 md:ml-60 flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{lead.name}</h1>
              <p className="text-sm text-slate-600">{lead.phone}</p>
            </div>
            <Link
              href="/leads"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Back to Leads
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 border-t border-slate-200 px-4 py-3 md:px-6">
          <a
            href={`tel:${lead.phone}`}
            className="rounded-md bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            📞 Call
          </a>
          <a
            href={`https://wa.me/${phoneForLinks}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
          >
            💬 WhatsApp
          </a>
          <a
            href={`mailto:${lead.email ?? ""}`}
            className="rounded-md bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
          >
            ✉️ Email
          </a>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-4 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:mx-6">
            {error}
          </div>
        )}

        <div className="grid gap-6 p-4 md:grid-cols-3 md:p-6">
        {/* Left Column: Lead Info */}
        <div className="space-y-4 md:col-span-2">
          {/* Priority & Status Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Priority Card */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block text-xs font-semibold uppercase text-slate-600">Priority</label>
              <div className="mt-2 flex gap-2">
                {(["COLD", "WARM", "HOT"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => onUpdatePriority(p)}
                    disabled={savingPriority}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                      lead.priority === p
                        ? getPriorityColor(p).replace("text-", "bg-") + " text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Card */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block text-xs font-semibold uppercase text-slate-600">Status</label>
              <select
                value={lead.status}
                onChange={(e) => onUpdateStatus(e.target.value as Lead["status"])}
                disabled={savingStatus}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lead Details Form */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Lead Information</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={leadForm.name}
                onChange={(e) => setLeadForm((current) => ({ ...current, name: e.target.value }))}
                placeholder="Name"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              />
              <input
                type="email"
                value={leadForm.email}
                onChange={(e) => setLeadForm((current) => ({ ...current, email: e.target.value }))}
                placeholder="Email"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              />
              <input
                type="text"
                value={leadForm.phone}
                onChange={(e) => setLeadForm((current) => ({ ...current, phone: e.target.value }))}
                placeholder="Phone"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              />
              <select
                value={leadForm.course}
                onChange={(e) => setLeadForm((current) => ({ ...current, course: e.target.value }))}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="">Select course</option>
                {courseOptions.map((course) => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
              <select
                value={leadForm.source}
                onChange={(e) => setLeadForm((current) => ({ ...current, source: e.target.value }))}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="">Select source</option>
                {sourceOptionsWithCurrent.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
              <select
                value={leadForm.studentCasteCategory}
                onChange={(e) =>
                  setLeadForm((current) => ({ ...current, studentCasteCategory: e.target.value }))
                }
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="">Student Caste Category</option>
                {STUDENT_CASTE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={leadForm.address}
                onChange={(e) => setLeadForm((current) => ({ ...current, address: e.target.value }))}
                placeholder="Address"
                className="col-span-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 md:col-span-2"
              />
              <input
                type="text"
                value={leadForm.pincode}
                onChange={(e) => setLeadForm((current) => ({ ...current, pincode: e.target.value }))}
                placeholder="Pincode"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              />
              <select
                value={leadForm.region}
                onChange={(e) =>
                  setLeadForm((current) => ({
                    ...current,
                    region: e.target.value,
                    city: e.target.value === current.region ? current.city : ""
                  }))
                }
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="">Select state</option>
                {INDIA_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              <select
                value={leadForm.city}
                onChange={(e) => setLeadForm((current) => ({ ...current, city: e.target.value }))}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                disabled={!leadForm.region}
              >
                <option value="">{leadForm.region ? "Select district" : "Select state first"}</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <input
                type="text"
                value={leadForm.locality}
                onChange={(e) => setLeadForm((current) => ({ ...current, locality: e.target.value }))}
                placeholder="City/Town/Village"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              />
              <input
                type="text"
                value={leadForm.parentContact}
                onChange={(e) => setLeadForm((current) => ({ ...current, parentContact: e.target.value }))}
                placeholder="Parent contact"
                className="col-span-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 md:col-span-2"
              />
              <textarea
                value={leadForm.remarks}
                onChange={(e) => setLeadForm((current) => ({ ...current, remarks: e.target.value }))}
                placeholder="Special remarks (e.g., interested in weekend batch, prefers evening calls)"
                className="col-span-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 md:col-span-2 h-24 resize-none"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onSaveLeadDetails}
                disabled={savingLeadDetails || !leadForm.name.trim() || !leadForm.phone.trim()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingLeadDetails ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">Activity History</h2>
              <button
                type="button"
                onClick={onExportActivityExcel}
                className="inline-flex items-center gap-2 rounded-md border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                <Download size={14} />
                Export Excel
              </button>
            </div>
            <div className="space-y-3">
              {activities.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                  No activities yet.
                </p>
              ) : (
                activities.map((activity, idx) => (
                  <div key={activity.id} className="relative border-l-2 border-slate-300 pl-4">
                    <div className="absolute left-0 top-0 h-3 w-3 -translate-x-[5px] rounded-full bg-slate-400"></div>
                    <div className="text-xs font-medium text-slate-600">
                      {activity.type} • {new Date(activity.createdAt).toLocaleDateString()}
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{activity.notes}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Follow-up: {new Date(activity.nextFollowUp).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Activity Logger (Sticky) */}
        <div className="md:col-span-1">
          <div className="sticky top-40 space-y-4">
            {/* Next Follow-up Info */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block text-xs font-semibold uppercase text-slate-600">Next Follow-up</label>
              {!editingFollowUp ? (
                <div className="mt-2">
                  {lead.nextFollowUp ? (
                    <>
                      <p className={`text-sm font-semibold ${isOverdue(lead.nextFollowUp) ? "text-red-600" : "text-slate-900"}`}>
                        {formatDate(lead.nextFollowUp)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(lead.nextFollowUp).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                      </p>
                      <button
                        onClick={() => setEditingFollowUp(true)}
                        className="mt-2 w-full rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        Edit
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditingFollowUp(true)}
                      className="mt-2 w-full rounded-md border-2 border-dashed border-slate-300 px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Set Follow-up
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <input
                    type="datetime-local"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={onUpdateFollowUp}
                      disabled={savingPriority || !followUpDate}
                      className="flex-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingFollowUp(false)}
                      className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Activity Logger */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Log Activity</h3>
              <form onSubmit={onAddActivity} className="space-y-3">
                <select
                  value={activityForm.type}
                  onChange={(e) => setActivityForm((c) => ({ ...c, type: e.target.value as ActivityType }))}
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>

                <textarea
                  value={activityForm.notes}
                  onChange={(e) => setActivityForm((c) => ({ ...c, notes: e.target.value }))}
                  placeholder="Notes *"
                  required
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs resize-none"
                  rows={3}
                />

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Next Follow-up *</label>
                  <input
                    type="datetime-local"
                    value={activityForm.nextFollowUp}
                    onChange={(e) => setActivityForm((c) => ({ ...c, nextFollowUp: e.target.value }))}
                    required
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingActivity}
                  className="w-full rounded-md bg-slate-900 px-2 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingActivity ? "Saving..." : "Add Activity"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      </div>
      </main>
    </div>
  );
}
