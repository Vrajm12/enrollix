'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Mail, MessageCircle, Phone, Users, Check, Trash2, Edit, X, AlertCircle } from 'lucide-react';
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
  const [actioningIds, setActioningIds] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

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

  const handleCompleteFollowup = async (leadId: number) => {
    try {
      setActioningIds((prev) => new Set(prev).add(leadId));
      await api.completeLeadFollowup(leadId);
      setFollowups((prev) => prev.filter((lead) => lead.id !== leadId));
      setRefreshTick((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete follow-up');
    } finally {
      setActioningIds((prev) => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
    }
  };

  const handleDeleteFollowup = async (leadId: number) => {
    if (!confirm('Are you sure you want to delete this follow-up?')) return;
    try {
      setActioningIds((prev) => new Set(prev).add(leadId));
      await api.deleteLeadFollowup(leadId);
      setFollowups((prev) => prev.filter((lead) => lead.id !== leadId));
      setRefreshTick((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete follow-up');
    } finally {
      setActioningIds((prev) => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
    }
  };

  const handleUpdateFollowup = async (leadId: number) => {
    if (!editDate) {
      setEditError('Please select a date');
      return;
    }
    try {
      setActioningIds((prev) => new Set(prev).add(leadId));
      await api.updateLeadFollowup(leadId, new Date(editDate).toISOString());
      setEditingId(null);
      setEditDate('');
      setEditError(null);
      setRefreshTick((value) => value + 1);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update follow-up');
    } finally {
      setActioningIds((prev) => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
    }
  };

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
                      <div className="flex gap-2 items-center">
                        <button
                          type="button"
                          onClick={() => handleCompleteFollowup(lead.id)}
                          disabled={actioningIds.has(lead.id)}
                          className="rounded-lg bg-green-100 p-2 text-green-600 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          title="Mark as complete"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(lead.id);
                            setEditDate(lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().split('T')[0] : '');
                            setEditError(null);
                          }}
                          disabled={actioningIds.has(lead.id)}
                          className="rounded-lg bg-blue-100 p-2 text-blue-600 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          title="Edit date"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFollowup(lead.id)}
                          disabled={actioningIds.has(lead.id)}
                          className="rounded-lg bg-red-100 p-2 text-red-600 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          title="Delete follow-up"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Edit Follow-up Modal */}
            {editingId && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Update Follow-up Date</h3>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditDate('');
                        setEditError(null);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  {editError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
                      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      <span>{editError}</span>
                    </div>
                  )}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">New Date & Time</label>
                    <input
                      type="datetime-local"
                      value={editDate}
                      onChange={(e) => {
                        setEditDate(e.target.value);
                        setEditError(null);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditDate('');
                        setEditError(null);
                      }}
                      className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdateFollowup(editingId)}
                      disabled={actioningIds.has(editingId)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>
            )}

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
