'use client';

import { ArrowRight } from 'lucide-react';

interface FunnelStage {
  name: string;
  count: number;
  color: string;
}

interface LeadFunnelProps {
  stages: FunnelStage[];
}

export function LeadFunnel({ stages }: LeadFunnelProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="bg-white border border-blue-100 rounded-2xl p-8">
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900">Lead Conversion Funnel</h2>
        <p className="text-sm text-slate-500 mt-1">Track your leads through each stage</p>
      </div>

      <div className="space-y-6">
        {stages.map((stage, index) => {
          const width = (stage.count / maxCount) * 100;
          const previousCount = stages[index - 1]?.count ?? 0;
          const conversionRate = index > 0 ? (previousCount > 0 ? ((stage.count / previousCount) * 100).toFixed(1) : "0.0") : "100.0";

          return (
            <div key={stage.name} className="group cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider min-w-[80px]">
                    {stage.name}
                  </span>
                  <span className="text-sm font-bold text-slate-900">{stage.count}</span>
                  {index > 0 && (
                    <span className="text-xs text-slate-500 ml-2">({conversionRate}%)</span>
                  )}
                </div>
                <ArrowRight size={16} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Funnel bar */}
              <div className="w-full h-12 bg-blue-50 rounded-lg overflow-hidden border border-blue-100">
                <div
                  className={`h-full ${stage.color} group-hover:shadow-lg transition-all duration-300 flex items-center px-3`}
                  style={{ width: `${width}%` }}
                >
                  <span className="text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {((width / 100) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div className="mt-8 pt-6 border-t border-blue-100 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Leads</p>
          <p className="text-2xl font-bold text-slate-900">{stages.reduce((a, b) => a + b.count, 0)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Conversion Rate</p>
          <p className="text-2xl font-bold text-green-600">
            {stages.length > 1
              ? (
                  (stages[0].count > 0
                    ? ((stages[stages.length - 1].count / stages[0].count) * 100).toFixed(1)
                    : "0.0") + '%'
                )
              : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}
