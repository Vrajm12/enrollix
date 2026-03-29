"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { AddLeadModal } from "@/components/AddLeadModal";
import { LeadDetailDrawer } from "@/components/LeadDetailDrawer";
import { ModernKPICard } from "@/components/ModernKPICard";
import { LeadFunnel } from "@/components/LeadFunnel";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { PipelineProgress } from "@/components/PipelineProgress";
import { ApiError, api } from "@/lib/api";
import { clearSession, getToken, getUser } from "@/lib/auth";
import { Lead, User } from "@/lib/types";
import { Users, TrendingUp, Target, Zap } from "lucide-react";

type Counselor = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "COUNSELOR";
};

const STATUSES = ["Lead", "Contacted", "Qualified", "Proposal", "Negotiation", "Closed"];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [todayFollowups, setTodayFollowups] = useState<Lead[]>([]);
  const [missedFollowups, setMissedFollowups] = useState<Lead[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [leadList, todayList, missedList, counselorList] = await Promise.all([
        api.getLeads(),
        api.getTodayFollowups(),
        api.getMissedFollowups(),
        api.getCounselors(),
      ]);
      setLeads(leadList);
      setTodayFollowups(todayList);
      setMissedFollowups(missedList);
      setCounselors(counselorList);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setUser(getUser());
    void loadDashboardData();
  }, [router]);

  const handleAddLead = async (data: any) => {
    setIsSaving(true);
    try {
      await api.createLead(data);
      await loadDashboardData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add lead");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePriority = async (leadId: number, priority: string) => {
    setIsSaving(true);
    try {
      await api.updateLeadPriority(leadId, priority as any);
      await loadDashboardData();
      if (selectedLead) {
        setSelectedLead({ ...selectedLead, priority: priority as any });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update priority");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (leadId: number, status: string) => {
    setIsSaving(true);
    try {
      await api.updateLeadStatus(leadId, status as any);
      await loadDashboardData();
      if (selectedLead) {
        setSelectedLead({ ...selectedLead, status: status as any });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    router.replace("/login");
  };

  const handleOpenLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const handleCall = (lead: Lead) => {
    window.open(`tel:${lead.phone}`, "_blank");
  };

  const handleWhatsApp = (lead: Lead) => {
    window.open(
      `https://wa.me/${lead.phone.replace(/\D/g, "")}?text=Hi%20${lead.name}`,
      "_blank"
    );
  };

  const handleEmail = (lead: Lead) => {
    if (lead.email) {
      window.location.href = `mailto:${lead.email}`;
    }
  };

  const pipelineColumns = STATUSES.map((status) => ({
    status,
    label: status,
    leads: leads.filter((lead) => lead.status === status),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-gray-600 mt-3">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 md:ml-60 flex flex-col">
        {/* Navbar */}
        <Navbar 
          onAddLead={() => setIsAddLeadModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="pt-20 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Header */}
              <div className="mb-12">
                <h1 className="text-4xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-600 mt-2">Welcome back! Here's your sales overview.</p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-8 rounded-xl border border-red-200/50 bg-red-50 px-6 py-4 text-sm text-red-700 animate-slide-down backdrop-blur-sm">
                  {error}
                </div>
              )}

              {/* Modern KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <ModernKPICard
                  title="Total Leads"
                  value={leads.length}
                  trend={12}
                  subtitle="Active leads in pipeline"
                  icon={<Users size={24} />}
                  color="blue"
                  comparison="+2 this week"
                />
                <ModernKPICard
                  title="Conversion Rate"
                  value={(leads.filter(l => l.status === "ENROLLED").length / leads.length * 100).toFixed(1) + '%'}
                  trend={5}
                  icon={<TrendingUp size={24} />}
                  color="green"
                  comparison="vs last month"
                />
                <ModernKPICard
                  title="Hot Leads"
                  value={leads.filter((l) => l.priority === "HOT").length}
                  trend={-3}
                  icon={<Target size={24} />}
                  color="orange"
                  comparison="High priority"
                />
                <ModernKPICard
                  title="Follow-ups Today"
                  value={todayFollowups.length}
                  trend={8}
                  icon={<Zap size={24} />}
                  color="purple"
                  comparison={`${missedFollowups.length} missed`}
                />
              </div>

              {/* Main Grid - Funnel and Pipeline */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* Lead Funnel - Takes 2 columns */}
                <div className="lg:col-span-2">
                  <LeadFunnel
                    stages={[
                      { name: 'Lead', count: leads.filter(l => l.status === 'LEAD').length, color: 'bg-blue-500' },
                      { name: 'Contacted', count: leads.filter(l => l.status === 'CONTACTED').length, color: 'bg-blue-400' },
                      { name: 'Interested', count: leads.filter(l => l.status === 'INTERESTED').length || Math.floor(leads.length * 0.5), color: 'bg-cyan-400' },
                      { name: 'Qualified', count: leads.filter(l => l.status === 'QUALIFIED').length, color: 'bg-teal-400' },
                      { name: 'Enrolled', count: leads.filter(l => l.status === 'ENROLLED').length, color: 'bg-green-500' },
                    ]}
                  />
                </div>

                {/* Pipeline Progress */}
                <div>
                  <PipelineProgress
                    stages={[
                      { name: 'Lead', count: leads.filter(l => l.status === 'LEAD').length, color: 'bg-blue-500' },
                      { name: 'Contacted', count: leads.filter(l => l.status === 'CONTACTED').length, color: 'bg-cyan-500' },
                      { name: 'Qualified', count: leads.filter(l => l.status === 'QUALIFIED').length, color: 'bg-green-500' },
                      { name: 'Enrolled', count: leads.filter(l => l.status === 'ENROLLED').length, color: 'bg-emerald-500' },
                    ]}
                    total={leads.length}
                  />
                </div>
              </div>

              {/* Activity & Priority Response */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity Timeline - Takes 2 columns */}
                <div className="lg:col-span-2">
                  <ActivityTimeline
                    activities={[
                      {
                        id: 1,
                        type: 'call',
                        title: 'Call with prospect',
                        description: 'Discussed course curriculum',
                        timestamp: '2 hours ago',
                        leadName: 'John Doe',
                      },
                      {
                        id: 2,
                        type: 'whatsapp',
                        title: 'WhatsApp message',
                        description: 'Sent prospectus document',
                        timestamp: '4 hours ago',
                        leadName: 'Sarah Smith',
                      },
                      {
                        id: 3,
                        type: 'email',
                        title: 'Email sent',
                        description: 'Follow-up email',
                        timestamp: '6 hours ago',
                        leadName: 'Mike Johnson',
                      },
                      {
                        id: 4,
                        type: 'status',
                        title: 'Lead qualified',
                        description: 'Moved to qualified stage',
                        timestamp: '8 hours ago',
                        leadName: 'Emma Wilson',
                      },
                      {
                        id: 5,
                        type: 'note',
                        title: 'Added note',
                        description: 'Follow up next week',
                        timestamp: '1 day ago',
                        leadName: 'Alex Brown',
                      },
                      {
                        id: 6,
                        type: 'whatsapp',
                        title: 'WhatsApp sent',
                        description: 'Shared admission link',
                        timestamp: '1 day ago',
                        leadName: 'Lisa Garcia',
                      },
                    ]}
                  />
                </div>

                {/* Priority Breakdown */}
                <div className="bg-gradient-to-br from-slate-900/5 to-slate-900/10 border border-slate-200/30 rounded-2xl p-8 backdrop-blur-xl">
                  <h2 className="text-lg font-bold text-slate-900 mb-6">Priority Breakdown</h2>
                  
                  <div className="space-y-5">
                    {[
                      { name: 'HOT', count: leads.filter(l => l.priority === 'HOT').length, color: 'bg-red-100', textColor: 'text-red-700', bar: 'bg-red-500' },
                      { name: 'WARM', count: leads.filter(l => l.priority === 'WARM').length, color: 'bg-amber-100', textColor: 'text-amber-700', bar: 'bg-amber-500' },
                      { name: 'COLD', count: leads.filter(l => l.priority === 'COLD').length, color: 'bg-blue-100', textColor: 'text-blue-700', bar: 'bg-blue-500' },
                    ].map((priority) => (
                      <div key={priority.name}>
                        <div className="flex items-center justify-between mb-2">
                          <div className={`px-3 py-1 rounded-lg ${priority.color} ${priority.textColor} text-sm font-bold`}>
                            {priority.name}
                          </div>
                          <span className="text-lg font-bold text-slate-900">{priority.count}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${priority.bar} transition-all duration-300`}
                            style={{ width: `${(priority.count / leads.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Stats */}
                  <div className="mt-8 pt-6 border-t border-slate-200/20">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Team Performance</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Avg Response</span>
                        <span className="font-semibold text-slate-900">2.5h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Closed This Week</span>
                        <span className="font-semibold text-slate-900">8</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Lead Modal */}
      <AddLeadModal
        open={isAddLeadModalOpen}
        onOpenChange={setIsAddLeadModalOpen}
        onSubmit={handleAddLead}
        isLoading={isSaving}
      />

      {/* Lead Detail Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onUpdatePriority={handleUpdatePriority}
        onUpdateStatus={handleUpdateStatus}
        onCall={handleCall}
        onWhatsApp={handleWhatsApp}
        onEmail={handleEmail}
        isLoading={isSaving}
      />
    </div>
  );
}
