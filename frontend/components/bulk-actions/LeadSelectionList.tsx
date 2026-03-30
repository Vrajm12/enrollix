'use client';

import { Lead } from '@/lib/types';

type LeadSelectionListProps = {
  leads: Lead[];
  selectedIds: number[];
  onToggle: (leadId: number) => void;
  onSelectAll: () => void;
  onClear: () => void;
  emptyMessage: string;
};

const formatLabel = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase();

const statusClasses: Record<Lead['status'], string> = {
  LEAD: 'bg-slate-100 text-slate-700',
  CONTACTED: 'bg-blue-50 text-blue-700',
  INTERESTED: 'bg-violet-50 text-violet-700',
  QUALIFIED: 'bg-amber-50 text-amber-700',
  APPLIED: 'bg-cyan-50 text-cyan-700',
  ENROLLED: 'bg-emerald-50 text-emerald-700',
};

const priorityClasses: Record<Lead['priority'], string> = {
  COLD: 'bg-slate-100 text-slate-700',
  WARM: 'bg-amber-50 text-amber-700',
  HOT: 'bg-rose-50 text-rose-700',
};

export default function LeadSelectionList({
  leads,
  selectedIds,
  onToggle,
  onSelectAll,
  onClear,
  emptyMessage,
}: LeadSelectionListProps) {
  const selectedCount = selectedIds.length;

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Select Leads</h3>
          <p className="text-sm text-slate-500">
            {selectedCount} of {leads.length} selected
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={onSelectAll}
            className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500">{emptyMessage}</div>
      ) : (
        <div className="max-h-[26rem] divide-y divide-slate-100 overflow-y-auto">
          {leads.map((lead) => {
            const isSelected = selectedIds.includes(lead.id);

            return (
              <label
                key={lead.id}
                className={`flex cursor-pointer items-start gap-4 px-5 py-4 transition ${
                  isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(lead.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{lead.name}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClasses[lead.status]}`}
                    >
                      {formatLabel(lead.status)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityClasses[lead.priority]}`}
                    >
                      {formatLabel(lead.priority)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{lead.phone}</p>
                  <p className="text-sm text-slate-500">
                    {lead.email ?? 'No email'} {lead.course ? `• ${lead.course}` : ''}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
