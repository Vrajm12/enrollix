'use client';

import { useState, useEffect } from 'react';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Download, Calendar, Loader2, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';

interface ReportData {
  id: number;
  name: string;
  description: string;
  icon: typeof BarChart3;
  metrics: { label: string; value: string | number }[];
}

export default function AnalyticsPage() {
  const [activeReport, setActiveReport] = useState<'funnel' | 'revenue' | 'team' | 'sources' | 'priority'>('funnel');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [funnelData2, setFunnelData2] = useState<any[]>([]);
  const [revenueData2, setRevenueData2] = useState<any>(null);
  const [teamData2, setTeamData2] = useState<any[]>([]);
  const [sourceData2, setSourceData2] = useState<any[]>([]);
  const [priorityData2, setPriorityData2] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [activeReport, dateRange]);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { startDate: dateRange.start + 'T00:00:00.000Z', endDate: dateRange.end + 'T23:59:59.999Z' };

      switch (activeReport) {
        case 'funnel':
          const funnelResp: any = await api.getFunnelReport(params.startDate, params.endDate);
          setFunnelData2(funnelResp.data || []);
          break;
        case 'revenue':
          const revenueResp: any = await api.getRevenueReport(params.startDate, params.endDate);
          setRevenueData2(revenueResp.data || null);
          break;
        case 'team':
          const teamResp: any = await api.getTeamPerformanceReport(params.startDate, params.endDate);
          setTeamData2(teamResp.data || []);
          break;
        case 'sources':
          const sourcesResp: any = await api.getLeadSourcesReport(params.startDate, params.endDate);
          setSourceData2(sourcesResp.data || []);
          break;
        case 'priority':
          const priorityResp: any = await api.getPriorityDistributionReport(params.startDate, params.endDate);
          setPriorityData2(priorityResp.data || []);
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const data = activeReport === 'funnel' ? funnelData2 :
                   activeReport === 'revenue' ? revenueData2 :
                   activeReport === 'team' ? teamData2 :
                   activeReport === 'sources' ? sourceData2 :
                   priorityData2;

      await api.saveReport(activeReport.toUpperCase(), data, dateRange);
      alert('Report saved successfully!');
    } catch (err) {
      alert('Failed to save report: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Funnel Report Data
  const funnelData = [
    { stage: 'Leads Created', count: 450, value: 0 },
    { stage: 'Contacted', count: 320, value: 0 },
    { stage: 'Qualified', count: 180, value: 0 },
    { stage: 'Proposal Sent', count: 95, value: 285000 },
    { stage: 'Negotiation', count: 42, value: 126000 },
    { stage: 'Closed', count: 28, value: 84000 },
  ];

  // Revenue Report Data
  const revenueData = [
    { period: 'Week 1', revenue: 15000, target: 20000 },
    { period: 'Week 2', revenue: 22000, target: 20000 },
    { period: 'Week 3', revenue: 18500, target: 20000 },
    { period: 'Week 4', revenue: 26000, target: 20000 },
    { period: 'Week 5', revenue: 24000, target: 20000 },
    { period: 'Week 6', revenue: 28000, target: 20000 },
  ];

  // Team Performance
  const teamData = [
    { name: 'Sarah Johnson', leads: 85, closed: 12, conversion: 14.1, revenue: 36000 },
    { name: 'John Smith', leads: 72, closed: 10, conversion: 13.9, revenue: 30000 },
    { name: 'Mike Davis', leads: 68, closed: 9, conversion: 13.2, revenue: 27000 },
    { name: 'Emily Chen', leads: 55, closed: 8, conversion: 14.5, revenue: 24000 },
    { name: 'Alex Rodriguez', leads: 48, closed: 5, conversion: 10.4, revenue: 15000 },
  ];

  // Timeline Data (Activity)
  const timelineEvents = [
    { date: '2026-03-28', event: 'Record high: 28 deals closed in single day', type: 'milestone' },
    { date: '2026-03-25', event: 'Sarah Johnson hit $50k monthly target', type: 'achievement' },
    { date: '2026-03-20', event: 'Conversion rate improved by 2.3%', type: 'improvement' },
    { date: '2026-03-15', event: 'New campaign generated 120 leads', type: 'campaign' },
    { date: '2026-03-10', event: 'Team collaboration improved, lead cycle reduced by 5 days', type: 'improvement' },
  ];

  const reports = [
    {
      id: 'funnel',
      name: 'Conversion Funnel',
      description: 'See how leads move through your sales pipeline',
      icon: PieChartIcon,
    },
    {
      id: 'revenue',
      name: 'Revenue Trends',
      description: 'Track revenue vs targets over time',
      icon: LineChartIcon,
    },
    {
      id: 'team',
      name: 'Team Performance',
      description: 'Compare team member metrics and KPIs',
      icon: BarChart3,
    },
    {
      id: 'sources',
      name: 'Lead Sources',
      description: 'Analyze which channels bring the best leads',
      icon: TrendingUp,
    },
    {
      id: 'priority',
      name: 'Priority Distribution',
      description: 'See breakdown of hot, warm, and cold leads',
      icon: Calendar,
    },
  ];

  return (
    <div className="flex bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen">
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto pt-20 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-slate-900">Analytics & Reports</h1>
              <p className="text-slate-600 mt-2">In-depth insights into your sales performance</p>
            </div>

            {/* Date Range Selector */}
            <div className="bg-white border border-slate-200/50 rounded-2xl p-4 mb-8 flex gap-4 items-end flex-wrap">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-4 py-2 border border-slate-200/50 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="px-4 py-2 border border-slate-200/50 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Apply Filter
              </button>
              <button
                onClick={handleExportReport}
                className="px-6 py-2 border border-slate-200/50 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors ml-auto flex items-center gap-2"
              >
                <Download size={18} />
                Export Report
              </button>
            </div>

            {/* Report Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {reports.map((report: any) => {
                const Icon = report.icon;
                return (
                  <button
                    key={report.id}
                    onClick={() => setActiveReport(report.id as typeof activeReport)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      activeReport === report.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200/50 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className={`w-10 h-10 ${activeReport === report.id ? 'bg-blue-200' : 'bg-slate-100'} rounded-lg flex items-center justify-center mb-2`}>
                      <Icon size={20} className={activeReport === report.id ? 'text-blue-600' : 'text-slate-600'} />
                    </div>
                    <p className="font-bold text-slate-900 text-sm">{report.name}</p>
                    <p className="text-xs text-slate-600 mt-1">{report.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 text-red-700">
                {error}
              </div>
            )}

            {/* Conversion Funnel Report */}
            {!loading && !error && activeReport === 'funnel' && funnelData2.length > 0 && (
              <div className="space-y-8">
                <div className="bg-white border border-slate-200/50 rounded-2xl p-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-8">Lead Conversion Funnel</h2>

                  <div className="space-y-6">
                    {funnelData2.map((stage: any, idx: number) => {
                      const maxWidth = 100;
                      const width = stage.rate || 0;

                      return (
                        <div key={stage.stage}>
                          <div className="flex justify-between items-end mb-2">
                            <div>
                              <p className="font-bold text-slate-900">{stage.stage}</p>
                              <p className="text-sm text-slate-600">{stage.count} leads</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-600">{width.toFixed(1)}% of total</p>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-12 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full flex items-center justify-end pr-4"
                              style={{ width: `${width}%` }}
                            >
                              {width > 10 && <span className="text-white text-sm font-bold">{width.toFixed(0)}%</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 pt-8 border-t border-slate-200/50">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-sm text-slate-600 mb-1">Total Leads</p>
                      <p className="text-3xl font-bold text-blue-600">{funnelData2[0]?.count || 0}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-sm text-slate-600 mb-1">Final Stage</p>
                      <p className="text-3xl font-bold text-green-600">{funnelData2[funnelData2.length - 1]?.count || 0}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-sm text-slate-600 mb-1">Conversion Rate</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {funnelData2[0] && funnelData2[funnelData2.length - 1]
                          ? ((funnelData2[funnelData2.length - 1].count / funnelData2[0].count) * 100).toFixed(1)
                          : '0'}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Revenue Report */}
            {!loading && !error && activeReport === 'revenue' && revenueData2 && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white rounded-lg p-6 border border-slate-200">
                    <p className="text-slate-600 text-sm mb-2">Total Leads</p>
                    <p className="text-3xl font-bold text-slate-900">{revenueData2.totalLeads}</p>
                  </div>
                  <div className="bg-white rounded-lg p-6 border border-slate-200">
                    <p className="text-slate-600 text-sm mb-2">Enrolled</p>
                    <p className="text-3xl font-bold text-green-600">{revenueData2.enrolled.count}</p>
                    <p className="text-sm text-slate-600 mt-1">₹{(revenueData2.enrolled.estimatedRevenue / 100000).toFixed(1)}L</p>
                  </div>
                  <div className="bg-white rounded-lg p-6 border border-slate-200">
                    <p className="text-slate-600 text-sm mb-2">Qualified</p>
                    <p className="text-3xl font-bold text-blue-600">{revenueData2.qualified.count}</p>
                    <p className="text-sm text-slate-600 mt-1">₹{(revenueData2.qualified.estimatedValue / 100000).toFixed(1)}L</p>
                  </div>
                  <div className="bg-white rounded-lg p-6 border border-slate-200">
                    <p className="text-slate-600 text-sm mb-2">Total Opportunity</p>
                    <p className="text-3xl font-bold text-purple-600">₹{(revenueData2.totalOpportunity / 100000).toFixed(1)}L</p>
                  </div>
                </div>
              </div>
            )}

            {/* Team Performance Report */}
            {!loading && !error && activeReport === 'team' && teamData2.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/50 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Team Member</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Leads</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Enrolled</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Hot Leads</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Conversion</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Engagement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {teamData2.map((member: any) => (
                      <tr key={member.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-900 font-medium">{member.name}</td>
                        <td className="px-6 py-4 text-slate-600">{member.leadsManaged}</td>
                        <td className="px-6 py-4 text-green-600 font-semibold">{member.enrolled}</td>
                        <td className="px-6 py-4 text-orange-600 font-semibold">{member.hotLeads}</td>
                        <td className="px-6 py-4 text-blue-600">{member.conversionRate.toFixed(1)}%</td>
                        <td className="px-6 py-4 text-slate-600">{member.engagementScore} msgs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Lead Sources Report */}
            {!loading && !error && activeReport === 'sources' && sourceData2.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {sourceData2.map((source: any, idx: number) => (
                  <div key={idx} className="bg-white rounded-lg p-6 border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">{source.source}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Leads:</span>
                        <span className="font-semibold text-slate-900">{source.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Enrolled:</span>
                        <span className="font-semibold text-green-600">{source.enrolled}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Qualified:</span>
                        <span className="font-semibold text-blue-600">{source.qualified}</span>
                      </div>
                      <div className="flex justify-between pt-3 border-t border-slate-200">
                        <span className="text-slate-600">ROI:</span>
                        <span className="font-bold text-purple-600">{source.roi.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Priority Distribution Report */}
            {!loading && !error && activeReport === 'priority' && priorityData2.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {priorityData2.map((priority: any) => (
                  <div key={priority.priority} className="bg-white rounded-lg p-6 border border-slate-200">
                    <h3 className="text-lg font-bold mb-4">
                      <span className={`inline-block w-4 h-4 rounded-full mr-2 ${
                        priority.priority === 'HOT' ? 'bg-red-500' :
                        priority.priority === 'WARM' ? 'bg-orange-500' :
                        'bg-blue-500'
                      }`} />
                      {priority.priority} Leads
                    </h3>
                    <p className="text-3xl font-bold text-slate-900 mb-2">{priority.count}</p>
                    <p className="text-sm text-slate-600">Enrolled: <span className="font-semibold text-slate-900">{priority.enrolled}</span></p>
                  </div>
                ))}
              </div>
            )}

            {/* Events Timeline - Disabled */}
            {/* Disabled Timeline Report - Not used in current report types */}
          </div>
        </div>
      </main>
    </div>
  );
}
