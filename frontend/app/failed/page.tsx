'use client';

import { useState } from 'react';
import { TrendingDown, RotateCcw, MessageSquare, Trash2, Archive } from 'lucide-react';

interface FailedLead {
  id: number;
  name: string;
  email: string;
  phone: string;
  failedDate: string;
  failureReason: 'budget' | 'timing' | 'not_qualified' | 'competitor' | 'other';
  lastContact: string;
  notes: string;
}

export default function FailedLeadsPage() {
  const [leads, setLeads] = useState<FailedLead[]>([
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      failedDate: '2026-03-20',
      failureReason: 'budget',
      lastContact: '2026-03-18',
      notes: 'Budget constraints, revisit after Q2',
    },
    {
      id: 2,
      name: 'Sarah Smith',
      email: 'sarah@example.com',
      phone: '555-5678',
      failedDate: '2026-03-15',
      failureReason: 'timing',
      lastContact: '2026-03-10',
      notes: 'Not ready, interested in future courses',
    },
    {
      id: 3,
      name: 'Mike Johnson',
      email: 'mike@example.com',
      phone: '555-9012',
      failedDate: '2026-03-10',
      failureReason: 'competitor',
      lastContact: '2026-03-08',
      notes: 'Chose competitor, but open to alternatives',
    },
  ]);

  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const failureReasons = {
    budget: { label: 'Budget Issues', color: 'bg-red-100 text-red-700', icon: '💰' },
    timing: { label: 'Timing', color: 'bg-yellow-100 text-yellow-700', icon: '⏰' },
    not_qualified: { label: 'Not Qualified', color: 'bg-gray-100 text-gray-700', icon: '❌' },
    competitor: { label: 'Competitor', color: 'bg-blue-100 text-blue-700', icon: '🎯' },
    other: { label: 'Other', color: 'bg-slate-100 text-slate-700', icon: '📝' },
  };

  const filteredLeads = selectedFilter === 'all' ? leads : leads.filter((l) => l.failureReason === selectedFilter);

  const stats = {
    total: leads.length,
    byReason: {
      budget: leads.filter((l) => l.failureReason === 'budget').length,
      timing: leads.filter((l) => l.failureReason === 'timing').length,
      competitor: leads.filter((l) => l.failureReason === 'competitor').length,
    },
  };

  const handleRecover = (id: number) => {
    setLeads(leads.filter((l) => l.id !== id));
  };

  const handleDelete = (id: number) => {
    setLeads(leads.filter((l) => l.id !== id));
  };

  return (
    <div className="flex bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen">
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto pt-20 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-12">
              <h1 className="text-4xl font-bold text-slate-900">Failed Leads</h1>
              <p className="text-slate-600 mt-2">Track and recover lost opportunities</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <div className="bg-white border border-slate-200/50 rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <TrendingDown size={20} className="text-red-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 uppercase">Total Failed</p>
                </div>
                <p className="text-3xl font-bold text-red-600">{stats.total}</p>
              </div>

              {Object.entries(stats.byReason).map(([key, count]) => (
                <div key={key} className="bg-white border border-slate-200/50 rounded-2xl p-6 backdrop-blur-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-lg">
                      {failureReasons[key as keyof typeof failureReasons].icon}
                    </div>
                    <p className="text-sm font-semibold text-slate-600 uppercase">
                      {failureReasons[key as keyof typeof failureReasons].label}
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{count}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-8 flex-wrap">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  selectedFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white border border-slate-200/50 text-slate-600 hover:bg-slate-50'
                }`}
              >
                All
              </button>
              {Object.entries(failureReasons).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => setSelectedFilter(key)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    selectedFilter === key
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white border border-slate-200/50 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Failed Leads Table */}
            <div className="bg-white border border-slate-200/50 rounded-2xl overflow-hidden shadow-sm">
              {/* Header */}
              <div className="grid grid-cols-[1.5fr,1.5fr,1fr,1.5fr,1.5fr,1.2fr] gap-4 p-6 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-white sticky top-0 font-semibold text-sm text-slate-600 uppercase tracking-wider">
                <div>Lead</div>
                <div>Failure Reason</div>
                <div>Failed On</div>
                <div>Last Contact</div>
                <div>Notes</div>
                <div>Actions</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-200/50">
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="grid grid-cols-[1.5fr,1.5fr,1fr,1.5fr,1.5fr,1.2fr] gap-4 p-6 items-center hover:bg-slate-50 transition-colors duration-200"
                  >
                    {/* Lead Info */}
                    <div>
                      <p className="font-semibold text-slate-900">{lead.name}</p>
                      <p className="text-xs text-slate-500">{lead.email}</p>
                    </div>

                    {/* Failure Reason */}
                    <div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          failureReasons[lead.failureReason as keyof typeof failureReasons].color
                        }`}
                      >
                        {failureReasons[lead.failureReason as keyof typeof failureReasons].label}
                      </span>
                    </div>

                    {/* Failed Date */}
                    <div className="text-sm text-slate-600">{lead.failedDate}</div>

                    {/* Last Contact */}
                    <div className="text-sm text-slate-600">{lead.lastContact}</div>

                    {/* Notes */}
                    <div className="text-sm text-slate-600 truncate">{lead.notes}</div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRecover(lead.id)}
                        className="px-3 py-1.5 bg-green-100 text-green-600 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                        title="Recover Lead"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors" title="Send Message">
                        <MessageSquare size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recovery Tips */}
            <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4">💡 Lead Recovery Tips</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="font-semibold text-slate-900 mb-2">Budget Issues?</p>
                  <p className="text-sm text-slate-600">Contact them in Q2 with special offers or payment plans</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 mb-2">Timing Issues?</p>
                  <p className="text-sm text-slate-600">Schedule follow-up for next admission cycle</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 mb-2">Competitor Lost?</p>
                  <p className="text-sm text-slate-600">Send success stories and unique offerings</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 mb-2">Not Qualified?</p>
                  <p className="text-sm text-slate-600">Offer alternative programs or refer to colleagues</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
