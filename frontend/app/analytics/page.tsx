'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Calendar, Download, Loader2, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { getUser } from '@/lib/auth';

type ReportKey = 'funnel' | 'revenue' | 'team' | 'sources' | 'priority';

type FunnelRow = { stage: string; count: number; rate: number };
type RevenueData = {
  totalLeads: number;
  enrolled: { count: number; estimatedRevenue: number };
  qualified: { count: number; estimatedValue: number };
  interested: { count: number; estimatedValue: number };
  totalOpportunity: number;
  conversionToEnrolled: number;
  conversionToQualified: number;
};
type TeamRow = {
  id: number;
  name: string;
  email: string;
  leadsManaged: number;
  enrolled: number;
  qualified: number;
  hotLeads: number;
  conversionRate: number;
  engagementScore: number;
  messages: { whatsapp: number; sms: number };
};
type SourceRow = {
  source: string;
  total: number;
  enrolled: number;
  qualified: number;
  interested: number;
  hot: number;
  warm: number;
  cold: number;
  roi: number;
};
type PriorityRow = { priority: 'COLD' | 'WARM' | 'HOT'; count: number; enrolled: number };

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

const formatPct = (value: number) => `${value.toFixed(1)}%`;

export default function AnalyticsPage() {
  const [activeReport, setActiveReport] = useState<ReportKey>('funnel');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  const [funnelData, setFunnelData] = useState<FunnelRow[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [teamData, setTeamData] = useState<TeamRow[]>([]);
  const [sourceData, setSourceData] = useState<SourceRow[]>([]);
  const [priorityData, setPriorityData] = useState<PriorityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadReports();
  }, [activeReport, dateRange, stateFilter, cityFilter]);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = `${dateRange.start}T00:00:00.000Z`;
      const endDate = `${dateRange.end}T23:59:59.999Z`;

      if (activeReport === 'funnel') {
        const resp = await api.getFunnelReport(startDate, endDate, stateFilter || undefined, cityFilter || undefined) as { data?: FunnelRow[] };
        setFunnelData(resp.data || []);
      }
      if (activeReport === 'revenue') {
        const resp = await api.getRevenueReport(startDate, endDate, stateFilter || undefined, cityFilter || undefined) as { data?: RevenueData };
        setRevenueData(resp.data || null);
      }
      if (activeReport === 'team') {
        const resp = await api.getTeamPerformanceReport(startDate, endDate, stateFilter || undefined, cityFilter || undefined) as { data?: TeamRow[] };
        setTeamData(resp.data || []);
      }
      if (activeReport === 'sources') {
        const resp = await api.getLeadSourcesReport(startDate, endDate, stateFilter || undefined, cityFilter || undefined) as { data?: SourceRow[] };
        setSourceData(resp.data || []);
      }
      if (activeReport === 'priority') {
        const resp = await api.getPriorityDistributionReport(startDate, endDate, stateFilter || undefined, cityFilter || undefined) as { data?: PriorityRow[] };
        setPriorityData(resp.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    const data =
      activeReport === 'funnel'
        ? funnelData
        : activeReport === 'revenue'
          ? revenueData
          : activeReport === 'team'
            ? teamData
            : activeReport === 'sources'
            ? sourceData
              : priorityData;

    try {
      const xlsx = await import('xlsx/xlsx.mjs');
      const user = getUser();
      const reportNames: Record<ReportKey, string> = {
        funnel: 'Conversion Funnel Report',
        revenue: 'Revenue Report',
        team: 'Team Performance Report',
        sources: 'Lead Sources Report',
        priority: 'Priority Distribution Report',
      };
      const reportName = reportNames[activeReport];
      const generatedAt = new Date();
      const tenantName = user?.tenantName ?? `Tenant #${user?.tenantId ?? 'N/A'}`;

      const rows: Array<Array<string | number>> = [
        ['Guruverse CRM'],
        [reportName],
        [],
        ['Tenant Name', tenantName],
        ['Tenant ID', user?.tenantId ?? 'N/A'],
        ['Generated By', user?.name ?? 'Unknown User'],
        ['User Email', user?.email ?? 'N/A'],
        ['Date Range', `${dateRange.start} to ${dateRange.end}`],
        ['State Filter', stateFilter || 'All'],
        ['City Filter', cityFilter || 'All'],
        ['Generated At', generatedAt.toLocaleString('en-IN')],
        [],
      ];

      if (activeReport === 'funnel') {
        rows.push(['Stage', 'Count', 'Rate (%)']);
        (data as FunnelRow[]).forEach((row) => rows.push([row.stage, row.count, row.rate]));
      } else if (activeReport === 'revenue') {
        const revenue = data as RevenueData | null;
        rows.push(['Metric', 'Value']);
        if (revenue) {
          rows.push(['Total Leads', revenue.totalLeads]);
          rows.push(['Enrolled Count', revenue.enrolled.count]);
          rows.push(['Enrolled Revenue', revenue.enrolled.estimatedRevenue]);
          rows.push(['Qualified Count', revenue.qualified.count]);
          rows.push(['Qualified Value', revenue.qualified.estimatedValue]);
          rows.push(['Interested Count', revenue.interested.count]);
          rows.push(['Interested Value', revenue.interested.estimatedValue]);
          rows.push(['Total Opportunity', revenue.totalOpportunity]);
          rows.push(['Conversion to Enrolled (%)', revenue.conversionToEnrolled]);
          rows.push(['Conversion to Qualified (%)', revenue.conversionToQualified]);
        }
      } else if (activeReport === 'team') {
        rows.push([
          'Counselor Name',
          'Email',
          'Leads Managed',
          'Enrolled',
          'Qualified',
          'Hot Leads',
          'Conversion Rate (%)',
          'Engagement Score',
          'WhatsApp Messages',
          'SMS Messages',
        ]);
        (data as TeamRow[]).forEach((row) =>
          rows.push([
            row.name,
            row.email,
            row.leadsManaged,
            row.enrolled,
            row.qualified,
            row.hotLeads,
            row.conversionRate,
            row.engagementScore,
            row.messages?.whatsapp ?? 0,
            row.messages?.sms ?? 0,
          ])
        );
      } else if (activeReport === 'sources') {
        rows.push(['Source', 'Total', 'Enrolled', 'Qualified', 'Interested', 'Hot', 'Warm', 'Cold', 'ROI (%)']);
        (data as SourceRow[]).forEach((row) =>
          rows.push([row.source, row.total, row.enrolled, row.qualified, row.interested, row.hot, row.warm, row.cold, row.roi])
        );
      } else {
        rows.push(['Priority', 'Leads Count', 'Enrolled']);
        (data as PriorityRow[]).forEach((row) => rows.push([row.priority, row.count, row.enrolled]));
      }

      const worksheet = xlsx.utils.aoa_to_sheet(rows);
      worksheet['!cols'] = [{ wch: 28 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
      ];

      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Report');
      const safeReportName = reportName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const filename = `guruverse-${safeReportName}-${generatedAt.toISOString().slice(0, 10)}.xlsx`;
      xlsx.writeFile(workbook, filename);

      await api.saveReport(activeReport.toUpperCase(), data, {
        ...dateRange,
        state: stateFilter || null,
        city: cityFilter || null
      }).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const tabs: Array<{ id: ReportKey; name: string; desc: string; icon: any }> = [
    { id: 'funnel', name: 'Conversion Funnel', desc: 'Pipeline movement', icon: PieChartIcon },
    { id: 'revenue', name: 'Revenue', desc: 'Revenue opportunities', icon: TrendingUp },
    { id: 'team', name: 'Team', desc: 'Counselor performance', icon: BarChart3 },
    { id: 'sources', name: 'Sources', desc: 'Lead source quality', icon: TrendingUp },
    { id: 'priority', name: 'Priority', desc: 'Hot/warm/cold split', icon: Calendar },
  ];

  return (
    <div className="flex bg-[#f3f8ff] min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-60 py-8 md:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">Analytics & Reports</h1>
            <p className="mt-2 text-slate-600">Blue-white reporting workspace with live backend data.</p>
          </div>

          <div className="mb-8 flex flex-wrap items-end gap-4 rounded-2xl border border-blue-100 bg-white p-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">Start Date</label>
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="rounded-lg border border-blue-200 px-4 py-2" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">End Date</label>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="rounded-lg border border-blue-200 px-4 py-2" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">State</label>
              <input type="text" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} placeholder="e.g. Maharashtra" className="rounded-lg border border-blue-200 px-4 py-2" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">City</label>
              <input type="text" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} placeholder="e.g. Pune" className="rounded-lg border border-blue-200 px-4 py-2" />
            </div>
            <button onClick={handleExport} disabled={exporting} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-blue-200 px-6 py-2 font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60">
              <Download size={18} /> {exporting ? 'Preparing Excel...' : 'Export Report'}
            </button>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeReport === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveReport(tab.id)} className={`rounded-2xl border-2 p-4 text-left ${active ? 'border-blue-600 bg-blue-50' : 'border-blue-100 bg-white hover:border-blue-300'}`}>
                  <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg ${active ? 'bg-blue-200' : 'bg-blue-50'}`}>
                    <Icon size={20} className={active ? 'text-blue-700' : 'text-blue-500'} />
                  </div>
                  <p className="text-sm font-bold text-slate-900">{tab.name}</p>
                  <p className="mt-1 text-xs text-slate-600">{tab.desc}</p>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
          ) : (
            <div className="rounded-2xl border border-blue-100 bg-white p-6">
              {activeReport === 'funnel' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-600">Total stages</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{funnelData.length}</p>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-600">Top stage count</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{funnelData[0]?.count ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-600">Final conversion</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{formatPct(funnelData[funnelData.length - 1]?.rate ?? 0)}</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-blue-100 text-left text-slate-500">
                          <th className="py-2 pr-3">Stage</th>
                          <th className="py-2 pr-3">Count</th>
                          <th className="py-2">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {funnelData.map((row) => (
                          <tr key={row.stage} className="border-b border-blue-50">
                            <td className="py-2 pr-3 font-medium text-slate-900">{row.stage}</td>
                            <td className="py-2 pr-3 text-slate-700">{row.count}</td>
                            <td className="py-2 text-slate-700">{formatPct(row.rate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeReport === 'revenue' && revenueData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-600">Total leads</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{revenueData.totalLeads}</p>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-600">Opportunity</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(revenueData.totalOpportunity)}</p>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-600">Enrolled conversion</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{formatPct(revenueData.conversionToEnrolled)}</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-blue-100 text-left text-slate-500">
                          <th className="py-2 pr-3">Bucket</th>
                          <th className="py-2 pr-3">Count</th>
                          <th className="py-2">Estimated Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-blue-50"><td className="py-2 pr-3 font-medium">Enrolled</td><td>{revenueData.enrolled.count}</td><td>{formatCurrency(revenueData.enrolled.estimatedRevenue)}</td></tr>
                        <tr className="border-b border-blue-50"><td className="py-2 pr-3 font-medium">Qualified</td><td>{revenueData.qualified.count}</td><td>{formatCurrency(revenueData.qualified.estimatedValue)}</td></tr>
                        <tr><td className="py-2 pr-3 font-medium">Interested</td><td>{revenueData.interested.count}</td><td>{formatCurrency(revenueData.interested.estimatedValue)}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeReport === 'team' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-blue-100 text-left text-slate-500">
                        <th className="py-2 pr-3">Counselor</th><th className="py-2 pr-3">Leads</th><th className="py-2 pr-3">Enrolled</th><th className="py-2 pr-3">Qualified</th><th className="py-2 pr-3">Conversion</th><th className="py-2">Engagement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamData.map((row) => (
                        <tr key={row.id} className="border-b border-blue-50">
                          <td className="py-2 pr-3"><p className="font-medium text-slate-900">{row.name}</p><p className="text-xs text-slate-500">{row.email}</p></td>
                          <td className="py-2 pr-3">{row.leadsManaged}</td>
                          <td className="py-2 pr-3">{row.enrolled}</td>
                          <td className="py-2 pr-3">{row.qualified}</td>
                          <td className="py-2 pr-3">{formatPct(row.conversionRate)}</td>
                          <td className="py-2">{row.engagementScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeReport === 'sources' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-blue-100 text-left text-slate-500">
                        <th className="py-2 pr-3">Source</th><th className="py-2 pr-3">Total</th><th className="py-2 pr-3">Enrolled</th><th className="py-2 pr-3">Qualified</th><th className="py-2">ROI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceData.map((row) => (
                        <tr key={row.source} className="border-b border-blue-50">
                          <td className="py-2 pr-3 font-medium text-slate-900">{row.source}</td>
                          <td className="py-2 pr-3">{row.total}</td>
                          <td className="py-2 pr-3">{row.enrolled}</td>
                          <td className="py-2 pr-3">{row.qualified}</td>
                          <td className="py-2">{formatPct(row.roi)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeReport === 'priority' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-blue-100 text-left text-slate-500">
                        <th className="py-2 pr-3">Priority</th><th className="py-2 pr-3">Leads</th><th className="py-2">Enrolled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priorityData.map((row) => (
                        <tr key={row.priority} className="border-b border-blue-50">
                          <td className="py-2 pr-3 font-medium text-slate-900">{row.priority}</td>
                          <td className="py-2 pr-3">{row.count}</td>
                          <td className="py-2">{row.enrolled}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
