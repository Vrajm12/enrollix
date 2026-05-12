'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Mail, MessageCircle, Phone, Users } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { ApiError, api } from '@/lib/api';
import { clearSession, hasSession } from '@/lib/auth';
import { Lead } from '@/lib/types';

const formatDate = (value: string | null) => {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const todayLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function FollowupsPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState('');
  const [scope, setScope] = useState<'selected' | 'today' | 'missed' | 'all'>('selected');
  const [followups, setFollowups] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({ selectedDate: 0, today: 0, missed: 0, totalRecords: 0 });
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!hasSession()) {
      router.replace('/login');
      return;
    }
    setSelectedDate(todayLocal());
  }, [router]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "followups_refresh_at") {
        setRefreshTick((value) => value + 1);
      }
    };
    const onFocus = () => setRefreshTick((value) => value + 1);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!selectedDate) return;

    const loadFollowups = async () => {
      try {
        setLoading(true);
        const response = await api.getFollowupsByDate(selectedDate, page, 25, scope);
        setFollowups(response.items);
        setTotal(response.total);
        setTotalPages(response.totalPages);
        setCounts(response.counts);
        setError(null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearSession();
          router.replace('/login');
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load follow-ups');
      } finally {
        setLoading(false);
      }
    };

    void loadFollowups();
  }, [page, refreshTick, router, scope, selectedDate]);

  const selectedLabel = useMemo(() => {
    if (!selectedDate) return '';
    return new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [selectedDate]);

  const summaryCards = [
    { key: 'selected' as const, label: 'Selected Date', value: counts.selectedDate, valueClass: 'text-slate-900' },
    { key: 'today' as const, label: 'Today', value: counts.today, valueClass: 'text-cyan-600' },
    { key: 'missed' as const, label: 'Missed', value: counts.missed, valueClass: 'text-red-600' },
    { key: 'all' as const, label: 'Total Records', value: counts.totalRecords, valueClass: 'text-blue-700' },
  ];

  const scopeLabel =
    scope === 'today'
      ? "Today's follow-ups"
      : scope === 'missed'
        ? 'Missed follow-ups'
        : scope === 'all'
          ? 'All follow-ups'
          : `Follow-ups for ${selectedLabel}`;

  return (
    <div className="flex min-h-screen bg-[#f3f8ff]">
      <Sidebar />
      <main className="flex-1 md:ml-60">
        <div className="pt-20 pb-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">Follow-ups</h1>
                <p className="mt-2 text-slate-600">Shows follow-ups by date with pagination for large datasets.</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white p-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Choose Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
              {summaryCards.map((card) => {
                const active = scope === card.key;
                return (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() => {
                      setScope(card.key);
                      setPage(1);
                    }}
                    className={`rounded-2xl border bg-white p-6 text-left shadow-sm transition ${active ? 'border-blue-500 ring-2 ring-blue-100' : 'border-blue-100 hover:border-blue-300'}`}
                  >
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">{card.label}</p>
                    <p className={`mt-2 text-3xl font-bold ${card.valueClass}`}>{card.value}</p>
                  </button>
                );
              })}
            </div>

            <div className="mb-3 flex items-center justify-between text-sm text-slate-600">
              <p>Showing: {scopeLabel}</p>
              <p>Page {page} of {totalPages}</p>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-white shadow-sm overflow-x-auto">
              <div className="grid min-w-[900px] grid-cols-[2fr,1.3fr,1.2fr,0.8fr,1fr] gap-4 border-b border-blue-100 bg-blue-50 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <div>Lead</div>
                <div>Due Date</div>
                <div>Assignee</div>
                <div>Contact</div>
                <div>Actions</div>
              </div>

              <div className="min-w-[900px] divide-y divide-blue-100">
                {loading ? (
                  <div className="px-6 py-12 text-center text-sm text-slate-600">Loading follow-ups...</div>
                ) : followups.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-slate-600">No follow-ups found for this date.</div>
                ) : (
                  followups.map((lead) => (
                    <div key={lead.id} className="grid grid-cols-[2fr,1.3fr,1.2fr,0.8fr,1fr] items-center gap-4 px-6 py-5 hover:bg-blue-50">
                      <div>
                        <p className="font-semibold text-slate-900">{lead.name}</p>
                        <p className="text-sm text-slate-500">{lead.email || lead.phone}</p>
                      </div>
                      <div className="text-sm text-slate-600">{formatDate(lead.nextFollowUp)}</div>
                      <div className="text-sm text-slate-600">{lead.assignedCounselor?.name || (lead.assignedTo ? `User #${lead.assignedTo}` : 'Unassigned')}</div>
                      <div className="flex gap-2 text-slate-500">
                        {lead.phone && <a href={`tel:${lead.phone}`}><Phone size={18} className="text-blue-600" /></a>}
                        {lead.email && <a href={`mailto:${lead.email}`}><Mail size={18} className="text-cyan-600" /></a>}
                        {lead.phone && (
                          <button type="button" onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank')} className="text-green-600">
                            <MessageCircle size={18} />
                          </button>
                        )}
                      </div>
                      <div>
                        <Link href={`/leads/${lead.id}`} className="rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200">View</Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1 || loading}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages || loading}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>

            <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <Users size={16} className="mr-2 inline-block align-text-bottom" />
              Large data is handled with server-side pagination and date-based fetch.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
