'use client';

import { useState } from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle2, Phone, MessageCircle, Mail } from 'lucide-react';

interface FollowUp {
  id: number;
  leadName: string;
  leadEmail: string;
  dueDate: string;
  priority: 'HOT' | 'WARM' | 'COLD';
  status: 'pending' | 'completed' | 'overdue';
  type: 'call' | 'email' | 'whatsapp';
  assignee: string;
}

export default function FollowupsPage() {
  const [view, setView] = useState<'calendar' | 'list'>('list');
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today'>('all');

  // Mock data
  const followups: FollowUp[] = [
    {
      id: 1,
      leadName: 'John Doe',
      leadEmail: 'john@example.com',
      dueDate: '2026-03-29',
      priority: 'HOT',
      status: 'overdue',
      type: 'call',
      assignee: 'You',
    },
    {
      id: 2,
      leadName: 'Sarah Smith',
      leadEmail: 'sarah@example.com',
      dueDate: '2026-03-29',
      priority: 'WARM',
      status: 'pending',
      type: 'email',
      assignee: 'You',
    },
    {
      id: 3,
      leadName: 'Mike Johnson',
      leadEmail: 'mike@example.com',
      dueDate: '2026-03-30',
      priority: 'COLD',
      status: 'pending',
      type: 'whatsapp',
      assignee: 'Team Lead',
    },
  ];

  const filteredFollowups = followups.filter((fu) => {
    if (filter === 'overdue') return fu.status === 'overdue';
    if (filter === 'today') return fu.dueDate === '2026-03-29';
    return true;
  });

  const statsCounts = {
    total: followups.length,
    overdue: followups.filter((f) => f.status === 'overdue').length,
    today: followups.filter((f) => f.dueDate === '2026-03-29').length,
    completed: followups.filter((f) => f.status === 'completed').length,
  };

  return (
    <div className="flex bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen">
      {/* Sidebar would go here */}

      <main className="flex-1 flex flex-col">
        {/* Navbar would go here */}

        <div className="flex-1 overflow-auto pt-20 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-12">
              <h1 className="text-4xl font-bold text-slate-900">Follow-ups</h1>
              <p className="text-slate-600 mt-2">Manage your lead follow-ups efficiently</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <div className="bg-white border border-slate-200/50 rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock size={20} className="text-blue-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 uppercase">Total</p>
                </div>
                <p className="text-3xl font-bold text-slate-900">{statsCounts.total}</p>
              </div>

              <div className="bg-white border border-slate-200/50 rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertCircle size={20} className="text-red-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 uppercase">Overdue</p>
                </div>
                <p className="text-3xl font-bold text-red-600">{statsCounts.overdue}</p>
              </div>

              <div className="bg-white border border-slate-200/50 rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Calendar size={20} className="text-orange-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 uppercase">Today</p>
                </div>
                <p className="text-3xl font-bold text-orange-600">{statsCounts.today}</p>
              </div>

              <div className="bg-white border border-slate-200/50 rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 size={20} className="text-green-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 uppercase">Completed</p>
                </div>
                <p className="text-3xl font-bold text-green-600">{statsCounts.completed}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setView('list')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    view === 'list'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white border border-slate-200/50 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  List View
                </button>
                <button
                  onClick={() => setView('calendar')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    view === 'calendar'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white border border-slate-200/50 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Calendar
                </button>
              </div>

              <div className="flex gap-2">
                {['all', 'overdue', 'today'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      filter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Follow-ups List */}
            <div className="bg-white border border-slate-200/50 rounded-2xl overflow-hidden shadow-sm">
              {/* Header */}
              <div className="grid grid-cols-[2fr,1.5fr,1fr,1.5fr,1fr,1fr] gap-4 p-6 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-white sticky top-0 font-semibold text-sm text-slate-600 uppercase tracking-wider">
                <div>Lead</div>
                <div>Due Date</div>
                <div>Priority</div>
                <div>Assignee</div>
                <div>Type</div>
                <div>Actions</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-200/50">
                {filteredFollowups.map((followup) => (
                  <div
                    key={followup.id}
                    className={`grid grid-cols-[2fr,1.5fr,1fr,1.5fr,1fr,1fr] gap-4 p-6 items-center hover:bg-slate-50 transition-colors duration-200 ${
                      followup.status === 'overdue' ? 'bg-red-50/30' : ''
                    }`}
                  >
                    {/* Lead Info */}
                    <div>
                      <p className="font-semibold text-slate-900">{followup.leadName}</p>
                      <p className="text-sm text-slate-500">{followup.leadEmail}</p>
                    </div>

                    {/* Due Date */}
                    <div className="text-sm text-slate-600">{followup.dueDate}</div>

                    {/* Priority */}
                    <div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          followup.priority === 'HOT'
                            ? 'bg-red-100 text-red-700'
                            : followup.priority === 'WARM'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {followup.priority}
                      </span>
                    </div>

                    {/* Assignee */}
                    <div className="text-sm text-slate-600">{followup.assignee}</div>

                    {/* Type */}
                    <div className="flex gap-1">
                      {followup.type === 'call' && (
                        <Phone size={18} className="text-blue-600" />
                      )}
                      {followup.type === 'email' && (
                        <Mail size={18} className="text-purple-600" />
                      )}
                      {followup.type === 'whatsapp' && (
                        <MessageCircle size={18} className="text-green-600" />
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors">
                        Update
                      </button>
                      <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
