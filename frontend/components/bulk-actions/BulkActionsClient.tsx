'use client';

import { ChangeEvent, Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { Edit2, FileDown, Send, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import LeadSelectionList from '@/components/bulk-actions/LeadSelectionList';
import { clearSession, getToken } from '@/lib/auth';
import { LEAD_STATUSES } from '@/lib/constants';
import { ApiError, api } from '@/lib/api';
import { formatDate, getPriorityColor } from '@/lib/utils';
import { Lead, LeadStatus, Priority } from '@/lib/types';

type ActiveTab = 'import' | 'messaging' | 'updates' | 'export';
type FilterStatus = LeadStatus | 'ALL';
type FilterPriority = Priority | 'ALL';
type AssignedFilter = 'ALL' | 'UNASSIGNED' | `${number}`;
type MessageChannel = 'whatsapp' | 'sms';

type Counselor = {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'COUNSELOR';
};

type ImportPreviewRow = {
  rowNumber: number;
  original: Record<string, string>;
  normalized: {
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
  } | null;
  status: 'ready' | 'duplicate' | 'error';
  reasons: string[];
};

type ImportPreview = {
  headers: string[];
  rows: ImportPreviewRow[];
  summary: {
    totalRows: number;
    readyRows: number;
    duplicateRows: number;
    errorRows: number;
  };
};

type MessageTemplate = {
  id: number;
  name: string;
  channel: MessageChannel;
  body: string;
};

const REQUIRED_CSV_COLUMNS = ['name', 'phone'];
const OPTIONAL_CSV_COLUMNS = [
  'sr_no',
  'email',
  'address',
  'parent_contact',
  'course',
  'source',
  'status',
  'priority',
  'next_follow_up',
];
const PRIORITY_OPTIONS: Priority[] = ['COLD', 'WARM', 'HOT'];
const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 1,
    name: 'First response',
    channel: 'whatsapp',
    body: 'Hello from Enrollix. Thank you for your enquiry. Our admissions team will contact you shortly.',
  },
  {
    id: 2,
    name: 'Follow-up reminder',
    channel: 'sms',
    body: 'Reminder from Enrollix: please reply with a suitable time for your counselling call.',
  },
  {
    id: 3,
    name: 'Document checklist',
    channel: 'whatsapp',
    body: 'Please keep your marksheets, ID proof, and contact details ready for the admission discussion.',
  },
];
const EXPORT_COLUMNS = [
  { value: 'sr_no', label: 'Sr. no' },
  { value: 'name', label: 'Name' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'address', label: 'Address' },
  { value: 'parent_contact', label: 'Parent contact' },
  { value: 'course', label: 'Course' },
  { value: 'source', label: 'Source' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'next_follow_up', label: 'Next follow-up' },
  { value: 'assigned_counselor', label: 'Assigned counselor' },
  { value: 'created_at', label: 'Created at' },
  { value: 'updated_at', label: 'Updated at' },
] as const;
const DEFAULT_EXPORT_COLUMNS = ['sr_no', 'name', 'phone', 'email', 'status', 'priority', 'source'];

const statusBadgeClasses: Record<ImportPreviewRow['status'], string> = {
  ready: 'bg-emerald-100 text-emerald-700',
  duplicate: 'bg-amber-100 text-amber-700',
  error: 'bg-rose-100 text-rose-700',
};

const formatLeadStatus = (status: LeadStatus) =>
  LEAD_STATUSES.find((option) => option.value === status)?.label ?? status;

const toDatetimeLocalValue = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

const matchAssignedLead = (lead: Lead, filter: AssignedFilter) => {
  if (filter === 'ALL') return true;
  if (filter === 'UNASSIGNED') return lead.assignedTo == null;
  return lead.assignedTo === Number(filter);
};

export default function BulkActionsClient() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('import');
  const [loadingPage, setLoadingPage] = useState(true);
  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [messageChannel, setMessageChannel] = useState<MessageChannel>('whatsapp');
  const [messageText, setMessageText] = useState('');
  const [messageStatusFilter, setMessageStatusFilter] = useState<FilterStatus>('ALL');
  const [messagePriorityFilter, setMessagePriorityFilter] = useState<FilterPriority>('ALL');
  const [messageLeadIds, setMessageLeadIds] = useState<number[]>([]);
  const [messageLoading, setMessageLoading] = useState(false);
  const [updateStatusFilter, setUpdateStatusFilter] = useState<FilterStatus>('ALL');
  const [updatePriorityFilter, setUpdatePriorityFilter] = useState<FilterPriority>('ALL');
  const [updateLeadIds, setUpdateLeadIds] = useState<number[]>([]);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    priority: '',
    assignedTo: 'KEEP',
    nextFollowUp: '',
  });
  const [exportStatusFilter, setExportStatusFilter] = useState<FilterStatus>('ALL');
  const [exportPriorityFilter, setExportPriorityFilter] = useState<FilterPriority>('ALL');
  const [exportAssignedFilter, setExportAssignedFilter] = useState<AssignedFilter>('ALL');
  const [exportColumns, setExportColumns] = useState<string[]>(DEFAULT_EXPORT_COLUMNS);
  const [exportLoading, setExportLoading] = useState(false);

  const handleAuthFailure = () => {
    clearSession();
    router.replace('/login');
  };

  const handleApiError = (error: unknown, fallback: string) => {
    if (error instanceof ApiError && error.status === 401) {
      handleAuthFailure();
      return;
    }
    setPageError(error instanceof Error ? error.message : fallback);
  };

  const loadPageData = async () => {
    if (!getToken()) {
      handleAuthFailure();
      return;
    }

    setLoadingPage(true);
    setPageError('');

    try {
      const [leadData, counselorData] = await Promise.all([api.getLeads(), api.getCounselors()]);
      setLeads(leadData);
      setCounselors(counselorData);
    } catch (error) {
      handleApiError(error, 'Unable to load bulk actions data');
    } finally {
      setLoadingPage(false);
    }
  };

  useEffect(() => {
    void loadPageData();
  }, []);

  const filteredMessagingLeads = useMemo(
    () =>
      leads.filter(
        (lead) =>
          (messageStatusFilter === 'ALL' || lead.status === messageStatusFilter) &&
          (messagePriorityFilter === 'ALL' || lead.priority === messagePriorityFilter)
      ),
    [leads, messagePriorityFilter, messageStatusFilter]
  );

  const filteredUpdateLeads = useMemo(
    () =>
      leads.filter(
        (lead) =>
          (updateStatusFilter === 'ALL' || lead.status === updateStatusFilter) &&
          (updatePriorityFilter === 'ALL' || lead.priority === updatePriorityFilter)
      ),
    [leads, updatePriorityFilter, updateStatusFilter]
  );

  const exportLeadCount = useMemo(
    () =>
      leads.filter(
        (lead) =>
          (exportStatusFilter === 'ALL' || lead.status === exportStatusFilter) &&
          (exportPriorityFilter === 'ALL' || lead.priority === exportPriorityFilter) &&
          matchAssignedLead(lead, exportAssignedFilter)
      ).length,
    [exportAssignedFilter, exportPriorityFilter, exportStatusFilter, leads]
  );

  const resetFeedback = () => {
    setPageError('');
    setPageSuccess('');
  };

  const toggleLeadSelection = (setSelected: Dispatch<SetStateAction<number[]>>, leadId: number) => {
    setSelected((current) =>
      current.includes(leadId) ? current.filter((id) => id !== leadId) : [...current, leadId]
    );
  };

  const handleCsvUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetFeedback();
    setPreviewLoading(true);
    setImportLoading(false);

    try {
      const text = await file.text();
      const importPreview = await api.previewCsvImport(text);
      setCsvFileName(file.name);
      setCsvText(text);
      setPreview(importPreview);
      setPageSuccess(`Preview ready: ${importPreview.summary.readyRows} leads can be imported.`);
    } catch (error) {
      setPreview(null);
      setCsvText('');
      setCsvFileName(file.name);
      handleApiError(error, 'Unable to preview CSV file');
    } finally {
      setPreviewLoading(false);
      event.target.value = '';
    }
  };

  const handleCommitImport = async () => {
    if (!csvText) {
      setPageError('Upload a CSV file first.');
      return;
    }

    resetFeedback();
    setImportLoading(true);

    try {
      const result = await api.commitCsvImport(csvText);
      setPageSuccess(result.message);
      setPreview(null);
      setCsvText('');
      setCsvFileName('');
      await loadPageData();
    } catch (error) {
      handleApiError(error, 'Unable to import CSV');
    } finally {
      setImportLoading(false);
    }
  };

  const handleSendBulkMessage = async () => {
    if (messageLeadIds.length === 0) {
      setPageError('Select at least one lead for messaging.');
      return;
    }
    if (!messageText.trim()) {
      setPageError('Enter a message before sending.');
      return;
    }

    resetFeedback();
    setMessageLoading(true);

    try {
      await api.sendBulkMessage(messageLeadIds, messageText.trim(), messageChannel);
      setPageSuccess(`Queued ${messageChannel} message for ${messageLeadIds.length} lead(s).`);
      setMessageLeadIds([]);
      setMessageText('');
    } catch (error) {
      handleApiError(error, 'Unable to send bulk message');
    } finally {
      setMessageLoading(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (updateLeadIds.length === 0) {
      setPageError('Select at least one lead to update.');
      return;
    }

    const updates: {
      status?: LeadStatus;
      priority?: Priority;
      assignedTo?: number | null;
      nextFollowUp?: string | null;
    } = {};

    if (updateForm.status) updates.status = updateForm.status as LeadStatus;
    if (updateForm.priority) updates.priority = updateForm.priority as Priority;
    if (updateForm.assignedTo === 'UNASSIGN') updates.assignedTo = null;
    if (updateForm.assignedTo !== 'KEEP' && updateForm.assignedTo !== 'UNASSIGN') {
      updates.assignedTo = Number(updateForm.assignedTo);
    }
    if (updateForm.nextFollowUp) {
      updates.nextFollowUp = new Date(updateForm.nextFollowUp).toISOString();
    }

    if (Object.keys(updates).length === 0) {
      setPageError('Choose at least one field to update.');
      return;
    }

    resetFeedback();
    setUpdateLoading(true);

    try {
      const result = await api.bulkUpdateLeads({
        leadIds: updateLeadIds,
        updates,
      });
      setPageSuccess(result.message);
      setUpdateLeadIds([]);
      setUpdateForm({
        status: '',
        priority: '',
        assignedTo: 'KEEP',
        nextFollowUp: '',
      });
      await loadPageData();
    } catch (error) {
      handleApiError(error, 'Unable to update selected leads');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleExport = async () => {
    if (exportColumns.length === 0) {
      setPageError('Choose at least one export column.');
      return;
    }

    resetFeedback();
    setExportLoading(true);

    try {
      const filters: {
        status?: LeadStatus;
        priority?: Priority;
        assignedTo?: number | null;
      } = {};

      if (exportStatusFilter !== 'ALL') filters.status = exportStatusFilter;
      if (exportPriorityFilter !== 'ALL') filters.priority = exportPriorityFilter;
      if (exportAssignedFilter === 'UNASSIGNED') filters.assignedTo = null;
      if (exportAssignedFilter !== 'ALL' && exportAssignedFilter !== 'UNASSIGNED') {
        filters.assignedTo = Number(exportAssignedFilter);
      }

      const result = await api.exportLeads({
        filters,
        columns: exportColumns,
      });

      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      link.click();
      window.URL.revokeObjectURL(url);
      setPageSuccess(`Exported ${result.totalRows} lead(s) to ${result.filename}.`);
    } catch (error) {
      handleApiError(error, 'Unable to export leads');
    } finally {
      setExportLoading(false);
    }
  };

  const toggleExportColumn = (column: string) => {
    setExportColumns((current) =>
      current.includes(column) ? current.filter((item) => item !== column) : [...current, column]
    );
  };

  const previewReadyRows = preview?.rows.filter((row) => row.status === 'ready').length ?? 0;
  const filteredMessagingIds = filteredMessagingLeads.map((lead) => lead.id);
  const filteredUpdateIds = filteredUpdateLeads.map((lead) => lead.id);

  const renderStatusOptions = () => (
    <>
      <option value="ALL">All statuses</option>
      {LEAD_STATUSES.map((status) => (
        <option key={status.value} value={status.value}>
          {status.label}
        </option>
      ))}
    </>
  );

  const renderPriorityOptions = () => (
    <>
      <option value="ALL">All priorities</option>
      {PRIORITY_OPTIONS.map((priority) => (
        <option key={priority} value={priority}>
          {priority}
        </option>
      ))}
    </>
  );

  const renderImportTab = () => (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">CSV Format Guide</h2>
              <p className="mt-1 text-sm text-slate-600">
                Share this template with partners so imports match your CRM fields.
              </p>
            </div>
            <a
              href="/lead-import-template.csv"
              download
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <FileDown size={16} />
              Download Template
            </a>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Required headers
              </p>
              <div className="flex flex-wrap gap-2">
                {REQUIRED_CSV_COLUMNS.map((column) => (
                  <span
                    key={column}
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                  >
                    {column}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Optional headers
              </p>
              <div className="flex flex-wrap gap-2">
                {OPTIONAL_CSV_COLUMNS.map((column) => (
                  <span
                    key={column}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {column}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Accepted values</h2>
          <div className="mt-4 space-y-4 text-sm text-slate-600">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Status
              </p>
              <div className="flex flex-wrap gap-2">
                {LEAD_STATUSES.map((status) => (
                  <span
                    key={status.value}
                    className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                  >
                    {status.value}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Priority
              </p>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((priority) => (
                  <span
                    key={priority}
                    className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                  >
                    {priority}
                  </span>
                ))}
              </div>
            </div>
            <p className="rounded-xl bg-slate-50 px-4 py-3">
              Use ISO date format for <span className="font-semibold">next_follow_up</span>, for example{' '}
              <span className="font-semibold">2026-04-05T10:30:00.000Z</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-white p-10 text-center shadow-sm">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleCsvUpload}
          className="hidden"
        />
        <Upload size={42} className="mx-auto mb-4 text-blue-600" />
        <p className="text-xl font-bold text-slate-900">Upload lead CSV</p>
        <p className="mt-2 text-sm text-slate-600">
          Parse the file first, review duplicates and errors, then commit only the ready rows.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {previewLoading ? 'Reading CSV...' : 'Choose CSV file'}
          </button>
          {csvFileName ? <span className="text-sm font-medium text-slate-500">{csvFileName}</span> : null}
        </div>
      </div>

      {preview ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-100 p-5">
              <p className="text-sm text-slate-600">Rows scanned</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{preview.summary.totalRows}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-5">
              <p className="text-sm text-emerald-700">Ready</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">{preview.summary.readyRows}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-5">
              <p className="text-sm text-amber-700">Duplicates</p>
              <p className="mt-2 text-3xl font-bold text-amber-700">{preview.summary.duplicateRows}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-5">
              <p className="text-sm text-rose-700">Errors</p>
              <p className="mt-2 text-3xl font-bold text-rose-700">{preview.summary.errorRows}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Preview rows</h2>
                <p className="text-sm text-slate-500">
                  Ready rows will be created. Duplicate and error rows stay out of the import.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCommitImport}
                disabled={importLoading || previewReadyRows === 0}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {importLoading ? 'Importing...' : `Import ${previewReadyRows} lead(s)`}
              </button>
            </div>

            <div className="max-h-[30rem] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Row</th>
                    <th className="px-5 py-3 font-semibold">Lead</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.rows.map((row) => (
                    <tr key={row.rowNumber} className="align-top">
                      <td className="px-5 py-4 font-semibold text-slate-700">{row.rowNumber}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {row.normalized?.name ?? row.original.name ?? 'Unnamed lead'}
                        </p>
                        <p className="text-slate-600">{row.normalized?.phone ?? row.original.phone ?? '-'}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {row.normalized?.status ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                              {formatLeadStatus(row.normalized.status)}
                            </span>
                          ) : null}
                          {row.normalized?.priority ? (
                            <span
                              className={`rounded-full px-2.5 py-1 font-semibold ${getPriorityColor(
                                row.normalized.priority
                              )}`}
                            >
                              {row.normalized.priority}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses[row.status]}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {row.reasons.length > 0 ? row.reasons.join(', ') : 'Ready to import'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );

  const renderMessagingTab = () => (
    <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Saved templates</h2>
          <div className="mt-4 space-y-3">
            {MESSAGE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  setMessageChannel(template.channel);
                  setMessageText(template.body);
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{template.name}</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {template.channel}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{template.body}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Audience filters</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
              <select
                value={messageStatusFilter}
                onChange={(event) => setMessageStatusFilter(event.target.value as FilterStatus)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
              >
                {renderStatusOptions()}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Priority</label>
              <select
                value={messagePriorityFilter}
                onChange={(event) => setMessagePriorityFilter(event.target.value as FilterPriority)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
              >
                {renderPriorityOptions()}
              </select>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Only SMS and WhatsApp are enabled here because those are the supported backend channels.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <LeadSelectionList
          leads={filteredMessagingLeads}
          selectedIds={messageLeadIds}
          onToggle={(leadId) => toggleLeadSelection(setMessageLeadIds, leadId)}
          onSelectAll={() => setMessageLeadIds(filteredMessagingIds)}
          onClear={() => setMessageLeadIds([])}
          emptyMessage="No leads match the current messaging filters."
        />

        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Compose message</h2>
          <div className="mt-4 flex gap-3">
            {(['whatsapp', 'sms'] as MessageChannel[]).map((channel) => (
              <button
                key={channel}
                type="button"
                onClick={() => setMessageChannel(channel)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  messageChannel === channel
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Message body</label>
            <textarea
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              rows={6}
              placeholder="Write the message you want to send to the selected leads."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              {messageLeadIds.length} lead(s) selected for {messageChannel}.
            </p>
            <button
              type="button"
              onClick={handleSendBulkMessage}
              disabled={messageLoading}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {messageLoading ? 'Sending...' : 'Send bulk message'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUpdatesTab = () => (
    <div className="grid gap-6 xl:grid-cols-[1fr,0.95fr]">
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Lead filters</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
              <select
                value={updateStatusFilter}
                onChange={(event) => setUpdateStatusFilter(event.target.value as FilterStatus)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
              >
                {renderStatusOptions()}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Priority</label>
              <select
                value={updatePriorityFilter}
                onChange={(event) => setUpdatePriorityFilter(event.target.value as FilterPriority)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
              >
                {renderPriorityOptions()}
              </select>
            </div>
          </div>
        </div>

        <LeadSelectionList
          leads={filteredUpdateLeads}
          selectedIds={updateLeadIds}
          onToggle={(leadId) => toggleLeadSelection(setUpdateLeadIds, leadId)}
          onSelectAll={() => setUpdateLeadIds(filteredUpdateIds)}
          onClear={() => setUpdateLeadIds([])}
          emptyMessage="No leads match the current update filters."
        />
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Apply updates</h2>
        <p className="mt-1 text-sm text-slate-500">
          Set whichever fields you want to change and leave the rest untouched.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">New status</label>
            <select
              value={updateForm.status}
              onChange={(event) => setUpdateForm((current) => ({ ...current, status: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
            >
              <option value="">Keep current status</option>
              {LEAD_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">New priority</label>
            <select
              value={updateForm.priority}
              onChange={(event) => setUpdateForm((current) => ({ ...current, priority: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
            >
              <option value="">Keep current priority</option>
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Assign counselor</label>
            <select
              value={updateForm.assignedTo}
              onChange={(event) => setUpdateForm((current) => ({ ...current, assignedTo: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
            >
              <option value="KEEP">Keep current assignee</option>
              <option value="UNASSIGN">Unassign</option>
              {counselors.map((counselor) => (
                <option key={counselor.id} value={String(counselor.id)}>
                  {counselor.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Next follow-up</label>
            <input
              type="datetime-local"
              value={updateForm.nextFollowUp}
              onChange={(event) => setUpdateForm((current) => ({ ...current, nextFollowUp: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
          {updateLeadIds.length} lead(s) selected for update.
        </div>

        <button
          type="button"
          onClick={handleBulkUpdate}
          disabled={updateLoading}
          className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {updateLoading ? 'Updating...' : 'Apply bulk updates'}
        </button>
      </div>
    </div>
  );

  const renderExportTab = () => (
    <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Export filters</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
            <select
              value={exportStatusFilter}
              onChange={(event) => setExportStatusFilter(event.target.value as FilterStatus)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
            >
              {renderStatusOptions()}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Priority</label>
            <select
              value={exportPriorityFilter}
              onChange={(event) => setExportPriorityFilter(event.target.value as FilterPriority)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
            >
              {renderPriorityOptions()}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Assigned counselor</label>
            <select
              value={exportAssignedFilter}
              onChange={(event) => setExportAssignedFilter(event.target.value as AssignedFilter)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
            >
              <option value="ALL">All assignees</option>
              <option value="UNASSIGNED">Unassigned</option>
              {counselors.map((counselor) => (
                <option key={counselor.id} value={String(counselor.id)}>
                  {counselor.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-blue-50 px-4 py-4 text-sm text-blue-700">
          {exportLeadCount} lead(s) match the current export filters.
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Columns</h2>
            <p className="text-sm text-slate-500">Select the fields to include in the downloaded CSV.</p>
          </div>
          <button
            type="button"
            onClick={() => setExportColumns(DEFAULT_EXPORT_COLUMNS)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Reset defaults
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {EXPORT_COLUMNS.map((column) => (
            <label
              key={column.value}
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                checked={exportColumns.includes(column.value)}
                onChange={() => toggleExportColumn(column.value)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              {column.label}
            </label>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
          {exportColumns.length} column(s) selected.
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={exportLoading}
          className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {exportLoading ? 'Preparing export...' : 'Download CSV export'}
        </button>
      </div>
    </div>
  );

  if (loadingPage) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center md:ml-60">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-semibold text-slate-600 shadow-sm">
            Loading bulk actions...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Sidebar />

      <main className="flex flex-1 flex-col md:ml-60">
        <div className="flex-1 overflow-auto py-8 md:py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Bulk Actions</h1>
              <p className="mt-2 text-slate-600">
                Import leads, message them in batches, update pipelines, and export filtered data.
              </p>
            </div>

            {pageError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
                {pageError}
              </div>
            ) : null}
            {pageSuccess ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
                {pageSuccess}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 border-b border-slate-200/70 pb-3">
              {[
                { id: 'import' as const, label: 'Import CSV', icon: Upload },
                { id: 'messaging' as const, label: 'Bulk Messaging', icon: Send },
                { id: 'updates' as const, label: 'Bulk Updates', icon: Edit2 },
                { id: 'export' as const, label: 'Export Data', icon: FileDown },
              ].map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      resetFeedback();
                      setActiveTab(tab.id);
                    }}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === 'import' ? renderImportTab() : null}
            {activeTab === 'messaging' ? renderMessagingTab() : null}
            {activeTab === 'updates' ? renderUpdatesTab() : null}
            {activeTab === 'export' ? renderExportTab() : null}

            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 text-sm text-slate-500 shadow-sm">
              Live lead count: <span className="font-semibold text-slate-800">{leads.length}</span>
              {leads[0]?.updatedAt ? (
                <span className="ml-2">Latest lead update: {formatDate(leads[0].updatedAt)}</span>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
